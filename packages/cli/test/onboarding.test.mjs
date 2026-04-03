import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { buildExistingProjectOnboarding, buildOnboardingInstallPreview } from "../src/lib/onboarding.mjs";
import { runShip } from "../src/lib/ship.mjs";

const CLI_PATH = fileURLToPath(new URL("../bin/temper.mjs", import.meta.url));

test("buildExistingProjectOnboarding classifies lifecycle, efficiency, and hook risk", async (t) => {
  const repoDir = createOnboardingFixtureRepo(t);
  const result = buildExistingProjectOnboarding({ cwd: repoDir });

  assert.equal(result.analysis.family.id, "data-driven-progression-rpg");
  assert.equal(result.onboarding.lifecycle.id, "live");
  assert.equal(result.onboarding.execution_policy.commands.smoke.risk, "live_stateful");
  assert.ok(result.onboarding.execution_policy.hook_recommendations.full.gated_live.includes("smoke"));
  assert.ok(result.onboarding.execution_policy.lifecycle.ship_modes.full.gated_steps.includes("smoke"));
  assert.ok(result.onboarding.memory.recurring_failure_modes.some((item) => /root `test`/i.test(item)));
  assert.ok(result.onboarding.resurfacing.some((item) => item.id === "promote-gated-full-steps"));
  assert.ok(result.onboarding.recommendations.some((item) => item.id === "split-root-test-from-lint"));
  assert.match(result.report, /Token Efficiency/);
  assert.match(result.report, /Policy Lifecycle/);
  assert.match(result.report, /Recommended Hook Shape/);
});

test("onboard existing --write materializes reports, config, and assistant surfaces", async (t) => {
  const repoDir = createOnboardingFixtureRepo(t);

  execFileSync("node", [CLI_PATH, "onboard", "existing", "--cwd", repoDir, "--write"], {
    stdio: "ignore"
  });

  const config = JSON.parse(fs.readFileSync(path.join(repoDir, "temper.config.json"), "utf8"));
  assert.equal(config.mode, "onboarded");
  assert.equal(config.execution_policy.commands.smoke.risk, "live_stateful");
  assert.ok(config.ship.full.gated_steps.includes("smoke"));
  assert.equal(config.ship.full.steps.includes("smoke"), false);
  assert.ok(fs.existsSync(path.join(repoDir, ".temper/reports/onboarding.md")));
  assert.ok(fs.existsSync(path.join(repoDir, ".temper/reports/onboarding.json")));
  assert.ok(fs.existsSync(path.join(repoDir, ".temper/reports/adoption.md")));
  assert.ok(fs.existsSync(path.join(repoDir, ".temper/workflow/continuity.json")));
  assert.ok(fs.existsSync(path.join(repoDir, ".temper/workflow/HANDOFF_TEMPLATE.md")));
  assert.ok(fs.existsSync(path.join(repoDir, ".temper/workflow/session.json")));
  assert.ok(fs.existsSync(path.join(repoDir, ".temper/assistants/shared-canon.json")));
  assert.ok(fs.existsSync(path.join(repoDir, ".temper/assistants/shared-canon.md")));
  assert.ok(fs.existsSync(path.join(repoDir, ".temper/assistants/codex.md")));
  assert.ok(fs.existsSync(path.join(repoDir, ".claude/commands/temper-ship.md")));
  assert.match(fs.readFileSync(path.join(repoDir, "SESSION.md"), "utf8"), /TEMPER_SESSION:BEGIN/);
});

