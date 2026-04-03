import path from "node:path";

export function buildAssistantContract(options) {
  const projectRoot = path.resolve(options.projectRoot);
  const config = options.config;
  const analysis = options.analysis;
  const runtime = {
    command: temperCommand(config?.package_manager || analysis?.package_manager || "npm"),
    cwd: "."
  };
  const executionPolicy = buildExecutionPolicySummary(config);
  const resurfacing = buildResurfacing(config, options.onboarding);
  const continuity = buildContinuitySummary(runtime.command);

  return {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    project: {
      name: config.name,
      root: projectRoot,
      family: analysis.family.id,
      stack: analysis.stack.id,
      package_manager: config.package_manager || analysis.package_manager || "unknown"
    },
    contract_files: [
      "temper.config.json",
      ".temper/assistants/shared-canon.json",
      ".temper/assistants/shared-canon.md",
      ".temper/assistants/README.md"
    ],
    runtime,
    defaults: [
      "Treat Temper as the operating layer for this repo.",
      "Fetch doctrine and routing before major design or release guidance.",
      "Use ship lite for narrow implementation confidence.",
      "Use ship full for player-facing, infra, economy, security, or multi-system work."
    ],
    capabilities: buildCapabilities(runtime.command),
    execution_policy: executionPolicy,
    continuity,
    workflow_memory: options.onboarding?.memory ?? config.onboarding?.memory ?? null,
    resurfacing
  };
}

export function renderSharedCanonMarkdown(contract) {
  const lines = [
    "# Temper Shared Canon",
    "",
    `- Project: \`${contract.project.name}\``,
    `- Root: \`${contract.project.root}\``,
    `- Family: \`${contract.project.family}\``,
    `- Stack: \`${contract.project.stack}\``,
    `- Runtime: \`${contract.runtime.command}\``,
    "",
    "## Defaults",
    ...asBulletLines(contract.defaults),
    "",
    "## Capabilities"
  ];

  for (const capability of contract.capabilities) {
    lines.push(`- \`${capability.id}\`: ${capability.when}`);
    lines.push(`- command: \`${capability.command}\``);
    lines.push(`- result: ${capability.result}`);
  }

  lines.push("", "## Execution Policy");
  lines.push(...asBulletLines(renderExecutionPolicyLines(contract.execution_policy)));

  lines.push("", "## Continuity");
  lines.push(...asBulletLines(renderContinuityLines(contract.continuity)));

  if (contract.workflow_memory) {
    lines.push("", "## Workflow Memory");
    lines.push(...asBulletLines(renderWorkflowMemoryLines(contract.workflow_memory)));
  }

  lines.push("", "## Resurfacing");
  lines.push(...asBulletLines(contract.resurfacing.map((item) => item.message)));

  return lines.join("\n") + "\n";
}

export function renderAssistantReadme(contract) {
  return `# Temper Assistant Surfaces

Temper is installed for \`${contract.project.name}\`.

- Project root: \`.\`
- Family: \`${contract.project.family}\`
- Stack: \`${contract.project.stack}\`
- Runtime: \`${contract.runtime.command}\`
- Shared canon: \`.temper/assistants/shared-canon.json\`

## Core Commands

${contract.capabilities.map((item) => `- \`${item.command}\``).join("\n")}

## Continuity

- Session board: \`${contract.continuity.session_file}\`
- Handoff pattern: \`${contract.continuity.handoff_pattern}\`
- Preferred handoff command: \`${contract.continuity.handoff_command}\`

If \`${contract.runtime.command}\` is unavailable, install Temper into this repo from GitHub first, then rerun the command from the repo root.

## Runtime Rule

Read \`.temper/assistants/shared-canon.json\` first, then adapt it to the current assistant surface instead of inventing repo policy from scratch.
`;
}

export function renderClaudeGuide(contract) {
  return `# Temper For Claude

Use Temper as the canonical operating layer for this repo.

## Defaults

- repo root: \`${contract.project.root}\`
- family: \`${contract.project.family}\`
- stack: \`${contract.project.stack}\`
- runtime: \`${contract.runtime.command}\`
- shared canon: \`.temper/assistants/shared-canon.json\`
- session board: \`${contract.continuity.session_file}\`

## Claude Workflow

1. Read \`.temper/assistants/shared-canon.json\` — this is the operating contract for this project
2. Run the relevant Temper capability at the right moment (see triggers below)
3. Synthesize Temper's output into your response — do not dump it verbatim

## When to Use Each Command

${contract.capabilities.map((item) => `**${item.when}**\n\`${item.command}\``).join("\n\n")}

