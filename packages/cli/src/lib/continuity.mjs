import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { rel, writeProjectFile } from "./project-config.mjs";
import { gatherRepoContext } from "./repo-context.mjs";

export const TEMPER_SESSION_MARKER = "TEMPER_SESSION";

export function buildContinuityContract(options = {}) {
  const projectRoot = path.resolve(options.projectRoot ?? process.cwd());
  const repo = gatherRepoContext({ cwd: projectRoot });
  const projectName = options.config?.name || path.basename(projectRoot);

  return {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    project: {
      name: projectName,
      root: projectRoot
    },
    session_file: "SESSION.md",
    session_data_file: ".temper/workflow/session.json",
    handoff_pattern: "HANDOFF_<slug>.md",
    handoff_template_file: ".temper/workflow/HANDOFF_TEMPLATE.md",
    token_strategy: [
      "Read the Temper-managed session block in SESSION.md first.",
      "Read the relevant HANDOFF_<slug>.md before relying on chat history.",
      "Keep the session board short and point to handoff docs for detail."
    ],
    handoff_command: `${temperCommand(options.config?.package_manager || options.analysis?.package_manager || "npm")} handoff --cwd . --slug <slug> --summary "<summary>" --next "<next step>"`,
    current_branch: repo.available ? repo.branch : "unknown"
  };
}

export function planContinuityInstall(options = {}) {
  const projectRoot = path.resolve(options.projectRoot ?? process.cwd());
  const contract = buildContinuityContract(options);
  const sessionState = buildInitialSessionState({
    projectRoot,
    contract,
    onboarding: options.onboarding
  });
  const files = [
    planGeneratedFile(projectRoot, ".temper/workflow/continuity.json", JSON.stringify(contract, null, 2) + "\n"),
    planGeneratedFile(projectRoot, ".temper/workflow/session.json", JSON.stringify(sessionState, null, 2) + "\n"),
    planGeneratedFile(projectRoot, ".temper/workflow/HANDOFF_TEMPLATE.md", renderHandoffTemplate(contract)),
    planGeneratedFile(projectRoot, "SESSION.md", renderSessionDocument(projectRoot, sessionState))
  ];

  return {
    contract,
    sessionState,
    files
  };
}

export function materializeContinuityInstall(options = {}) {
  const projectRoot = path.resolve(options.projectRoot ?? process.cwd());
  const plan = planContinuityInstall(options);
  const written = [];

  for (const file of plan.files) {
    if (file.action === "unchanged") {
      continue;
    }
    written.push(writeProjectFile(projectRoot, file.relativePath, file.content));
  }

  return {
    contract: plan.contract,
    sessionState: plan.sessionState,
    written: written.map((filePath) => rel(projectRoot, filePath))
  };
}

export function buildHandoffPlan(options = {}) {
  const projectRoot = path.resolve(options.projectRoot ?? options.cwd ?? process.cwd());
  const repo = gatherRepoContext({ cwd: projectRoot });
  const contract = buildContinuityContract({
    projectRoot,
    config: options.config,
    analysis: options.analysis
  });
  const slug = sanitizeSlug(options.slug || inferSlug(repo.branch || path.basename(projectRoot)));
  const title = options.title?.trim() || slug.replace(/-/g, " ");
  const nextSteps = normalizeList(options.next);
  const summary = options.summary?.trim() || "Continue from the current branch state.";
  const status = options.status?.trim() || (repo.isDirty ? "in_progress_dirty" : "ready_to_resume");
  const deployState = options.deployState?.trim() || "local only";
  const notes = options.notes?.trim() || "";
  const handoffPath = `HANDOFF_${slug}.md`;
  const handoffContent = renderHandoffDocument({
    title,
    slug,
    summary,
    nextSteps,
    notes,
    status,
    deployState,
    projectRoot,
    repo,
    handoffPath
  });

  const sessionStatePath = path.join(projectRoot, ".temper", "workflow", "session.json");
  const existingSessionState = loadSessionState(sessionStatePath);
  const sessionState = upsertSessionEntry(existingSessionState, {
    workstream: slug,
    branch: repo.branch || "unknown",
    status,
    next: nextSteps[0] || summary,
    handoff: handoffPath,
    updated_at: new Date().toISOString()
  });
  const sessionContent = renderSessionDocument(projectRoot, sessionState);

  return {
    projectRoot,
    slug,
    handoffPath,
    handoffContent,
    sessionState,
    sessionContent,
    summary,
    nextSteps,
    status,
    deployState,
    repo
  };
}

