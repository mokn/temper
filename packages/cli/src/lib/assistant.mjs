import fs from "node:fs";
import path from "node:path";
import { ensureTemperDir, rel, writeProjectFile } from "./project-config.mjs";

export const TEMPER_RUNTIME_MARKER = "TEMPER_RUNTIME";

export function installAssistantAdapters(options) {
  const projectRoot = path.resolve(options.projectRoot);
  const config = options.config;
  const analysis = options.analysis;
  const assistants = normalizeAssistants(options.assistants);
  const runtime = buildRuntime(config, analysis);
  const written = [];

  ensureTemperDir(projectRoot);

  written.push(
    writeProjectFile(
      projectRoot,
      ".temper/assistants/README.md",
      renderAssistantReadme(projectRoot, config, analysis, runtime)
    )
  );

  if (assistants.includes("claude")) {
    written.push(
      writeProjectFile(
        projectRoot,
        ".temper/assistants/claude.md",
        renderClaudeGuide(projectRoot, config, analysis, runtime)
      )
    );
    for (const command of ["ship", "hotfix", "ux", "balance", "security", "infra", "coach"]) {
      written.push(
        writeProjectFile(
          projectRoot,
          `.claude/commands/temper-${command}.md`,
          renderClaudeCommand(projectRoot, command, config, runtime)
        )
      );
    }
  }

  if (assistants.includes("codex")) {
    written.push(
      writeProjectFile(
        projectRoot,
        ".temper/assistants/codex.md",
        renderCodexGuide(projectRoot, config, analysis, runtime)
      )
    );
  }

  written.push(...installWorkflowHooks(projectRoot, runtime));

  return written.map((filePath) => rel(projectRoot, filePath));
}

export function renderAssistantReadme(projectRoot, config, analysis, runtime) {
  const relativeRoot = rel(projectRoot, projectRoot);
  return `# Temper Assistant Surfaces

Temper is installed for \`${config.name}\`.

- Project root: \`${relativeRoot}\`
- Family: \`${analysis.family.id}\`
- Stack: \`${analysis.stack.id}\`
- Runtime: \`${runtime.command}\`

## Core Commands

- From the repo root, run \`${runtime.command} doctor --cwd .\`
- \`${runtime.command} coach --cwd . --json --intent "<decision>"\`
- \`${runtime.command} ship lite --cwd . --intent "<change summary>"\`
- \`${runtime.command} ship full --cwd . --intent "<release summary>"\`
- \`${runtime.command} hotfix --cwd . --intent "<incident>" --env prod --json\`

If \`${runtime.command}\` is unavailable, install Temper into this repo from GitHub first, then rerun the command from the repo root.

## Runtime Rule

Assistants should use Temper as the operating layer:

1. call \`${runtime.command} coach --cwd . --json\` to fetch doctrine and hat routing
2. render the answer naturally for the user
3. call \`${runtime.command} ship\` when moving from planning into release confidence work

`;
}

export function renderClaudeGuide(projectRoot, config, analysis, runtime) {
  return `# Temper For Claude

Use Temper as the canonical operating layer for this repo.

## Defaults

- repo root: \`${projectRoot}\`
- family: \`${analysis.family.id}\`
- stack: \`${analysis.stack.id}\`
- runtime: \`${runtime.command}\`

## Expected Behavior

When the user is making a design, balance, UX, infra, security, or shipping decision:

1. from the repo root, run \`${runtime.command} coach --cwd . --json --intent "<user intent>"\`
2. use the selected hats and doctrine chunks as grounding
3. respond naturally in chat

When the user asks to ship:

- scoped, low-risk work: \`${runtime.command} ship lite --cwd . --intent "<summary>"\`
- player-facing, infra, economy, security, or multi-system work: \`${runtime.command} ship full --cwd . --intent "<summary>"\`

The Temper output is the operating baseline. Your response should explain the result, not replace it with generic advice.
`;
}

export function renderCodexGuide(projectRoot, config, analysis, runtime) {
  return `# Temper For Codex

Temper is installed as the operating layer for this repo.

## Defaults

- repo root: \`${projectRoot}\`
- family: \`${analysis.family.id}\`
- stack: \`${analysis.stack.id}\`
- runtime: \`${runtime.command}\`

## Codex Workflow

- from the repo root, use \`${runtime.command} coach --cwd . --json\` before major design or release guidance
- use \`${runtime.command} ship lite --cwd .\` for narrow implementation confidence
- use \`${runtime.command} ship full --cwd .\` for player-facing, infra, economy, security, or multi-system changes
- treat \`temper.config.json\` as the local operating contract

If the user references a hat directly, fetch the packet first and then render the response in natural prose.
`;
}