## Onboarding

When a user asks to onboard, set up, or configure this repo with Temper:

1. Run: \`${contract.runtime.command} onboard existing --cwd .\`
2. Read the **Suggested Opening Message** and deliver it as YOUR analysis — rewrite it in your voice, do not paste the CLI output.
3. When you hit a STOP marker, STOP. Do not run the next command. Do not preview what comes next. Do not offer to skip ahead. Deliver what is above the STOP line and wait.
4. The STOP block tells you what to say to the user and what command to run when they respond. Follow it exactly.
5. Do not summarize or abbreviate the analysis findings. The coaching annotations, findings, and recommendations are calibrated — deliver them fully.
6. Do not offer alternatives the user did not ask about. If the STOP block says "say \`next\`", that is the prompt. Do not add "or we could skip to..." or "alternatively..."
7. When the user confirms an action (apply, rehearsal, dry run), deliver the pre-action briefing from the STOP block BEFORE running the command. Then run it.
8. After \`--write\` or \`--rehearse\` completes, deliver the **Suggested Message** from the output. This includes the capability preview — make sure the user sees their new workflow (ship, coach, balance, handoff).

## Advisor Voices in Conversation

During design and build conversations, surface advisor voices naturally — not just on coach invocation:

- 1 voice is enough. 2 max if there are genuinely different perspectives worth hearing.
- Keep each to one line: \`✨ Miyamoto: [specific take on this decision]\`
- End with an invitation: "Want to dig into [topic] further?"
- Trigger on architecture choices, mechanic design, UX pivots, and feature tradeoffs — not every turn
- Use the doctrine from the coach output as the source. Don't invent opinions.

## Continuity

- read \`${contract.continuity.session_file}\` first
- when leaving a workstream, run \`${contract.continuity.handoff_command}\`
- prefer the relevant \`HANDOFF_<slug>.md\` over chat history for restart context

## Resurfacing

${contract.resurfacing.map((item) => `- ${item.message}`).join("\n")}
`;
}

export function renderCodexGuide(contract) {
  return `# Temper For Codex

Temper is installed as the operating layer for this repo.

## Defaults

- repo root: \`${contract.project.root}\`
- family: \`${contract.project.family}\`
- stack: \`${contract.project.stack}\`
- runtime: \`${contract.runtime.command}\`
- shared canon: \`.temper/assistants/shared-canon.json\`
- session board: \`${contract.continuity.session_file}\`

## Codex Workflow

- read \`.temper/assistants/shared-canon.json\` before major design or release guidance
- use the shared canon as the source of truth and render Claude/Codex-specific behavior from it
- keep repo-local policy in \`temper.config.json\` and \`.temper/assistants/shared-canon.json\`

## Capability Defaults

${contract.capabilities.map((item) => `- ${item.when}: \`${item.command}\``).join("\n")}

## Continuity

- read \`${contract.continuity.session_file}\` before assuming current workstream state
- use \`${contract.continuity.handoff_command}\` when handing off or pausing a branch
- keep handoff detail in \`HANDOFF_<slug>.md\` and keep \`SESSION.md\` short

## Resurfacing

${contract.resurfacing.map((item) => `- ${item.message}`).join("\n")}
`;
}

export function renderClaudeCommand(command, contract) {
  const commandInfo = commandSpec(command, contract);
  return `${commandInfo.instructions}\n\nProject: \`${contract.project.name}\`\nShared canon: \`.temper/assistants/shared-canon.json\`\n`;
}

export function renderWorkflowHookBlock(contract) {
  const coach = contract.capabilities.find((item) => item.id === "coach");
  const shipLite = contract.capabilities.find((item) => item.id === "ship_lite");
  const shipFull = contract.capabilities.find((item) => item.id === "ship_full");
  const lines = [
    "## Temper",
    "",
    "Temper is installed as the operating layer for this repo.",
    "",
    `- Read \`.temper/assistants/shared-canon.json\` before major design or release guidance.`,
    `- Use \`${coach.command}\` before major design, balance, UX, infra, security, or release guidance.`,
    `- Use \`${shipLite.command}\` for narrow implementation confidence.`,
    `- Use \`${shipFull.command}\` for player-facing, infra, economy, security, or multi-system work.`,
    `- Read \`${contract.continuity.session_file}\` first and use \`${contract.continuity.handoff_command}\` when leaving a workstream.`,
    `- Treat \`temper.config.json\`, \`.temper/assistants/shared-canon.json\`, and \`.temper/assistants/*.md\` as the local Temper operating contract.`
  ];

  const fullPolicy = contract.execution_policy.modes.full;
  if (fullPolicy.gated.length > 0) {
    lines.push(
      `- Promote gated ${fullPolicy.mode} steps explicitly with \`${contract.runtime.command} ship full --cwd . --promote <step>\` when you intend to run them.`
    );
  }

  return lines.join("\n");
}

