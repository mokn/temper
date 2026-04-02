import fs from "node:fs";
import path from "node:path";
import { TEMPER_SESSION_MARKER, readSessionState } from "./continuity.mjs";
import { findProjectRoot, rel } from "./project-config.mjs";
import { gatherRepoContext } from "./repo-context.mjs";

export function evaluateRestartReadiness(options = {}) {
  const projectRoot = findProjectRoot(options.cwd ?? process.cwd());
  const repo = gatherRepoContext({ cwd: projectRoot });
  const sessionPath = repo.workflowFiles?.session || path.join(projectRoot, "SESSION.md");
  const sessionState = readSessionState({ cwd: projectRoot }).sessionState;
  const findings = [];
  let score = 100;

  const sessionPresent = fs.existsSync(sessionPath);
  const sessionContent = sessionPresent ? fs.readFileSync(sessionPath, "utf8") : "";
  if (!sessionPresent) {
    score -= pushFinding(findings, "error", "missing_session_file", "SESSION.md is missing.");
  } else if (!sessionContent.includes(`${TEMPER_SESSION_MARKER}:BEGIN`)) {
    score -= pushFinding(findings, "warn", "missing_session_block", "SESSION.md is present but the Temper-managed session block is missing.");
  }

  if (sessionState.entries.length === 0) {
    score -= pushFinding(findings, "error", "missing_session_state", "No continuity entries are recorded in .temper/workflow/session.json.");
  }

  const primaryEntry = sessionState.entries[0] || null;
  if (primaryEntry && (!primaryEntry.next || primaryEntry.next === "none")) {
    score -= pushFinding(findings, "warn", "missing_next_step", "The active session entry does not include a concrete next step.");
  }

  const targetHandoff = resolveTargetHandoff(projectRoot, repo, primaryEntry);
  if (!targetHandoff) {
    score -= pushFinding(findings, "error", "missing_handoff", "No handoff document is linked from the active session entry and no fallback handoff was found.");
  } else {
    score -= evaluateHandoff(targetHandoff, projectRoot, findings);
  }

  if (findings.length === 0) {
    findings.push({
      severity: "info",
      code: "restart_ready",
      message: "SESSION.md and the linked handoff look usable for a cold restart."
    });
  }

  score = Math.max(0, score);

  return {
    schema_version: 1,
    type: "temper.eval.restart.report",
    generated_at: new Date().toISOString(),
    project: {
      root: projectRoot
    },
    repo: {
      available: repo.available,
      branch: repo.branch || "unknown",
      dirty: repo.isDirty || false
    },
    session: {
      path: sessionPresent ? rel(projectRoot, sessionPath) : "SESSION.md",
      managed_block_present: sessionContent.includes(`${TEMPER_SESSION_MARKER}:BEGIN`),
      entry_count: sessionState.entries.length,
      primary_entry: primaryEntry
    },
    target_handoff: targetHandoff
      ? {
          path: rel(projectRoot, targetHandoff.filePath),
          source: targetHandoff.source
        }
      : null,
    verdict: score >= 85 ? "pass" : score >= 60 ? "caution" : "fail",
    score,
    findings
  };
}

export function renderRestartEval(report) {
  const lines = [
    "Temper Restart Eval",
    "===================",
    `Root: ${report.project.root}`,
    `Verdict: ${report.verdict}`,
    `Score: ${report.score}/100`,
    `Session: ${report.session.path}`,
    `Handoff: ${report.target_handoff?.path || "none"}`,
    ""
  ];

  lines.push("Findings:");
  for (const finding of report.findings) {
    lines.push(`- [${finding.severity}] ${finding.message}`);
  }

  return lines.join("\n") + "\n";
}

function evaluateHandoff(targetHandoff, projectRoot, findings) {
  let penalty = 0;
  const content = fs.readFileSync(targetHandoff.filePath, "utf8");
  const sections = [
    ["Restart Point", /## Restart Point/i],
    ["What Changed", /## What Changed/i],
    ["Next Steps", /## Next Steps/i]
  ];

  for (const [label, pattern] of sections) {
    if (!pattern.test(content)) {
      penalty += pushFinding(findings, "warn", `missing_${slugify(label)}_section`, `The handoff is missing a "${label}" section.`);
    }
  }

  if (!/^\d+\.\s+/m.test(content)) {
    penalty += pushFinding(findings, "warn", "missing_numbered_next_steps", "The handoff does not include numbered next steps.");
  }
  if (!/- branch:\s*`[^`]+`/i.test(content)) {
    penalty += pushFinding(findings, "warn", "missing_branch_context", "The handoff does not capture the branch in Restart Point.");
  }
  if (!/- head:\s*`[^`]+`/i.test(content)) {
    penalty += pushFinding(findings, "warn", "missing_head_context", "The handoff does not capture the head commit in Restart Point.");
  }
  if (!/- status:\s*`[^`]+`/i.test(content)) {
    penalty += pushFinding(findings, "warn", "missing_status_context", "The handoff does not capture whether the repo was clean or dirty.");
  }

  return penalty;
}

function resolveTargetHandoff(projectRoot, repo, primaryEntry) {
  const candidates = [];

  if (primaryEntry?.handoff && primaryEntry.handoff !== "none") {
    candidates.push({
      filePath: path.resolve(projectRoot, primaryEntry.handoff),
      source: "session_entry"
    });
    if (repo.sharedRoot) {
      candidates.push({
        filePath: path.resolve(repo.sharedRoot, primaryEntry.handoff),
        source: "session_entry_shared_root"
      });
    }
  }

  for (const filePath of repo.workflowFiles?.handoffs ?? []) {
    candidates.push({
      filePath,
      source: "repo_handoffs"
    });
  }

  return candidates.find((item) => fs.existsSync(item.filePath)) || null;
}

function pushFinding(findings, severity, code, message) {
  findings.push({
    severity,
    code,
    message
  });

  switch (severity) {
    case "error":
      return 35;
    case "warn":
      return 10;
    default:
      return 0;
  }
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}
