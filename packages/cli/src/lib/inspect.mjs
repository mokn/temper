import fs from "node:fs";
import path from "node:path";
import { findProjectRoot, loadProjectConfig, rel } from "./project-config.mjs";
import { gatherRepoContext } from "./repo-context.mjs";
import { listRunArtifacts } from "./run-artifacts.mjs";

export function buildInspectReport(options = {}) {
  const projectRoot = findProjectRoot(options.cwd ?? process.cwd());
  const config = loadProjectConfig({ cwd: projectRoot, required: false });
  const repo = gatherRepoContext({ cwd: projectRoot });
  const recentRuns = listRunArtifacts({ cwd: projectRoot, limit: 5 });
  const sessionPath = repo.workflowFiles?.session || path.join(projectRoot, "SESSION.md");

  return {
    schema_version: 1,
    type: "temper.inspect.report",
    generated_at: new Date().toISOString(),
    project: {
      root: projectRoot,
      name: config?.name || path.basename(projectRoot),
      family: config?.family || null,
      stack: config?.stack?.id || null,
      package_manager: config?.package_manager || null
    },
    config: {
      present: Boolean(config),
      path: config ? rel(projectRoot, config.__filePath) : null
    },
    repo: {
      available: repo.available,
      branch: repo.branch || "unknown",
      dirty: repo.isDirty || false,
      counts: repo.counts ?? {
        changed: 0,
        staged: 0,
        unstaged: 0,
        untracked: 0
      },
      changed_files: repo.changedFiles ?? []
    },
    assistants: {
      shared_canon_json: inspectFile(projectRoot, ".temper/assistants/shared-canon.json"),
      shared_canon_markdown: inspectFile(projectRoot, ".temper/assistants/shared-canon.md"),
      codex_guide: inspectFile(projectRoot, ".temper/assistants/codex.md"),
      claude_guide: inspectFile(projectRoot, ".temper/assistants/claude.md"),
      assistant_readme: inspectFile(projectRoot, ".temper/assistants/README.md")
    },
    continuity: {
      session_file: {
        present: fs.existsSync(sessionPath),
        path: rel(projectRoot, sessionPath)
      },
      workflow_files: {
        continuity_json: inspectFile(projectRoot, ".temper/workflow/continuity.json"),
        session_json: inspectFile(projectRoot, ".temper/workflow/session.json"),
        handoff_template: inspectFile(projectRoot, ".temper/workflow/HANDOFF_TEMPLATE.md")
      },
      handoff_count: repo.workflowFiles?.handoffs?.length ?? 0,
      recent_handoffs: (repo.workflowFiles?.handoffs ?? []).slice(-5).map((filePath) => rel(projectRoot, filePath))
    },
    execution_policy: summarizeExecutionPolicy(config),
    runs: {
      count: listRunArtifacts({ cwd: projectRoot }).length,
      latest: recentRuns.map((item) => ({
        run_id: item.run_id,
        recorded_at: item.recorded_at,
        command: item.command,
        action: item.action,
        status: item.summary?.status || "unknown",
        relative_path: item.relative_path
      }))
    }
  };
}

function summarizeExecutionPolicy(config) {
  const lifecycle = config?.execution_policy?.lifecycle;
  if (!lifecycle) {
    return null;
  }

  return {
    stages: lifecycle.stages ?? [],
    promote_command: lifecycle.promote_command ?? null,
    lite: {
      blessed: config?.ship?.lite?.steps ?? [],
      gated: config?.ship?.lite?.gated_steps ?? []
    },
    full: {
      blessed: config?.ship?.full?.steps ?? [],
      gated: config?.ship?.full?.gated_steps ?? []
    }
  };
}

function inspectFile(projectRoot, relativePath) {
  const filePath = path.join(projectRoot, relativePath);
  return {
    present: fs.existsSync(filePath),
    path: relativePath
  };
}