function buildCapabilities(runtimeCommand) {
  return [
    {
      id: "coach",
      when: "before designing a new system, feature, or data model — run this first, not after",
      command: `${runtimeCommand} coach --cwd . --json --intent "<what you're designing>"`,
      result: "fetch doctrine and routing before you answer"
    },
    {
      id: "ship_lite",
      when: "after the first working version of a feature is done — before moving to the next thing",
      command: `${runtimeCommand} ship lite --cwd . --intent "<what you just built>"`,
      result: "run the default low-risk ship path"
    },
    {
      id: "ship_full",
      when: "before sharing with anyone, or when touching player-facing, economy, or multi-system code",
      command: `${runtimeCommand} ship full --cwd . --intent "<summary>"`,
      result: "run the deeper blessed ship path and surface any gated follow-ups"
    },
    {
      id: "hotfix",
      when: "something is broken in a live environment and you need a recovery plan",
      command: `${runtimeCommand} hotfix --cwd . --json --env prod --intent "<what broke>"`,
      result: "route the response through the hotfix doctrine surface"
    },
    {
      id: "handoff",
      when: "ending a session, switching to a different workstream, or handing work to another agent",
      command: `${runtimeCommand} handoff --cwd . --slug <slug> --summary "<summary>" --next "<next step>"`,
      result: "write a canonical restart artifact and update SESSION.md"
    }
  ];
}

function buildContinuitySummary(runtimeCommand) {
  return {
    session_file: "SESSION.md",
    handoff_pattern: "HANDOFF_<slug>.md",
    handoff_command: `${runtimeCommand} handoff --cwd . --slug <slug> --summary "<summary>" --next "<next step>"`,
    token_strategy: [
      "Read SESSION.md first for the active board.",
      "Read the relevant HANDOFF_<slug>.md for restart detail.",
      "Keep the session board short and push detail into handoffs."
    ]
  };
}

function buildExecutionPolicySummary(config) {
  const policy = config.execution_policy ?? {};
  const lifecycle = policy.lifecycle ?? {};
  const shipModes = lifecycle.ship_modes ?? {};

  return {
    stages: lifecycle.stages ?? ["discovered", "recommended", "blessed", "gated"],
    promote_command: lifecycle.promote_command ?? `${temperCommand(config.package_manager)} ship <lite|full> --promote <step>`,
    confirmation_rules: lifecycle.confirmation_rules ?? [],
    modes: {
      lite: normalizeModePolicy("lite", shipModes.lite, config.ship?.lite),
      full: normalizeModePolicy("full", shipModes.full, config.ship?.full)
    }
  };
}

function normalizeModePolicy(mode, lifecycleMode, shipMode) {
  return {
    mode,
    discovered: lifecycleMode?.discovered_steps ?? dedupe([...(shipMode?.steps ?? []), ...(shipMode?.gated_steps ?? [])]),
    recommended: lifecycleMode?.recommended_steps ?? dedupe([...(shipMode?.steps ?? []), ...(shipMode?.gated_steps ?? [])]),
    blessed: lifecycleMode?.blessed_steps ?? shipMode?.steps ?? [],
    gated: lifecycleMode?.gated_steps ?? shipMode?.gated_steps ?? [],
    prod_confirmation: lifecycleMode?.prod_confirmation_steps ?? [],
    notes: lifecycleMode?.notes ?? []
  };
}

function buildResurfacing(config, onboarding) {
  const signals = onboarding?.resurfacing ?? config.onboarding?.resurfacing ?? [];
  if (signals.length > 0) {
    return signals;
  }

  return [
    {
      id: "shared-canon-first",
      phase: "always",
      priority: "medium",
      message: "Read `.temper/assistants/shared-canon.json` before adapting workflow guidance to Claude or Codex."
    }
  ];
}