test("buildOnboardingInstallPreview enumerates file changes, habit changes, and rollback", async (t) => {
  const repoDir = createOnboardingFixtureRepo(t);
  const result = buildExistingProjectOnboarding({ cwd: repoDir });
  const preview = buildOnboardingInstallPreview({
    result,
    assistants: ["claude", "codex"]
  });

  assert.ok(preview.file_changes.some((item) => item.path === "temper.config.json" && item.action === "create"));
  assert.ok(preview.file_changes.some((item) => item.path === "AGENTS.md" && item.action === "update"));
  assert.ok(preview.file_changes.some((item) => item.path === "SESSION.md" && item.action === "update"));
  assert.ok(preview.file_changes.some((item) => item.path === ".temper/workflow/continuity.json" && item.action === "create"));
  assert.ok(preview.file_changes.some((item) => item.path === ".temper/assistants/shared-canon.json" && item.action === "create"));
  assert.ok(preview.file_changes.some((item) => item.path === ".claude/commands/temper-ship.md" && item.action === "create"));
  assert.ok(preview.habit_changes.some((line) => line.includes("pnpm exec temper coach --cwd . --json")));
  assert.ok(preview.habit_changes.some((line) => line.includes("handoff --cwd . --slug")));
  assert.ok(preview.habit_changes.some((line) => line.includes("shared-canon.json")));
  assert.ok(preview.rollback.some((line) => line.includes("temper.config.json")));
  assert.ok(preview.rollback.some((line) => line.includes("SESSION.md")));
});

