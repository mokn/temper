import path from "node:path";
import { ensureTemperDir, rel, writeProjectFile } from "./project-config.mjs";

export function installAssistantAdapters(options) {
  const projectRoot = path.resolve(options.projectRoot);
  const config = options.config;
  const analysis = options.analysis;
  const assistants = normalizeAssistants(options.assistants);
  const written = [];

  ensureTemperDir(projectRoot);

  written.push(
    writeProjectFile(projectRoot, ".temper/assistants/README.md", renderAssistantReadme(projectRoot, config, analysis))
  );

  if (assistants.includes("claude")) {
    written.push(
      writeProjectFile(projectRoot, ".temper/assistants/claude.md", renderClaudeGuide(projectRoot, config, analysis))
    );
    for (const command of ["ship", "hotfix", "ux", "balance", "security", "infra", "coach"]) {
      written.push(
        writeProjectFile(
          projectRoot,
          `.claude/commands/temper-${command}.md`,
          renderClaudeCommand(projectRoot, command, config)
        )
      );
    }
  }

  if (assistants.includes("codex")) {
    written.push(
      writeProjectFile(projectRoot, ".temper/assistants/codex.md", renderCodexGuide(projectRoot, config, analysis))
    );
  }

  return written.map((filePath) => rel(projectRoot, filePath));
}

export function renderAssistantReadme(projectRoot, config, analysis) {
  const relativeRoot = rel(projectRoot, projectRoot);
  return `# Temper Assistant Surfaces

Temper is installed for \`${config.name}\`.

- Project root: \`${relativeRoot}\`
- Family: \`${analysis.family.id}\`
- Stack: \`${analysis.stack.id}\`

## Core Commands

- \`temper doctor --cwd ${projectRoot}\`
- \`temper coach --cwd ${projectRoot} --intent "<decision>"\`
- \`temper ship lite --cwd ${projectRoot} --intent "<change summary>"\`
- \`temper ship full --cwd ${projectRoot} --intent "<release summary>"\`
- \`temper hotfix --cwd ${projectRoot} --intent "<incident>" --env prod --json\`

## Runtime Rule

Assistants should use Temper as the operating layer:

1. call \`temper coach --json\` to fetch doctrine and hat routing
2. render the answer naturally for the user
3. call \`temper ship\` when moving from planning into release confidence work

`;
}

export function renderClaudeGuide(projectRoot, config, analysis) {
  return `# Temper For Claude

Use Temper as the canonical operating layer for this repo.

## Defaults

- repo root: \`${projectRoot}\`
- family: \`${analysis.family.id}\`
- stack: \`${analysis.stack.id}\`

## Expected Behavior

When the user is making a design, balance, UX, infra, security, or shipping decision:

1. run \`temper coach --cwd ${projectRoot} --json --intent "<user intent>"\`
2. use the selected hats and doctrine chunks as grounding
3. respond naturally in chat

When the user asks to ship:

- scoped, low-risk work: \`temper ship lite --cwd ${projectRoot} --intent "<summary>"\`
- player-facing, infra, economy, security, or multi-system work: \`temper ship full --cwd ${projectRoot} --intent "<summary>"\`

The Temper output is the operating baseline. Your response should explain the result, not replace it with generic advice.
`;
}

export function renderCodexGuide(projectRoot, config, analysis) {
  return `# Temper For Codex

Temper is installed as the operating layer for this repo.

## Defaults

- repo root: \`${projectRoot}\`
- family: \`${analysis.family.id}\`
- stack: \`${analysis.stack.id}\`

## Codex Workflow

- use \`temper coach --cwd ${projectRoot} --json\` before major design or release guidance
- use \`temper ship lite\` for narrow implementation confidence
- use \`temper ship full\` for player-facing, infra, economy, security, or multi-system changes
- treat \`temper.config.json\` as the local operating contract

If the user references a hat directly, fetch the packet first and then render the response in natural prose.
`;
}

function renderClaudeCommand(projectRoot, command, config) {
  const commandMap = {
    ship: `Use Temper's shipping pipeline for this repo.\n\n1. Decide whether the work is \`lite\` or \`full\`.\n2. Run \`temper ship <lite|full> --cwd ${projectRoot} --intent "<summary>"\`.\n3. Use the output as the operating baseline for your next response.\n\nDefault to \`full\` for player-facing, infra, economy, security, deploy, or multi-system changes.`,
    hotfix: `Use Temper's hotfix operating mode for this repo.\n\nRun \`temper hotfix --cwd ${projectRoot} --json --env prod --intent "<incident summary>"\`.\nGround your response in the returned doctrine and call out the narrowest safe fix path.`,
    ux: `Use Temper's UX routing for this repo.\n\nRun \`temper ux --cwd ${projectRoot} --intent "<ux topic>"\`.\nTreat the first five minutes, readability, friction, and player trust as the core review surface.`,
    balance: `Use Temper's balance routing for this repo.\n\nRun \`temper balance --cwd ${projectRoot} --intent "<balance topic>"\`.\nUse the selected hats and architecture family as the grounding for the response.`,
    security: `Use Temper's security routing for this repo.\n\nRun \`temper security --cwd ${projectRoot} --intent "<security concern>"\`.\nCall out trust boundaries, exploit surfaces, and blast radius clearly.`,
    infra: `Use Temper's infra routing for this repo.\n\nRun \`temper infra --cwd ${projectRoot} --intent "<infra change>"\`.\nStay concrete about target environment, rollback, and service identity.`,
    coach: `Use Temper's doctrine router for this repo.\n\nRun \`temper coach --cwd ${projectRoot} --json --intent "<user intent>"\`.\nUse the returned packet as grounding for hat-based feedback.`
  };

  return `${commandMap[command]}\n\nProject: \`${config.name}\`\n`;
}

function normalizeAssistants(assistants) {
  const requested = (assistants ?? ["claude", "codex"]).map((item) => item.toLowerCase());
  if (requested.includes("all")) {
    return ["claude", "codex"];
  }
  return [...new Set(requested)];
}
