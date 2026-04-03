import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  analyzeProject,
  createConfigFromAnalysis
} from "../src/lib/project-analysis.mjs";
import { installAssistantAdapters } from "../src/lib/assistant.mjs";
import { writeProjectConfig } from "../src/lib/project-config.mjs";
import { runShip } from "../src/lib/ship.mjs";

const CLI_PATH = fileURLToPath(new URL("../bin/temper.mjs", import.meta.url));

test("analyzeProject infers a MUD-style repo shape", async (t) => {
  const repoDir = createFixtureRepo(t);
  const analysis = analyzeProject({ cwd: repoDir });
  const config = createConfigFromAnalysis(analysis);

  assert.equal(analysis.package_manager, "pnpm");
  assert.equal(analysis.family.id, "data-driven-progression-rpg");
  assert.equal(analysis.stack.id, "browser-typescript-monorepo");
  assert.ok(analysis.stack.overlays.includes("mud-onchain"));
  assert.ok(analysis.surfaces.source_of_truth.includes("packages/contracts/mud.config.ts"));
  assert.ok(analysis.surfaces.source_of_truth.includes("packages/contracts/zones/start/items.json"));
  assert.equal(analysis.surfaces.source_of_truth.some((file) => file.includes("/locales/")), false);
  assert.equal(analysis.environments.find((item) => item.id === "beta")?.branch, "dev");
  assert.equal(analysis.environments.find((item) => item.id === "prod")?.branch, "main");
  assert.ok(config.paths.source_of_truth.includes("packages/contracts/mud.config.ts"));
  assert.ok(config.paths.source_of_truth.includes("packages/contracts/zones/start/items.json"));
  assert.equal(config.paths.source_of_truth.some((file) => file.includes("/locales/")), false);
  assert.ok(analysis.commands.build);
  assert.ok(analysis.commands.typecheck);
  assert.ok(analysis.commands.balance_verify);
});

test("analyzeProject reads shared workflow state when run from a git worktree", async (t) => {
  const { repoDir, worktreeDir } = createWorktreeFixtureRepo(t);
  const analysis = analyzeProject({ cwd: worktreeDir });

  assert.equal(fs.realpathSync(analysis.repo.sharedRoot), fs.realpathSync(repoDir));
  assert.equal(fs.realpathSync(analysis.repo.workflowFiles.session), fs.realpathSync(path.join(repoDir, "SESSION.md")));
  assert.equal(analysis.surfaces.workflow.agents, "../../../AGENTS.md");
  assert.equal(analysis.surfaces.workflow.session, "../../../SESSION.md");
  assert.equal(analysis.surfaces.workflow.claude, "CLAUDE.md");
  assert.ok(analysis.surfaces.workflow.claude_rules.includes("../../rules/deploy.md"));
  assert.equal(analysis.environments.find((item) => item.id === "beta")?.branch, "dev");
  assert.equal(analysis.environments.find((item) => item.id === "prod")?.branch, "main");
});

test("assistant install writes guides and Claude commands", async (t) => {
  const repoDir = createFixtureRepo(t);
  const analysis = analyzeProject({ cwd: repoDir });
  const config = createConfigFromAnalysis(analysis);

  writeProjectConfig(repoDir, config);
  const written = installAssistantAdapters({
    projectRoot: repoDir,
    config,
    analysis,
    assistants: ["claude", "codex"]
  });

  assert.ok(written.includes(".temper/assistants/claude.md"));
  assert.ok(written.includes(".temper/assistants/codex.md"));
  assert.ok(written.includes(".temper/assistants/shared-canon.json"));
  assert.equal(written.some((f) => f.startsWith(".claude/commands/temper-")), false);
  assert.match(
    fs.readFileSync(path.join(repoDir, ".temper/assistants/codex.md"), "utf8"),
    /shared-canon\.json/
  );
  assert.match(
    fs.readFileSync(path.join(repoDir, ".temper/assistants/shared-canon.md"), "utf8"),
    /Temper Shared Canon/
  );
  assert.match(
    fs.readFileSync(path.join(repoDir, "CLAUDE.md"), "utf8"),
    /TEMPER_RUNTIME:BEGIN[\s\S]*shared-canon\.json/
  );
  assert.match(
    fs.readFileSync(path.join(repoDir, "AGENTS.md"), "utf8"),
    /TEMPER_RUNTIME:BEGIN[\s\S]*pnpm exec temper coach --cwd \./
  );
});