export function applyHandoffPlan(plan) {
  const projectRoot = path.resolve(plan.projectRoot);
  const handoffAbsolutePath = writeProjectFile(projectRoot, plan.handoffPath, plan.handoffContent);
  const sessionStatePath = writeProjectFile(
    projectRoot,
    ".temper/workflow/session.json",
    JSON.stringify(plan.sessionState, null, 2) + "\n"
  );
  const sessionPath = writeProjectFile(projectRoot, "SESSION.md", plan.sessionContent);

  return {
    projectRoot,
    handoffPath: handoffAbsolutePath,
    sessionStatePath,
    sessionPath
  };
}

export function renderHandoffPreview(plan) {
  const lines = [
    "## Handoff Preview",
    `- workstream: ${plan.slug}`,
    `- branch: ${plan.repo.branch || "unknown"}`,
    `- handoff file: ${plan.handoffPath}`,
    "",
    "## Session Update",
    ...asBulletLines([
      `status: ${plan.status}`,
      `next: ${plan.nextSteps[0] || plan.summary}`,
      `SESSION.md will point to ${plan.handoffPath}`
    ]),
    "",
    plan.handoffContent.trim()
  ];

  return lines.join("\n") + "\n";
}

export function collectContinuityRemovalChanges(projectRoot) {
  const changes = [];
  const sessionPath = path.join(projectRoot, "SESSION.md");
  if (fs.existsSync(sessionPath)) {
    const existing = fs.readFileSync(sessionPath, "utf8");
    const next = removeMarkedBlock(existing, TEMPER_SESSION_MARKER);
    if (next !== existing) {
      changes.push({
        path: "SESSION.md",
        action: "update_file",
        content: next
      });
    }
  }
  return changes;
}

function buildInitialSessionState({ projectRoot, contract, onboarding }) {
  const repo = gatherRepoContext({ cwd: projectRoot });
  const next = onboarding?.recommendations?.[0]?.title || "Run `temper handoff` when leaving this workstream.";

  return upsertSessionEntry(
    {
      schema_version: 1,
      generated_at: new Date().toISOString(),
      entries: []
    },
    {
      workstream: inferSlug(repo.branch || path.basename(projectRoot)),
      branch: repo.branch || "unknown",
      status: "active",
      next,
      handoff: "none",
      updated_at: new Date().toISOString()
    }
  );
}

function renderHandoffTemplate(contract) {
  return `# Handoff — <workstream>

## Restart Point

- branch: \`<branch>\`
- status: \`<clean|dirty>\`
- root: \`<repo root>\`

## What Changed

<one concise paragraph>

## Next Steps

1. <next step>
2. <next step>

## Deploy / Environment State

- local / beta / prod: <state>

## Notes

<anything surprising or easy to miss>

Generated by Temper. Preferred command:

- \`${contract.handoff_command}\`
`;
}

function renderHandoffDocument({ title, slug, summary, nextSteps, notes, status, deployState, projectRoot, repo, handoffPath }) {
  const latestCommit = readLatestCommit(projectRoot);
  const changedFiles = repo.changedFiles.slice(0, 12).join(", ") || "none";
  return `# Handoff — ${title}

## Restart Point

- workstream: \`${slug}\`
- branch: \`${repo.branch || "unknown"}\`
- head: \`${latestCommit}\`
- root: \`${projectRoot}\`
- status: \`${status}\`
- handoff: \`${handoffPath}\`

## What Changed

${summary}

## Current State

- repo: ${repo.available ? (repo.isDirty ? "dirty" : "clean") : "not-git-repo"}
- changed files: ${changedFiles}
- deploy state: ${deployState}

## Next Steps

${renderNumbered(nextSteps.length > 0 ? nextSteps : ["Resume from the current repo state and tighten the next concrete step."])}

## Notes

${notes || "none"}
`;
}

function renderSessionDocument(projectRoot, sessionState) {
  const block = renderSessionBlock(sessionState);
  const sessionPath = path.join(projectRoot, "SESSION.md");
  const existing = fs.existsSync(sessionPath) ? fs.readFileSync(sessionPath, "utf8") : "# Session\n";
  return upsertMarkedBlock(existing, TEMPER_SESSION_MARKER, block);
}

