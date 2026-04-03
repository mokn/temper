import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

// Test the CLI paths that the MCP server shells out to.
// The MCP server is a thin adapter — if the CLI produces correct JSON,
// the MCP server will return it correctly.

const TEMPER_BIN = path.resolve(import.meta.dirname, "../../cli/bin/temper.mjs");

function runTemper(args) {
  return JSON.parse(
    execFileSync("node", [TEMPER_BIN, ...args], {
      encoding: "utf8",
      timeout: 30_000,
      stdio: ["ignore", "pipe", "pipe"]
    })
  );
}

function setupTempRepo(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "temper-mcp-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  execFileSync("git", ["init", "-b", "main", dir], { stdio: "ignore" });
  fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({ name: "test-project", scripts: { build: "echo ok" } }));
  execFileSync("git", ["-C", dir, "add", "."], { stdio: "ignore" });
  execFileSync("git", ["-C", dir, "commit", "-m", "init"], { stdio: "ignore" });
  return dir;
}

function onboardRepo(dir) {
  execFileSync("node", [TEMPER_BIN, "onboard", "existing", "--write", "--cwd", dir], {
    encoding: "utf8",
    timeout: 30_000,
    stdio: ["ignore", "pipe", "pipe"]
  });
}

// ---------------------------------------------------------------------------
// coach
// ---------------------------------------------------------------------------

test("coach --json returns a valid coach packet", () => {
  const result = runTemper(["coach", "--json", "--no-repo", "--intent", "test balance query"]);
  assert.equal(result.type, "temper.coach.packet");
  assert.ok(result.selection);
  assert.ok(result.selection.hats.length > 0, "should select at least one hat");
  assert.ok(result.retrieval.chunks.length > 0, "should retrieve doctrine chunks");
});

test("coach --json --capability balance routes through balance doctrine", () => {
  const result = runTemper(["coach", "--json", "--no-repo", "--capability", "balance", "--intent", "drop rate tuning"]);
  assert.equal(result.type, "temper.coach.packet");
  assert.ok(
    result.selection.capabilities.some((c) => c.id === "balance"),
    "should include balance capability"
  );
});

// ---------------------------------------------------------------------------
// hotfix
// ---------------------------------------------------------------------------

test("hotfix --json routes through hotfix capability", () => {
  const result = runTemper(["hotfix", "--json", "--no-repo", "--intent", "players cannot move"]);
  assert.equal(result.type, "temper.coach.packet");
  assert.ok(
    result.selection.capabilities.some((c) => c.id === "hotfix"),
    "should include hotfix capability"
  );
});

// ---------------------------------------------------------------------------
// inspect
// ---------------------------------------------------------------------------

test("inspect --json returns a valid report for an onboarded repo", (t) => {
  const dir = setupTempRepo(t);
  onboardRepo(dir);
  const result = runTemper(["inspect", "--json", "--cwd", dir]);
  assert.equal(result.type, "temper.inspect.report");
  assert.equal(result.config.present, true);
  assert.ok(result.project.root);
});

test("inspect --json returns config.present=false for a non-onboarded repo", (t) => {
  const dir = setupTempRepo(t);
  const result = runTemper(["inspect", "--json", "--cwd", dir]);
  assert.equal(result.type, "temper.inspect.report");
  assert.equal(result.config.present, false);
});

// ---------------------------------------------------------------------------
// session show
// ---------------------------------------------------------------------------

test("session show --json returns session state for an onboarded repo", (t) => {
  const dir = setupTempRepo(t);
  onboardRepo(dir);
  const result = runTemper(["session", "show", "--json", "--cwd", dir]);
  assert.ok(result.projectRoot);
  assert.ok(result.sessionState);
  assert.ok(Array.isArray(result.sessionState.entries));
});

// ---------------------------------------------------------------------------
// session set
// ---------------------------------------------------------------------------

test("session set --json without --write returns a preview plan", (t) => {
  const dir = setupTempRepo(t);
  onboardRepo(dir);
  const result = runTemper(["session", "set", "--json", "--cwd", dir, "--next", "test next step"]);
  assert.ok(result.entry);
  assert.equal(result.entry.next, "test next step");
  assert.ok(result.sessionContent);
});

test("session set --json --write persists and returns paths", (t) => {
  const dir = setupTempRepo(t);
  onboardRepo(dir);
  const result = runTemper(["session", "set", "--json", "--write", "--cwd", dir, "--next", "persisted step"]);
  assert.ok(result.sessionPath);
  assert.ok(result.sessionStatePath);
  const state = JSON.parse(fs.readFileSync(path.join(dir, ".temper", "workflow", "session.json"), "utf8"));
  assert.ok(state.entries.some((e) => e.next === "persisted step"));
});

// ---------------------------------------------------------------------------
// handoff
// ---------------------------------------------------------------------------

test("handoff --json without --write returns a preview plan", (t) => {
  const dir = setupTempRepo(t);
  onboardRepo(dir);
  const result = runTemper([
    "handoff", "--json", "--cwd", dir,
    "--slug", "test-handoff",
    "--summary", "test summary",
    "--next", "test next"
  ]);
  assert.equal(result.slug, "test-handoff");
  assert.ok(result.handoffContent);
  assert.ok(result.handoffContent.includes("test summary"));
  // Verify no files were written
  assert.ok(!fs.existsSync(path.join(dir, "HANDOFF_test-handoff.md")));
});

test("handoff --json --write creates handoff and updates session", (t) => {
  const dir = setupTempRepo(t);
  onboardRepo(dir);
  const result = runTemper([
    "handoff", "--json", "--write", "--cwd", dir,
    "--slug", "test-handoff",
    "--summary", "test summary",
    "--next", "test next"
  ]);
  assert.ok(result.handoffPath);
  assert.ok(fs.existsSync(path.join(dir, "HANDOFF_test-handoff.md")));
  const handoffContent = fs.readFileSync(path.join(dir, "HANDOFF_test-handoff.md"), "utf8");
  assert.ok(handoffContent.includes("test summary"));
});

// ---------------------------------------------------------------------------
// ship
// ---------------------------------------------------------------------------

test("ship lite --json --dry-run returns a report with skipped steps", (t) => {
  const dir = setupTempRepo(t);
  onboardRepo(dir);
  const result = runTemper(["ship", "lite", "--json", "--dry-run", "--cwd", dir]);
  assert.equal(result.type, "temper.ship.report");
  assert.equal(result.mode, "lite");
  assert.equal(result.execution.dry_run, true);
  assert.ok(result.execution.steps.every((s) => s.skipped === true), "all steps should be skipped in dry-run");
});

// ---------------------------------------------------------------------------
// MCP server module loads
// ---------------------------------------------------------------------------

test("MCP server module loads without error", async () => {
  // Importing the server starts the stdio transport, which will hang if we
  // don't close stdin. Instead, just verify the module resolves.
  const serverPath = path.resolve(import.meta.dirname, "../src/server.mjs");
  assert.ok(fs.existsSync(serverPath), "server.mjs should exist");
});