test("assistant show falls back to onboarding interview when Temper is installed but not onboarded", async (t) => {
  const repoDir = createFixtureRepo(t);

  const payload = JSON.parse(
    execFileSync("node", [CLI_PATH, "assistant", "show", "--cwd", repoDir, "--json"], {
      encoding: "utf8"
    })
  );

  assert.equal(payload.status, "needs_onboarding");
  assert.equal(payload.next_action, "continue_in_chat");
  assert.equal(payload.user_facing_next_move.id, "existing_project_dry_run_first");
  assert.ok(payload.interview);
  assert.equal(payload.interview.assistant_flow.mode, "continue_in_chat");
  assert.match(payload.interview.assistant_flow.reply_template, /Say `start`/);
  assert.equal(payload.interview.questions, undefined);
  assert.ok(payload.interview.analysis_findings.concerns.some((item) => item.id === "established-project"));
  assert.equal(payload.interview.new_project_command, undefined);
  assert.match(payload.interview.apply_command, /temper onboard existing --write/);
});

test("assistant show delivers stage 1 only — strengths and hard stop", async (t) => {
  const repoDir = createFixtureRepo(t);
  const output = execFileSync("node", [CLI_PATH, "assistant", "show", "--cwd", repoDir], {
    encoding: "utf8"
  });

  assert.match(output, /What's Already In Good Shape/);
  assert.match(output, /STOP\. Deliver everything above/);
  assert.match(output, /temper onboard existing --findings --cwd \./);
  assert.match(output, /machine-readable version/);
  assert.doesNotMatch(output, /## Recommended Next Move/);
  assert.doesNotMatch(output, /What I'd Adjust For/);
});

test("onboard existing --findings delivers stage 2 only — concerns and hard stop", async (t) => {
  const repoDir = createFixtureRepo(t);
  const output = execFileSync("node", [CLI_PATH, "onboard", "existing", "--cwd", repoDir, "--findings"], {
    encoding: "utf8"
  });

  assert.match(output, /What I'd Adjust For/);
  assert.match(output, /STOP\. Deliver everything above/);
  assert.match(output, /temper onboard existing --recommend --cwd \./);
  assert.doesNotMatch(output, /## Recommended Next Move/);
  assert.doesNotMatch(output, /What's Already In Good Shape/);
});

test("onboard existing --recommend delivers stage 3 only — recommendation with hard stop and pre-action briefing", async (t) => {
  const repoDir = createFixtureRepo(t);
  const output = execFileSync("node", [CLI_PATH, "onboard", "existing", "--cwd", repoDir, "--recommend"], {
    encoding: "utf8"
  });

  assert.match(output, /## Recommended Next Move/);
  assert.match(output, /rehearsal first/);
  assert.match(output, /Say `start`/);
  assert.match(output, /STOP\. Deliver the recommendation above/);
  assert.match(output, /Cloning your repo into a clean copy/);
});

test("assistant show returns machine-readable installed surfaces once onboarding is complete", async (t) => {
  const repoDir = createFixtureRepo(t);
  const analysis = analyzeProject({ cwd: repoDir });
  const config = createConfigFromAnalysis(analysis);

  writeProjectConfig(repoDir, config);
  installAssistantAdapters({
    projectRoot: repoDir,
    config,
    analysis,
    assistants: ["claude", "codex"]
  });

  const payload = JSON.parse(
    execFileSync("node", [CLI_PATH, "assistant", "show", "--cwd", repoDir, "--json"], {
      encoding: "utf8"
    })
  );

  assert.equal(payload.status, "onboarded");
  assert.equal(payload.guides.claude, ".temper/assistants/claude.md");
  assert.equal(payload.guides.codex, ".temper/assistants/codex.md");
  assert.equal(payload.commands.claude, ".claude/commands/temper-*.md");
});

test("runShip executes configured steps from generated config", async (t) => {
  const repoDir = createFixtureRepo(t);
  const analysis = analyzeProject({ cwd: repoDir });
  const config = createConfigFromAnalysis(analysis);

  writeProjectConfig(repoDir, config);

  initGitRepo(repoDir, "dev", "fixture");

  const report = await runShip({
    cwd: repoDir,
    mode: "full",
    intent: "player-facing balance and onboarding pass"
  });

  assert.equal(report.environment.id, "beta");
  assert.equal(report.execution.ok, true);
  assert.ok(report.execution.steps.some((step) => step.id === "build" && step.ok));
  assert.ok(report.execution.steps.some((step) => step.id === "typecheck" && step.ok));
  assert.ok(report.execution.steps.some((step) => step.id === "balance_verify" && step.ok));
  assert.ok(report.patch_notes.summary.some((line) => /Primary hat:/.test(line)));
});

test("runShip handles verbose build output without exhausting the child-process buffer", async (t) => {
  const repoDir = createFixtureRepo(t);
  const packageJsonPath = path.join(repoDir, "package.json");
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  packageJson.scripts.build = "node -e \"process.stdout.write(('verbose build line\\n').repeat(250000))\"";
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + "\n");

  const analysis = analyzeProject({ cwd: repoDir });
  const config = createConfigFromAnalysis(analysis);

  writeProjectConfig(repoDir, config);
  initGitRepo(repoDir, "dev", "fixture");

  const report = await runShip({
    cwd: repoDir,
    mode: "lite",
    intent: "verbose build pass"
  });

  const buildStep = report.execution.steps.find((step) => step.id === "build");
  assert.equal(report.execution.ok, true);
  assert.equal(buildStep?.ok, true);
  assert.match(buildStep?.stdout_excerpt || "", /verbose build line/);
});

test("runShip adds a bootstrap hint for failing pnpm commands in fresh worktrees", async (t) => {
  const { worktreeDir } = createWorktreeFixtureRepo(t);

  write(
    worktreeDir,
    "package.json",
    JSON.stringify(
      {
        name: "temper-worktree-fixture",
        private: true,
        packageManager: "pnpm@10.6.0",
        scripts: {
          build: "pnpm --filter client run typecheck"
        }
      },
      null,
      2
    ) + "\n"
  );
  write(
    worktreeDir,
    "packages/client/package.json",
    JSON.stringify(
      {
        name: "client",
        private: true,
        scripts: {
          typecheck: "tsc --noEmit"
        }
      },
      null,
      2
    ) + "\n"
  );

  const analysis = analyzeProject({ cwd: worktreeDir });
  const config = createConfigFromAnalysis(analysis);

  writeProjectConfig(worktreeDir, config);

  const report = await runShip({
    cwd: worktreeDir,
    mode: "lite",
    intent: "worktree bootstrap check"
  });

  const buildStep = report.execution.steps.find((step) => step.id === "build");
  assert.equal(report.execution.ok, false);
  assert.equal(buildStep?.ok, false);
  assert.match(buildStep?.stderr_excerpt || "", /worktree looks unbootstrapped/i);
  assert.match(buildStep?.stderr_excerpt || "", /pnpm install/i);
});

test("temper records write and ship runs, then lists and shows them", async (t) => {
  const repoDir = createFixtureRepo(t);

  initGitRepo(repoDir, "dev", "fixture");

  execFileSync("node", [CLI_PATH, "adopt", "--cwd", repoDir, "--write"], {
    stdio: "ignore"
  });
  execFileSync("git", ["-C", repoDir, "add", "."], { stdio: "ignore" });
  execFileSync("git", ["-C", repoDir, "commit", "-m", "adopted"], { stdio: "ignore" });

  execFileSync("node", [CLI_PATH, "ship", "full", "--cwd", repoDir, "--intent", "player-facing balance pass"], {
    stdio: "ignore"
  });

  const runs = JSON.parse(
    execFileSync("node", [CLI_PATH, "runs", "ls", "--cwd", repoDir, "--json"], {
      encoding: "utf8"
    })
  );

  assert.ok(runs.length >= 2);
  assert.ok(runs.some((item) => item.command === "adopt" && item.action === "write"));
  assert.ok(runs.some((item) => item.command === "ship" && item.action === "full"));

  const latestShip = runs.find((item) => item.command === "ship");
  const shown = JSON.parse(
    execFileSync("node", [CLI_PATH, "runs", "show", latestShip.run_id, "--cwd", repoDir, "--json"], {
      encoding: "utf8"
    })
  );

  assert.equal(shown.command, "ship");
  assert.equal(shown.action, "full");
  assert.equal(shown.payload.type, "temper.ship.report");
});

test("temper inspect summarizes installed surfaces and recent runs", async (t) => {
  const repoDir = createFixtureRepo(t);

  initGitRepo(repoDir, "dev", "fixture");

  execFileSync("node", [CLI_PATH, "adopt", "--cwd", repoDir, "--write"], {
    stdio: "ignore"
  });

  const report = JSON.parse(
    execFileSync("node", [CLI_PATH, "inspect", "--cwd", repoDir, "--json"], {
      encoding: "utf8"
    })
  );

  assert.equal(report.type, "temper.inspect.report");
  assert.equal(report.config.present, true);
  assert.equal(report.assistants.shared_canon_json.present, true);
  assert.equal(report.continuity.workflow_files.continuity_json.present, true);
  assert.ok(report.runs.count >= 1);
  assert.ok(report.runs.latest.some((item) => item.command === "adopt"));
});

test("temper inspect falls back to SESSION.md outside git repos", async (t) => {
  const repoDir = createFixtureRepo(t);

  execFileSync("node", [CLI_PATH, "adopt", "--cwd", repoDir, "--write"], {
    stdio: "ignore"
  });

  const report = JSON.parse(
    execFileSync("node", [CLI_PATH, "inspect", "--cwd", repoDir, "--json"], {
      encoding: "utf8"
    })
  );

  assert.equal(report.continuity.session_file.present, true);
  assert.equal(report.continuity.session_file.path, "SESSION.md");
});

test("temper session set updates the managed board and records a run artifact", async (t) => {
  const repoDir = createFixtureRepo(t);

  initGitRepo(repoDir, "feature/session-pass", "fixture");

  const preview = execFileSync(
    "node",
    [CLI_PATH, "session", "set", "--cwd", repoDir, "--status", "active", "--next", "Run manual smoke.", "--handoff", "HANDOFF_session-pass.md"],
    { encoding: "utf8" }
  );

  assert.match(preview, /## Session Preview/);
  assert.equal(fs.existsSync(path.join(repoDir, ".temper/workflow/session.json")), false);

  execFileSync(
    "node",
    [
      CLI_PATH,
      "session",
      "set",
      "--cwd",
      repoDir,
      "--status",
      "active",
      "--next",
      "Run manual smoke.",
      "--handoff",
      "HANDOFF_session-pass.md",
      "--write"
    ],
    { stdio: "ignore" }
  );

  const sessionState = JSON.parse(fs.readFileSync(path.join(repoDir, ".temper/workflow/session.json"), "utf8"));
  const sessionDoc = fs.readFileSync(path.join(repoDir, "SESSION.md"), "utf8");
  const runs = JSON.parse(
    execFileSync("node", [CLI_PATH, "runs", "ls", "--cwd", repoDir, "--json"], {
      encoding: "utf8"
    })
  );

  assert.equal(sessionState.entries[0].workstream, "session-pass");
  assert.equal(sessionState.entries[0].next, "Run manual smoke.");
  assert.equal(sessionState.entries[0].handoff, "HANDOFF_session-pass.md");
  assert.match(sessionDoc, /HANDOFF_session-pass\.md/);
  assert.ok(runs.some((item) => item.command === "session" && item.action === "write"));
});

test("temper eval restart passes when session and handoff are both present and structured", async (t) => {
  const repoDir = createFixtureRepo(t);

  initGitRepo(repoDir, "feature/restart-pass", "fixture");

  execFileSync(
    "node",
    [
      CLI_PATH,
      "session",
      "set",
      "--cwd",
      repoDir,
      "--status",
      "active",
      "--next",
      "Run beta smoke.",
      "--handoff",
      "HANDOFF_restart-pass.md",
      "--write"
    ],
    { stdio: "ignore" }
  );
  execFileSync(
    "node",
    [
      CLI_PATH,
      "handoff",
      "--cwd",
      repoDir,
      "--slug",
      "restart-pass",
      "--summary",
      "Wrapped restart hardening.",
      "--next",
      "Run beta smoke.",
      "--write"
    ],
    { stdio: "ignore" }
  );

  const report = JSON.parse(
    execFileSync("node", [CLI_PATH, "eval", "restart", "--cwd", repoDir, "--json"], {
      encoding: "utf8"
    })
  );

  assert.equal(report.type, "temper.eval.restart.report");
  assert.equal(report.verdict, "pass");
  assert.ok(report.score >= 85);
  assert.equal(report.target_handoff.path, "HANDOFF_restart-pass.md");
});

test("temper eval restart fails when continuity artifacts are missing", async (t) => {
  const repoDir = createFixtureRepo(t);

  initGitRepo(repoDir, "feature/restart-fail", "fixture");

  const report = JSON.parse(
    execFileSync("node", [CLI_PATH, "eval", "restart", "--cwd", repoDir, "--json"], {
      encoding: "utf8"
    })
  );

  assert.equal(report.verdict, "fail");
  assert.ok(report.findings.some((item) => item.code === "missing_session_state"));
  assert.ok(report.findings.some((item) => item.code === "missing_handoff"));
});

function createFixtureRepo(t) {
  const repoDir = fs.mkdtempSync(path.join(os.tmpdir(), "temper-adopt-"));
  t.after(() => fs.rmSync(repoDir, { recursive: true, force: true }));

  write(repoDir, "package.json", JSON.stringify(rootPackageJson(), null, 2) + "\n");
  write(repoDir, "pnpm-workspace.yaml", "packages:\n  - 'packages/*'\n");
  write(repoDir, "tsconfig.json", "{\n  \"compilerOptions\": {\"target\": \"ES2022\"}\n}\n");
  write(repoDir, "AGENTS.md", "# Agents\n");
  write(repoDir, "CLAUDE.md", "# Claude\n");
  write(repoDir, "SESSION.md", "# Session\n");
  write(
    repoDir,
    ".claude/rules/deploy.md",
    "| Branch | Target | Confirm? |\n|---|---|---|\n| `dev` | Beta | No |\n| `main` | Production | Yes |\n"
  );
  write(repoDir, "packages/contracts/mud.config.ts", "export default {};\n");
  write(repoDir, "packages/contracts/package.json", JSON.stringify(contractsPackageJson(), null, 2) + "\n");
  write(repoDir, "packages/client/package.json", JSON.stringify(clientPackageJson(), null, 2) + "\n");
  write(repoDir, "packages/contracts/zones/start/items.json", "{\n  \"sword\": 1\n}\n");
  write(repoDir, "packages/contracts/zones/start/effects.json", "{\n  \"burn\": 1\n}\n");
  write(repoDir, "packages/contracts/zones/start/monsters.json", "{\n  \"slime\": 1\n}\n");
  for (const locale of ["en", "ja", "ko", "zh", "fr"]) {
    for (const fileName of ["classes", "effects", "items", "monsters"]) {
      write(repoDir, `packages/client/src/i18n/locales/${locale}/${fileName}.json`, "{\n  \"fixture\": true\n}\n");
    }
  }
  write(repoDir, "packages/client/src/ui/onboarding.tsx", "export const onboarding = true;\n");
  return repoDir;
}

function createWorktreeFixtureRepo(t) {
  const repoDir = fs.mkdtempSync(path.join(os.tmpdir(), "temper-worktree-"));
  const worktreeDir = path.join(repoDir, ".claude", "worktrees", "feature");
  t.after(() => fs.rmSync(repoDir, { recursive: true, force: true }));

  write(repoDir, "package.json", JSON.stringify(rootPackageJson(), null, 2) + "\n");
  write(repoDir, "pnpm-workspace.yaml", "packages:\n  - 'packages/*'\n");
  write(repoDir, "tsconfig.json", "{\n  \"compilerOptions\": {\"target\": \"ES2022\"}\n}\n");
  write(repoDir, "CLAUDE.md", "# Claude\n");
  write(repoDir, "packages/contracts/mud.config.ts", "export default {};\n");
  write(repoDir, "packages/contracts/package.json", JSON.stringify(contractsPackageJson(), null, 2) + "\n");
  write(repoDir, "packages/contracts/zones/start/items.json", "{\n  \"sword\": 1\n}\n");

  execFileSync("git", ["init", "-b", "main", repoDir], { stdio: "ignore" });
  execFileSync("git", ["-C", repoDir, "config", "user.email", "temper@example.com"], { stdio: "ignore" });
  execFileSync("git", ["-C", repoDir, "config", "user.name", "Temper Test"], { stdio: "ignore" });
  execFileSync("git", ["-C", repoDir, "add", "."], { stdio: "ignore" });
  execFileSync("git", ["-C", repoDir, "commit", "-m", "fixture"], { stdio: "ignore" });
  execFileSync("git", ["-C", repoDir, "worktree", "add", "-b", "feature", worktreeDir], { stdio: "ignore" });

  write(repoDir, "AGENTS.md", "# Agents\n");
  write(repoDir, "SESSION.md", "# Session\n");
  write(
    repoDir,
    ".claude/rules/deploy.md",
    "| Branch | Target | Confirm? |\n|---|---|---|\n| `dev` | Beta | No |\n| `main` | Production | Yes |\n"
  );

  return {
    repoDir,
    worktreeDir
  };
}

function write(root, relativePath, content) {
  const filePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

function initGitRepo(repoDir, branch, message) {
  execFileSync("git", ["init", "-b", branch, repoDir], { stdio: "ignore" });
  execFileSync("git", ["-C", repoDir, "config", "user.email", "temper@example.com"], { stdio: "ignore" });
  execFileSync("git", ["-C", repoDir, "config", "user.name", "Temper Test"], { stdio: "ignore" });
  execFileSync("git", ["-C", repoDir, "add", "."], { stdio: "ignore" });
  execFileSync("git", ["-C", repoDir, "commit", "-m", message], { stdio: "ignore" });
}

function rootPackageJson() {
  return {
    name: "temper-fixture",
    private: true,
    packageManager: "pnpm@10.6.0",
    scripts: {
      build: "node -e \"console.log('build ok')\"",
      test: "node -e \"console.log('test ok')\"",
      "changelog:dry": "node -e \"console.log('changelog ok')\""
    }
  };
}

function clientPackageJson() {
  return {
    name: "client",
    private: true,
    scripts: {
      typecheck: "node -e \"console.log('typecheck ok')\""
    }
  };
}

function contractsPackageJson() {
  return {
    name: "contracts",
    private: true,
    scripts: {
      "test:balance": "node -e \"console.log('balance ok')\"",
      "test:smoke:all": "node -e \"console.log('smoke ok')\""
    }
  };
}