function renderSessionBlock(sessionState) {
  const lines = [
    "## Temper Session",
    "",
    `Updated: ${new Date().toISOString().slice(0, 10)}`,
    "",
    "| Workstream | Branch | Status | Next | Handoff | Updated |",
    "|---|---|---|---|---|---|"
  ];

  for (const entry of sessionState.entries) {
    lines.push(
      `| ${escapeCell(entry.workstream)} | ${escapeCell(entry.branch)} | ${escapeCell(entry.status)} | ${escapeCell(entry.next)} | ${escapeCell(entry.handoff)} | ${escapeCell(entry.updated_at.slice(0, 10))} |`
    );
  }

  return lines.join("\n");
}

function upsertSessionEntry(sessionState, entry) {
  const existing = Array.isArray(sessionState?.entries) ? sessionState.entries : [];
  const nextEntries = existing.filter((item) => item.workstream !== entry.workstream && item.branch !== entry.branch);
  nextEntries.unshift(entry);

  return {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    entries: nextEntries.slice(0, 8)
  };
}

function loadSessionState(filePath) {
  if (!fs.existsSync(filePath)) {
    return {
      schema_version: 1,
      generated_at: new Date().toISOString(),
      entries: []
    };
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return {
      schema_version: 1,
      generated_at: parsed.generated_at || new Date().toISOString(),
      entries: Array.isArray(parsed.entries) ? parsed.entries : []
    };
  } catch {
    return {
      schema_version: 1,
      generated_at: new Date().toISOString(),
      entries: []
    };
  }
}

function planGeneratedFile(projectRoot, relativePath, content) {
  const filePath = path.join(projectRoot, relativePath);
  return {
    path: filePath,
    relativePath,
    action: classifyFileAction(filePath, content),
    content
  };
}

function classifyFileAction(filePath, content) {
  if (!fs.existsSync(filePath)) {
    return "create";
  }
  return fs.readFileSync(filePath, "utf8") === content ? "unchanged" : "update";
}

function upsertMarkedBlock(content, marker, body) {
  const start = `<!-- ${marker}:BEGIN -->`;
  const end = `<!-- ${marker}:END -->`;
  const block = `${start}\n${body.trimEnd()}\n${end}`;
  const pattern = new RegExp(`${escapeRegExp(start)}[\\s\\S]*?${escapeRegExp(end)}\\n?`, "m");

  if (pattern.test(content)) {
    return content.replace(pattern, `${block}\n`);
  }

  const separator = content.endsWith("\n\n") ? "" : content.endsWith("\n") ? "\n" : "\n\n";
  return `${content}${separator}${block}\n`;
}

function removeMarkedBlock(content, marker) {
  const start = `<!-- ${marker}:BEGIN -->`;
  const end = `<!-- ${marker}:END -->`;
  const pattern = new RegExp(`\\n?${escapeRegExp(start)}[\\s\\S]*?${escapeRegExp(end)}\\n?`, "m");
  if (!pattern.test(content)) {
    return content;
  }
  const stripped = content.replace(pattern, "\n").replace(/\n{3,}/g, "\n\n");
  return stripped.endsWith("\n") ? stripped : `${stripped}\n`;
}

function readLatestCommit(projectRoot) {
  const repo = gatherRepoContext({ cwd: projectRoot });
  if (!repo.available) {
    return "unknown";
  }
  try {
    return execFileSync("git", ["-C", projectRoot, "rev-parse", "--short=12", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim();
  } catch {
    return "unknown";
  }
}

function inferSlug(input) {
  return String(input || "workstream")
    .split("/")
    .at(-1)
    .trim();
}

function sanitizeSlug(input) {
  return String(input || "workstream")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "workstream";
}

function normalizeList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (!value) {
    return [];
  }
  return String(value)
    .split(/\s*\|\s*|,\s*/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function renderNumbered(items) {
  return items.map((item, index) => `${index + 1}. ${item}`).join("\n");
}

function escapeCell(value) {
  return String(value || "").replace(/\|/g, "\\|");
}

function temperCommand(packageManager) {
  switch (packageManager) {
    case "pnpm":
      return "pnpm exec temper";
    case "yarn":
      return "yarn temper";
    case "bun":
      return "bunx temper";
    case "npm":
    default:
      return "npx temper";
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function asBulletLines(items) {
  if (items.length === 0) {
    return ["- none"];
  }
  return items.map((item) => `- ${item}`);
}
