import fs from "node:fs";
import path from "node:path";
import { findProjectRoot, loadProjectConfig, rel, writeProjectFile } from "./project-config.mjs";
import { gatherRepoContext } from "./repo-context.mjs";

export function recordRunArtifact(options = {}) {
  const projectRoot = findProjectRoot(options.cwd ?? process.cwd());
  const recordedAt = options.recordedAt ?? new Date().toISOString();
  const command = options.command || "unknown";
  const action = options.action || "run";
  const payload = options.payload ?? {};
  const repo = gatherRepoContext({ cwd: projectRoot });
  const config = loadProjectConfig({ cwd: projectRoot, required: false });
  const runId = allocateRunId(projectRoot, recordedAt, [command, action]);
  const artifact = {
    schema_version: 1,
    type: "temper.run.artifact",
    run_id: runId,
    recorded_at: recordedAt,
    command,
    action,
    project: {
      root: projectRoot,
      name: config?.name || path.basename(projectRoot),
      family: config?.family || null,
      stack: config?.stack?.id || null,
      package_manager: config?.package_manager || null
    },
    repo: summarizeRepo(repo, projectRoot),
    summary: summarizeRun(payload, {
      command,
      action
    }),
    payload
  };
  const relativePath = `.temper/runs/${runId}.json`;
  const filePath = writeProjectFile(projectRoot, relativePath, JSON.stringify(artifact, null, 2) + "\n");

  return {
    runId,
    filePath,
    relativePath,
    artifact
  };
}

export function listRunArtifacts(options = {}) {
  const projectRoot = findProjectRoot(options.cwd ?? process.cwd());
  const runDir = path.join(projectRoot, ".temper", "runs");
  if (!fs.existsSync(runDir)) {
    return [];
  }

  return fs
    .readdirSync(runDir)
    .filter((entry) => entry.endsWith(".json"))
    .sort((left, right) => right.localeCompare(left))
    .slice(0, options.limit ?? Number.MAX_SAFE_INTEGER)
    .map((entry) => {
      const filePath = path.join(runDir, entry);
      const artifact = JSON.parse(fs.readFileSync(filePath, "utf8"));
      return {
        ...artifact,
        file_path: filePath,
        relative_path: rel(projectRoot, filePath)
      };
    });
}

export function loadRunArtifact(options = {}) {
  const projectRoot = findProjectRoot(options.cwd ?? process.cwd());
  const artifacts = listRunArtifacts({ cwd: projectRoot });
  if (artifacts.length === 0) {
    throw new Error(`No Temper runs found in ${projectRoot}`);
  }

  const requestedId = String(options.id || "latest").trim();
  if (!requestedId || requestedId === "latest") {
    return artifacts[0];
  }

  const normalizedId = requestedId.replace(/\.json$/i, "");
  const exact = artifacts.find((item) => item.run_id === normalizedId);
  if (exact) {
    return exact;
  }

  const prefixed = artifacts.filter((item) => item.run_id.startsWith(normalizedId));
  if (prefixed.length === 1) {
    return prefixed[0];
  }
  if (prefixed.length > 1) {
    throw new Error(`Run id prefix is ambiguous: ${requestedId}`);
  }

  throw new Error(`No Temper run matches ${requestedId}`);
}

function allocateRunId(projectRoot, recordedAt, parts) {
  const stamp = compactTimestamp(recordedAt);
  const slug = parts
    .flatMap((part) => String(part || "").trim().toLowerCase().split(/[^a-z0-9]+/))
    .filter(Boolean)
    .join("-") || "run";
  let runId = `${stamp}-${slug}`;
  let counter = 2;

  while (fs.existsSync(path.join(projectRoot, ".temper", "runs", `${runId}.json`))) {
    runId = `${stamp}-${slug}-${counter}`;
    counter += 1;
  }

  return runId;
}

function compactTimestamp(value) {
  return String(value)
    .replace(/[-:]/g, "")
    .replace(/\.(\d{3})Z$/, "$1Z");
}

function summarizeRepo(repo, projectRoot) {
  return {
    available: repo.available,
    branch: repo.branch || "unknown",
    dirty: repo.isDirty || false,
    changed_files: repo.changedFiles ?? [],
    counts: repo.counts ?? {
      changed: 0,
      staged: 0,
      unstaged: 0,
      untracked: 0
    },
    session_file: repo.workflowFiles?.session ? rel(projectRoot, repo.workflowFiles.session) : null
  };
}

function summarizeRun(payload, options) {
  const summary = {
    command_label: [options.command, options.action].filter(Boolean).join(" "),
    status: inferStatus(payload, options)
  };

  if (payload?.type) {
    summary.result_type = payload.type;
  }
  if (payload?.warnings?.length > 0) {
    summary.warning_count = payload.warnings.length;
  }
  if (payload?.execution?.steps) {
    summary.step_count = payload.execution.steps.length;
    summary.execution_ok = payload.execution.ok;
    summary.dry_run = payload.execution.dry_run === true;
  }
  if (payload?.handoffPath) {
    summary.handoff_path = payload.handoffPath;
  }
  if (payload?.configPath) {
    summary.config_path = payload.configPath;
  }

  return summary;
}

function inferStatus(payload, options) {
  if (payload?.execution) {
    if (payload.execution.dry_run === true) {
      return "dry_run";
    }
    return payload.execution.ok === true ? "ok" : "failed";
  }

  if (options.command === "handoff") {
    return options.action === "write" ? "written" : options.action;
  }
  if (options.command === "onboard" || options.command === "adopt" || options.command === "init") {
    return options.action === "write" ? "installed" : options.action;
  }

  return "ok";
}