test("onboard existing --preview shows the write plan without mutating the repo", async (t) => {
  const repoDir = createOnboardingFixtureRepo(t);
  const agentsBefore = fs.readFileSync(path.join(repoDir, "AGENTS.md"), "utf8");
  const output = execFileSync("node", [CLI_PATH, "onboard", "existing", "--cwd", repoDir, "--preview"], {
    encoding: "utf8"
  });

  assert.match(output, /## Preview/);
  assert.match(output, /create: temper\.config\.json/);
  assert.match(output, /update: AGENTS\.md/);
  assert.equal(fs.readFileSync(path.join(repoDir, "AGENTS.md"), "utf8"), agentsBefore);
  assert.equal(fs.existsSync(path.join(repoDir, "temper.config.json")), false);
});

test("onboard existing --dry-run aliases preview in json mode", async (t) => {
  const repoDir = createOnboardingFixtureRepo(t);
  const output = execFileSync("node", [CLI_PATH, "onboard", "existing", "--cwd", repoDir, "--dry-run", "--json"], {
    encoding: "utf8"
  });
  const parsed = JSON.parse(output);

  assert.ok(parsed.preview);
  assert.ok(parsed.preview.file_changes.some((item) => item.path === "temper.config.json" && item.action === "create"));
  assert.ok(parsed.preview.file_changes.some((item) => item.path === ".temper/assistants/shared-canon.md" && item.action === "create"));
  assert.ok(parsed.preview.file_changes.some((item) => item.path === "CLAUDE.md" && item.action === "update"));
});

test("onboard existing --interview emits assistant-facing questions and defaults", async (t) => {
  const repoDir = createOnboardingFixtureRepo(t);
  const output = execFileSync("node", [CLI_PATH, "onboard", "existing", "--cwd", repoDir, "--interview", "--json"], {
    encoding: "utf8"
  });
  const parsed = JSON.parse(output);

  assert.deepEqual(Object.keys(parsed), ["interview"]);
  assert.equal(fs.realpathSync(parsed.interview.project_root), fs.realpathSync(repoDir));
  assert.ok(parsed.interview.questions.some((item) => item.id === "name"));
  assert.ok(parsed.interview.questions.some((item) => item.id === "family"));
  assert.ok(parsed.interview.questions.some((item) => item.id === "stack"));
  assert.ok(parsed.interview.questions.some((item) => item.id === "beta_branch"));
  assert.ok(parsed.interview.questions.some((item) => item.id === "prod_branch"));
  assert.match(parsed.interview.apply_command, /temper onboard existing --write/);
  assert.match(parsed.interview.next_step, /rerun the apply command/);
});

test("onboard existing --write applies chat-collected onboarding overrides", async (t) => {
  const repoDir = createOnboardingFixtureRepo(t);

  execFileSync(
    "node",
    [
      CLI_PATH,
      "onboard",
      "existing",
      "--cwd",
      repoDir,
      "--write",
      "--name",
      "UD Operator",
      "--beta-branch",
      "beta",
      "--prod-branch",
      "release"
    ],
    {
      stdio: "ignore"
    }
  );

  const config = JSON.parse(fs.readFileSync(path.join(repoDir, "temper.config.json"), "utf8"));
  const onboarding = JSON.parse(fs.readFileSync(path.join(repoDir, ".temper/reports/onboarding.json"), "utf8"));
  assert.equal(config.name, "UD Operator");
  assert.equal(config.environments.beta.branch, "beta");
  assert.equal(config.environments.prod.branch, "release");
  assert.equal(onboarding.operator_answers.name, "UD Operator");
  assert.equal(onboarding.operator_answers.beta_branch, "beta");
  assert.equal(onboarding.operator_answers.prod_branch, "release");
});

test("runShip respects onboarded blessed defaults and gated promotion", async (t) => {
  const repoDir = createOnboardingFixtureRepo(t);

  execFileSync("node", [CLI_PATH, "onboard", "existing", "--cwd", repoDir, "--write"], {
    stdio: "ignore"
  });

  const defaultReport = await runShip({
    cwd: repoDir,
    mode: "full",
    intent: "release confidence pass",
    dryRun: true
  });
  assert.ok(defaultReport.plan.gated_steps.includes("smoke"));
  assert.equal(defaultReport.plan.steps.some((step) => step.id === "smoke"), false);
  assert.ok(defaultReport.resurfacing.some((item) => item.id === "promote-gated-full-steps"));

  const promotedReport = await runShip({
    cwd: repoDir,
    mode: "full",
    intent: "release confidence pass",
    dryRun: true,
    promote: ["smoke"]
  });
  assert.ok(promotedReport.plan.steps.some((step) => step.id === "smoke"));
  assert.ok(promotedReport.warnings.some((line) => line.includes("promoted gated steps")));
});

test("onboard existing --rehearse replays a fresh install in a disposable lab", async (t) => {
  const repoDir = createOnboardingFixtureRepo(t, {
    seedTemperInstall: true
  });
  const rehearsalRoot = path.join(os.tmpdir(), `temper-rehearsal-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  const sourceAgentsBefore = fs.readFileSync(path.join(repoDir, "AGENTS.md"), "utf8");
  const sourceConfigBefore = fs.readFileSync(path.join(repoDir, "temper.config.json"), "utf8");

  t.after(() => fs.rmSync(rehearsalRoot, { recursive: true, force: true }));

  execFileSync("node", [CLI_PATH, "onboard", "existing", "--cwd", repoDir, "--rehearse", "--out", rehearsalRoot], {
    stdio: "ignore"
  });

  assert.equal(fs.readFileSync(path.join(repoDir, "AGENTS.md"), "utf8"), sourceAgentsBefore);
  assert.equal(fs.readFileSync(path.join(repoDir, "temper.config.json"), "utf8"), sourceConfigBefore);
  assert.ok(fs.existsSync(path.join(rehearsalRoot, "temper.config.json")));
  assert.ok(fs.existsSync(path.join(rehearsalRoot, ".temper/reports/rehearsal.json")));
  assert.ok(fs.existsSync(path.join(rehearsalRoot, ".temper/workflow/continuity.json")));
  assert.ok(fs.existsSync(path.join(rehearsalRoot, ".temper/assistants/shared-canon.json")));
  assert.ok(!fs.existsSync(path.join(rehearsalRoot, ".temper/stale.txt")));

  const rehearsalAgents = fs.readFileSync(path.join(rehearsalRoot, "AGENTS.md"), "utf8");
  const rehearsalShip = fs.readFileSync(path.join(rehearsalRoot, ".claude/commands/temper-ship.md"), "utf8");
  const rehearsalCanon = fs.readFileSync(path.join(rehearsalRoot, ".temper/assistants/shared-canon.json"), "utf8");
  assert.match(rehearsalAgents, /pnpm exec temper/);
  assert.ok(!rehearsalAgents.includes("pnpm exec old-temper"));
  assert.match(rehearsalShip, /pnpm exec temper/);
  assert.ok(!rehearsalShip.includes("old install"));
  assert.match(rehearsalCanon, /shared-canon/);
  assert.match(fs.readFileSync(path.join(rehearsalRoot, "SESSION.md"), "utf8"), /TEMPER_SESSION:BEGIN/);
});

test("temper handoff --preview shows the session update and target handoff path without mutating the repo", async (t) => {
  const repoDir = createOnboardingFixtureRepo(t);

  execFileSync("node", [CLI_PATH, "onboard", "existing", "--cwd", repoDir, "--write"], {
    stdio: "ignore"
  });

  const sessionBefore = fs.readFileSync(path.join(repoDir, "SESSION.md"), "utf8");
  const output = execFileSync(
    "node",
    [CLI_PATH, "handoff", "--cwd", repoDir, "--slug", "alpha-pass", "--summary", "Wrapped the alpha pass.", "--next", "Run beta smoke."],
    { encoding: "utf8" }
  );

  assert.match(output, /## Handoff Preview/);
  assert.match(output, /HANDOFF_alpha-pass\.md/);
  assert.match(output, /Run beta smoke\./);
  assert.equal(fs.readFileSync(path.join(repoDir, "SESSION.md"), "utf8"), sessionBefore);
  assert.equal(fs.existsSync(path.join(repoDir, "HANDOFF_alpha-pass.md")), false);
});

test("temper handoff --write creates the handoff and updates the managed session board", async (t) => {
  const repoDir = createOnboardingFixtureRepo(t);

  execFileSync("node", [CLI_PATH, "onboard", "existing", "--cwd", repoDir, "--write"], {
    stdio: "ignore"
  });

  execFileSync(
    "node",
    [
      CLI_PATH,
      "handoff",
      "--cwd",
      repoDir,
      "--slug",
      "alpha-pass",
      "--summary",
      "Wrapped the alpha pass.",
      "--next",
      "Run beta smoke.",
      "--next",
      "Push after review.",
      "--write"
    ],
    { stdio: "ignore" }
  );

  const handoff = fs.readFileSync(path.join(repoDir, "HANDOFF_alpha-pass.md"), "utf8");
  const session = fs.readFileSync(path.join(repoDir, "SESSION.md"), "utf8");
  const sessionState = JSON.parse(fs.readFileSync(path.join(repoDir, ".temper/workflow/session.json"), "utf8"));

  assert.match(handoff, /Wrapped the alpha pass\./);
  assert.match(handoff, /1\. Run beta smoke\./);
  assert.match(session, /alpha-pass/);
  assert.match(session, /HANDOFF_alpha-pass\.md/);
  assert.equal(sessionState.entries[0].workstream, "alpha-pass");
});

test("temper uninstall --preview shows owned artifacts without mutating the repo", async (t) => {
  const repoDir = createOnboardingFixtureRepo(t, {
    seedTemperInstall: true
  });
  const agentsBefore = fs.readFileSync(path.join(repoDir, "AGENTS.md"), "utf8");

  const output = execFileSync("node", [CLI_PATH, "uninstall", "--cwd", repoDir, "--preview"], {
    encoding: "utf8"
  });

  assert.match(output, /## Uninstall Preview/);
  assert.match(output, /delete: temper\.config\.json/);
  assert.match(output, /delete: \.temper\//);
  assert.match(output, /update: AGENTS\.md/);
  assert.equal(fs.readFileSync(path.join(repoDir, "AGENTS.md"), "utf8"), agentsBefore);
  assert.ok(fs.existsSync(path.join(repoDir, "temper.config.json")));
});

test("temper uninstall --write removes Temper-owned files and hook blocks", async (t) => {
  const repoDir = createOnboardingFixtureRepo(t, {
    seedTemperInstall: true
  });

  execFileSync("node", [CLI_PATH, "reset", "--cwd", repoDir, "--write"], {
    stdio: "ignore"
  });

  assert.equal(fs.existsSync(path.join(repoDir, "temper.config.json")), false);
  assert.equal(fs.existsSync(path.join(repoDir, ".temper")), false);
  assert.equal(fs.existsSync(path.join(repoDir, ".claude/commands/temper-ship.md")), false);
  const agents = fs.readFileSync(path.join(repoDir, "AGENTS.md"), "utf8");
  const session = fs.readFileSync(path.join(repoDir, "SESSION.md"), "utf8");
  assert.ok(!agents.includes("TEMPER_RUNTIME:BEGIN"));
  assert.ok(!session.includes("TEMPER_SESSION:BEGIN"));
});

function createOnboardingFixtureRepo(t, options = {}) {
  const repoDir = fs.mkdtempSync(path.join(os.tmpdir(), "temper-onboard-"));
  t.after(() => fs.rmSync(repoDir, { recursive: true, force: true }));

  write(
    repoDir,
    "package.json",
    JSON.stringify(
      {
        name: "temper-onboard-fixture",
        private: true,
        packageManager: "pnpm@10.6.0",
        scripts: {
          build: "pnpm recursive run build",
          test: "pnpm --filter client run lint",
          "changelog:dry": "node scripts/changelog.mjs --dry-run"
        }
      },
      null,
      2
    ) + "\n"
  );
  write(repoDir, "scripts/changelog.mjs", "console.log('changelog ok');\n");
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
  write(
    repoDir,
    ".github/workflows/deploy-beta.yml",
    "name: deploy-beta\non:\n  push:\n    branches: [dev]\n  workflow_dispatch:\njobs:\n  deploy:\n    runs-on: ubuntu-latest\n    steps:\n      - run: pnpm deploy:testnet\n"
  );
  write(repoDir, "packages/contracts/mud.config.ts", "export default {};\n");
  write(repoDir, "packages/contracts/worlds.json", "{\n  \"8453\": {\"address\": \"0x123\"}\n}\n");
  write(repoDir, "packages/contracts/zones/start/items.json", "{\n  \"sword\": 1\n}\n");
  write(repoDir, "packages/contracts/zones/start/effects.json", "{\n  \"burn\": 1\n}\n");
  write(repoDir, "packages/contracts/zones/start/monsters.json", "{\n  \"slime\": 1\n}\n");
  write(
    repoDir,
    "packages/contracts/package.json",
    JSON.stringify(
      {
        name: "contracts",
        private: true,
        scripts: {
          build: "node -e \"console.log('contracts build ok')\"",
          "test:balance": "vitest run scripts/balance/",
          "test:smoke:all": "bash -c 'set -a && source .env.testnet && set +a && vitest run scripts/smoke-test/ --reporter=verbose --sequence.concurrent=false'"
        }
      },
      null,
      2
    ) + "\n"
  );
  write(
    repoDir,
    "packages/client/package.json",
    JSON.stringify(
      {
        name: "client",
        private: true,
        scripts: {
          build: "node -e \"console.log('client build ok')\"",
          lint: "eslint --ext .ts,.tsx src",
          typecheck: "tsc --noEmit"
        }
      },
      null,
      2
    ) + "\n"
  );
  write(repoDir, "packages/client/src/ui/onboarding.tsx", "export const onboarding = true;\n");

  if (options.seedTemperInstall) {
    write(repoDir, "temper.config.json", "{\n  \"mode\": \"stale\"\n}\n");
    write(repoDir, ".temper/stale.txt", "stale runtime\n");
    write(repoDir, ".temper/workflow/session.json", "{\n  \"entries\": []\n}\n");
    write(repoDir, ".claude/commands/temper-ship.md", "old install\n");
    write(
      repoDir,
      "AGENTS.md",
      "# Agents\n\n<!-- TEMPER_RUNTIME:BEGIN -->\n## Temper\n\n- Run `pnpm exec old-temper ship lite --cwd .`\n<!-- TEMPER_RUNTIME:END -->\n"
    );
    write(
      repoDir,
      "SESSION.md",
      "# Session\n\n<!-- TEMPER_SESSION:BEGIN -->\n## Temper Session\n\n| Workstream | Branch | Status | Next | Handoff | Updated |\n|---|---|---|---|---|---|\n| stale | dev | active | none | none | 2026-04-02 |\n<!-- TEMPER_SESSION:END -->\n"
    );
  }

  execFileSync("git", ["init", "-b", "dev", repoDir], { stdio: "ignore" });
  execFileSync("git", ["-C", repoDir, "config", "user.email", "temper@example.com"], { stdio: "ignore" });
  execFileSync("git", ["-C", repoDir, "config", "user.name", "Temper Test"], { stdio: "ignore" });
  execFileSync("git", ["-C", repoDir, "add", "."], { stdio: "ignore" });
  execFileSync("git", ["-C", repoDir, "commit", "-m", "fixture"], { stdio: "ignore" });

  return repoDir;
}

function write(root, relativePath, content) {
  const filePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}