function commandSpec(command, contract) {
  const runtime = contract.runtime.command;
  const map = {
    ship: {
      instructions: `Use Temper's shipping pipeline for this repo.\n\n1. Read \`.temper/assistants/shared-canon.json\`.\n2. Decide whether the work is \`lite\` or \`full\`.\n3. From the repo root, run \`${runtime} ship <lite|full> --cwd . --intent "<summary>"\`.\n4. Use the output as the operating baseline for your next response.\n\nDefault to \`full\` for player-facing, infra, economy, security, deploy, or multi-system changes.`
    },
    hotfix: {
      instructions: `Use Temper's hotfix operating mode for this repo.\n\n1. Read \`.temper/assistants/shared-canon.json\`.\n2. From the repo root, run \`${runtime} hotfix --cwd . --json --env prod --intent "<incident summary>"\`.\n3. Ground your response in the returned doctrine and call out the narrowest safe fix path.`
    },
    ux: {
      instructions: `Use Temper's UX routing for this repo.\n\n1. Read \`.temper/assistants/shared-canon.json\`.\n2. From the repo root, run \`${runtime} ux --cwd . --intent "<ux topic>"\`.\n3. Treat the first five minutes, readability, friction, and player trust as the core review surface.`
    },
    balance: {
      instructions: `Use Temper's balance routing for this repo.\n\n1. Read \`.temper/assistants/shared-canon.json\`.\n2. From the repo root, run \`${runtime} balance --cwd . --intent "<balance topic>"\`.\n3. Use the selected hats and architecture family as the grounding for the response.`
    },
    security: {
      instructions: `Use Temper's security routing for this repo.\n\n1. Read \`.temper/assistants/shared-canon.json\`.\n2. From the repo root, run \`${runtime} security --cwd . --intent "<security concern>"\`.\n3. Call out trust boundaries, exploit surfaces, and blast radius clearly.`
    },
    infra: {
      instructions: `Use Temper's infra routing for this repo.\n\n1. Read \`.temper/assistants/shared-canon.json\`.\n2. From the repo root, run \`${runtime} infra --cwd . --intent "<infra change>"\`.\n3. Stay concrete about target environment, rollback, and service identity.`
    },
    coach: {
      instructions: `Use Temper's doctrine router for this repo.\n\n1. Read \`.temper/assistants/shared-canon.json\`.\n2. From the repo root, run \`${runtime} coach --cwd . --json --intent "<user intent>"\`.\n3. Use the returned packet as grounding for hat-based feedback.`
    }
  };

  return map[command];
}

function renderExecutionPolicyLines(policy) {
  const lines = [
    `stages: ${policy.stages.join(" -> ")}`,
    `promotion command: ${policy.promote_command}`
  ];

  for (const mode of [policy.modes.lite, policy.modes.full]) {
    lines.push(`${mode.mode} discovered: ${mode.discovered.join(", ") || "none"}`);
    lines.push(`${mode.mode} blessed default: ${mode.blessed.join(", ") || "none"}`);
    lines.push(`${mode.mode} gated: ${mode.gated.join(", ") || "none"}`);
    if (mode.prod_confirmation.length > 0) {
      lines.push(`${mode.mode} prod confirmation: ${mode.prod_confirmation.join(", ")}`);
    }
  }

  return [...lines, ...policy.confirmation_rules];
}

function renderWorkflowMemoryLines(memory) {
  const lines = [];
  if (memory.release_pattern) {
    lines.push(`release pattern: ${memory.release_pattern}`);
  }
  if (memory.continuity_pattern) {
    lines.push(`continuity pattern: ${memory.continuity_pattern}`);
  }
  if (memory.recurring_failure_modes?.length > 0) {
    lines.push(`recurring failure modes: ${memory.recurring_failure_modes.join("; ")}`);
  }
  if (memory.recent_signals?.length > 0) {
    lines.push(`recent signals: ${memory.recent_signals.join("; ")}`);
  }
  return lines.length > 0 ? lines : ["no workflow memory captured yet"];
}

function renderContinuityLines(continuity) {
  return [
    `session file: ${continuity.session_file}`,
    `handoff pattern: ${continuity.handoff_pattern}`,
    `handoff command: ${continuity.handoff_command}`,
    ...continuity.token_strategy
  ];
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

function dedupe(items) {
  return [...new Set(items.filter(Boolean))];
}

function asBulletLines(items) {
  if (items.length === 0) {
    return ["- none"];
  }
  return items.map((item) => `- ${item}`);
}
