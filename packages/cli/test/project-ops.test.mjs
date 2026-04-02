import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  analyzeProject,
  createConfigFromAnalysis
} from "../src/lib/project-analysis.mjs";
import { installAssistantAdapters } from "../src/lib/assistant.mjs";
import { writeProjectConfig } from "../src/lib/project-config.mjs";
import { runShip } from "../src/lib/ship.mjs";

test("analyzeProject infers a UD-like repo shape", async (t) => {
  const repoDir = createFixtureRepo(t);
  const analysis = analyzeProject({ cwd: repoDir });

  assert.equal(analysis.package_manager, "pnpm");
  assert.equal(analysis.family.id, "data-driven-progression-rpg");
  assert.equal(analysis.stack.id, "browser-typescript-monorepo");
  assert.ok(analysis.stack.overlays.includes("mud-onchain"));
  assert.ok(analysis.surfaces.source_of_truth.includes("packages/contracts/mud.config.ts"));
  assert.ok(analysis.surfaces.source_of_truth.includes("packages/contracts/zones/start/items.json"));
  assert.equal(analysis.environments.find((item) => item.id === "beta")?.branch, "dev");
  assert.equal(analysis.environments.find((item) => item.id === "prod")?.branch, "main");
  assert.ok(analysis.commands.build);
  assert.ok(analysis.commands.typecheck);
  assert.ok(analysis.commands.balance_verify);
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
  assert.ok(written.includes(".claude/commands/temper-ship.md"));
  assert.equal(fs.existsSync(path.join(repoDir, ".claude/commands/temper-balance.md")), true);
  assert.match(
    fs.readFileSync(path.join(repoDir, ".temper/assistants/codex.md"), "utf8"),
    /pnpm exec temper coach --cwd \./
  );
  assert.match(
    fs.readFileSync(path.join(repoDir, "CLAUDE.md"), "utf8"),
    /TEMPER_RUNTIME:BEGIN[\s\S]*pnpm exec temper ship full --cwd \./
  );
  assert.match(
    fs.readFileSync(path.join(repoDir, "AGENTS.md"), "utf8"),
    /TEMPER_RUNTIME:BEGIN[\s\S]*pnpm exec temper coach --cwd \./
  );
});

test("runShip executes configured steps from generated config", async (t) => {
  const repoDir = createFixtureRepo(t);
  const analysis = analyzeProject({ cwd: repoDir });
  const config = createConfigFromAnalysis(analysis);

  writeProjectConfig(repoDir, config);

  execFileSync("git", ["init", "-b", "dev", repoDir], { stdio: "ignore" });
  execFileSync("git", ["-C", repoDir, "config", "user.email", "temper@example.com"], { stdio: "ignore" });
  execFileSync("git", ["-C", repoDir, "config", "user.name", "Temper Test"], { stdio: "ignore" });
  execFileSync("git", ["-C", repoDir, "add", "."], { stdio: "ignore" });
  execFileSync("git", ["-C", repoDir, "commit", "-m", "fixture"], { stdio: "ignore" });

  const report = runShip({
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
  write(repoDir, "packages/client/src/ui/onboarding.tsx", "export const onboarding = true;\n");
  return repoDir;
}

function write(root, relativePath, content) {
  const filePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

function rootPackageJson() {
  return {
    name: "ud-fixture",
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
