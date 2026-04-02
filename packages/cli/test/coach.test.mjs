import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { buildCoachPacket, parseCoachArgs } from "../src/lib/coach.mjs";
import { gatherRepoContext } from "../src/lib/repo-context.mjs";

test("parseCoachArgs handles repo and cwd flags", () => {
  const parsed = parseCoachArgs([
    "--intent",
    "prod hotfix",
    "--cwd",
    "/tmp/demo",
    "--no-repo",
    "--capability",
    "hotfix,security",
    "--files",
    "server/auth.ts,ops/deploy.md"
  ]);

  assert.equal(parsed.intent, "prod hotfix");
  assert.equal(parsed.cwd, "/tmp/demo");
  assert.equal(parsed.repo, false);
  assert.deepEqual(parsed.capabilities, ["hotfix", "security"]);
  assert.deepEqual(parsed.files, ["server/auth.ts", "ops/deploy.md"]);
});

test("buildCoachPacket routes explicit progression files through balance doctrine", () => {
  const packet = buildCoachPacket({
    repo: false,
    intent: "thinking through progression drop changes",
    files: ["game/items/drop-table.ts", "game/progression/unlocks.ts"]
  });

  assert.equal(packet.repo, null);
  assert.equal(packet.selection.capabilities[0]?.id, "balance");
  assert.equal(packet.selection.families[0]?.id, "data-driven-progression-rpg");
  assert.equal(packet.selection.hats[0]?.id, "kaplan");
  assert.ok(packet.retrieval.chunks.some((chunk) => chunk.doc === "capabilities/balance"));
});

test("buildCoachPacket infers UX from repo changed files without explicit file input", async (t) => {
  const repoDir = fs.mkdtempSync(path.join(os.tmpdir(), "temper-coach-"));
  t.after(() => fs.rmSync(repoDir, { recursive: true, force: true }));

  execFileSync("git", ["init", "-b", "main", repoDir], { stdio: "ignore" });
  fs.mkdirSync(path.join(repoDir, "client", "ui"), { recursive: true });
  fs.writeFileSync(path.join(repoDir, "client", "ui", "onboarding-flow.tsx"), "export const ok = true;\n");

  const repo = gatherRepoContext({ cwd: repoDir });
  assert.equal(repo.available, true);
  assert.ok(repo.changedFiles.includes("client/ui/onboarding-flow.tsx"));

  const packet = buildCoachPacket({
    cwd: repoDir,
    intent: "reviewing first five minute flow"
  });

  assert.equal(packet.repo?.available, true);
  assert.ok(packet.input.files.includes("client/ui/onboarding-flow.tsx"));
  assert.equal(packet.selection.capabilities[0]?.id, "ux");
  assert.equal(packet.selection.hats[0]?.id, "miyamoto");
  assert.equal(packet.selection.families[0]?.id, "real-time-action");
});
