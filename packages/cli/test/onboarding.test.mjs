import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { buildExistingProjectOnboarding } from "../src/lib/onboarding.mjs";

const CLI_PATH = "/Users/michaelorourke/temper-worktrees/ud-operator/packages/cli/bin/temper.mjs";

test("buildExistingProjectOnboarding classifies lifecycle, efficiency, and hook risk", async (t) => {
  const repoDir = createOnboardingFixtureRepo(t);
  const result = buildExistingProjectOnboarding({ cwd: repoDir });

  assert.equal(result.analysis.family.id, "data-driven-progression-rpg");
  assert.equal(result.onboarding.lifecycle.id, "live");
  assert.equal(result.onboarding.execution_policy.commands.smoke.risk, "live_stateful");
  assert.ok(result.onboarding.execution_policy.hook_recommendations.full.gated_live.includes("smoke"));
  assert.ok(result.onboarding.recommendations.some((item) => item.id === "split-root-test-from-lint"));
  assert.match(result.report, /Token Efficiency/);
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
  assert.ok(fs.existsSync(path.join(repoDir, ".temper/reports/onboarding.md")));
  assert.ok(fs.existsSync(path.join(repoDir, ".temper/reports/onboarding.json")));
  assert.ok(fs.existsSync(path.join(repoDir, ".temper/reports/adoption.md")));
  assert.ok(fs.existsSync(path.join(repoDir, ".temper/assistants/codex.md")));
  assert.ok(fs.existsSync(path.join(repoDir, ".claude/commands/temper-ship.md")));
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
  assert.ok(!fs.existsSync(path.join(rehearsalRoot, ".temper/stale.txt")));

  const rehearsalAgents = fs.readFileSync(path.join(rehearsalRoot, "AGENTS.md"), "utf8");
  const rehearsalShip = fs.readFileSync(path.join(rehearsalRoot, ".claude/commands/temper-ship.md"), "utf8");
  assert.match(rehearsalAgents, /pnpm exec temper/);
  assert.ok(!rehearsalAgents.includes("pnpm exec old-temper"));
  assert.match(rehearsalShip, /pnpm exec temper/);
  assert.ok(!rehearsalShip.includes("old install"));
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
    write(repoDir, ".claude/commands/temper-ship.md", "old install\n");
    write(
      repoDir,
      "AGENTS.md",
      "# Agents\n\n<!-- TEMPER_RUNTIME:BEGIN -->\n## Temper\n\n- Run `pnpm exec old-temper ship lite --cwd .`\n<!-- TEMPER_RUNTIME:END -->\n"
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