function renderClaudeCommand(projectRoot, command, config, runtime) {
  const commandMap = {
    ship: `Use Temper's shipping pipeline for this repo.\n\n1. Decide whether the work is \`lite\` or \`full\`.\n2. From the repo root, run \`${runtime.command} ship <lite|full> --cwd . --intent "<summary>"\`.\n3. Use the output as the operating baseline for your next response.\n\nDefault to \`full\` for player-facing, infra, economy, security, deploy, or multi-system changes.`,
    hotfix: `Use Temper's hotfix operating mode for this repo.\n\nFrom the repo root, run \`${runtime.command} hotfix --cwd . --json --env prod --intent "<incident summary>"\`.\nGround your response in the returned doctrine and call out the narrowest safe fix path.`,
    ux: `Use Temper's UX routing for this repo.\n\nFrom the repo root, run \`${runtime.command} ux --cwd . --intent "<ux topic>"\`.\nTreat the first five minutes, readability, friction, and player trust as the core review surface.`,
    balance: `Use Temper's balance routing for this repo.\n\nFrom the repo root, run \`${runtime.command} balance --cwd . --intent "<balance topic>"\`.\nUse the selected hats and architecture family as the grounding for the response.`,
    security: `Use Temper's security routing for this repo.\n\nFrom the repo root, run \`${runtime.command} security --cwd . --intent "<security concern>"\`.\nCall out trust boundaries, exploit surfaces, and blast radius clearly.`,
    infra: `Use Temper's infra routing for this repo.\n\nFrom the repo root, run \`${runtime.command} infra --cwd . --intent "<infra change>"\`.\nStay concrete about target environment, rollback, and service identity.`,
    coach: `Use Temper's doctrine router for this repo.\n\nFrom the repo root, run \`${runtime.command} coach --cwd . --json --intent "<user intent>"\`.\nUse the returned packet as grounding for hat-based feedback.`
  };

  return `${commandMap[command]}\n\nProject: \`${config.name}\`\n`;
}

function buildRuntime(config, analysis) {
  const packageManager = config?.package_manager || analysis?.package_manager || "npm";
  return {
    command: temperCommand(packageManager)
  };
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

function installWorkflowHooks(projectRoot, runtime) {
  const written = [];
  const files = ["AGENTS.md", "CLAUDE.md"]
    .map((relativePath) => path.join(projectRoot, relativePath))
    .filter((filePath) => fs.existsSync(filePath));

  for (const filePath of files) {
    const existing = fs.readFileSync(filePath, "utf8");
    const next = upsertMarkedBlock(existing, TEMPER_RUNTIME_MARKER, renderWorkflowHookBlock(runtime));
    if (next !== existing) {
      fs.writeFileSync(filePath, next);
      written.push(filePath);
    }
  }

  return written;
}

function renderWorkflowHookBlock(runtime) {
  return `## Temper

Temper is installed as the operating layer for this repo.

- From the repo root, run \`${runtime.command} coach --cwd . --json --intent "<user intent>"\` before major design, balance, UX, infra, security, or release guidance.
- Use \`${runtime.command} ship lite --cwd . --intent "<summary>"\` for narrow implementation confidence.
- Use \`${runtime.command} ship full --cwd . --intent "<summary>"\` for player-facing, infra, economy, security, or multi-system work.
- Treat \`temper.config.json\` and \`.temper/assistants/*.md\` as the local Temper operating contract.
`;
}

export function upsertMarkedBlock(content, marker, body) {
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

export function removeMarkedBlock(content, marker) {
  const start = `<!-- ${marker}:BEGIN -->`;
  const end = `<!-- ${marker}:END -->`;
  const pattern = new RegExp(`\\n?${escapeRegExp(start)}[\\s\\S]*?${escapeRegExp(end)}\\n?`, "m");
  if (!pattern.test(content)) {
    return content;
  }
  const stripped = content.replace(pattern, "\n").replace(/\n{3,}/g, "\n\n");
  return stripped.endsWith("\n") ? stripped : `${stripped}\n`;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeAssistants(assistants) {
  const requested = (assistants ?? ["claude", "codex"]).map((item) => item.toLowerCase());
  if (requested.includes("all")) {
    return ["claude", "codex"];
  }
  return [...new Set(requested)];
}
