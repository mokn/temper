import { execFile } from "node:child_process";
import path from "node:path";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from "@modelcontextprotocol/sdk/types.js";
import {
  buildOnboardingInterview,
  buildExistingProjectOnboarding,
  buildOnboardingInstallPreview,
  materializeOnboardingInstall
} from "../../cli/src/lib/onboarding.mjs";
import { findConfig } from "../../cli/src/lib/project-config.mjs";

const server = new Server(
  { name: "temper", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

// ---------------------------------------------------------------------------
// Onboarding stage gate — tracks which stages have been completed per cwd.
// Stages must be completed in order: show → findings → recommend → preview → apply.
// ---------------------------------------------------------------------------

const ONBOARDING_STAGES = ["show", "findings", "recommend", "preview", "apply"];
const STAGE_TOOL_MAP = {
  temper_onboard_show: "show",
  temper_onboard_findings: "findings",
  temper_onboard_recommend: "recommend",
  temper_onboard_preview: "preview",
  temper_onboard_apply: "apply"
};
const completedStages = new Map(); // cwd → Set<stage>

function requireStage(cwd, toolName) {
  const stage = STAGE_TOOL_MAP[toolName];
  if (!stage) return; // not an onboarding tool
  const stageIndex = ONBOARDING_STAGES.indexOf(stage);
  if (stageIndex === 0) return; // show is always allowed

  const completed = completedStages.get(path.resolve(cwd)) ?? new Set();
  const requiredStage = ONBOARDING_STAGES[stageIndex - 1];
  if (!completed.has(requiredStage)) {
    const requiredTool = Object.entries(STAGE_TOOL_MAP).find(([, s]) => s === requiredStage)?.[0];
    throw new Error(
      `Onboarding must proceed in order. Call ${requiredTool} first and deliver its output to the user before calling ${toolName}.`
    );
  }
}

function markStageComplete(cwd, toolName) {
  const stage = STAGE_TOOL_MAP[toolName];
  if (!stage) return;
  const resolved = path.resolve(cwd);
  if (!completedStages.has(resolved)) {
    completedStages.set(resolved, new Set());
  }
  completedStages.get(resolved).add(stage);
}

// ---------------------------------------------------------------------------
// Shell-out helper — operational tools run through the CLI binary to avoid
// stdout corruption (ship streams to process.stdout) and to pick up code
// changes immediately during development (link: installs).
// ---------------------------------------------------------------------------

const TEMPER_BIN = path.resolve(import.meta.dirname, "../../cli/bin/temper.mjs");

function runTemper(args, { timeout = 120_000 } = {}) {
  return new Promise((resolve, reject) => {
    execFile("node", [TEMPER_BIN, ...args], { timeout, maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        reject(new Error(stderr.trim() || err.message));
        return;
      }
      resolve(stdout);
    });
  });
}

// ---------------------------------------------------------------------------
// Common parameter schemas
// ---------------------------------------------------------------------------

const CWD_PARAM = {
  cwd: {
    type: "string",
    description: "Absolute path to the project root."
  }
};

const INTENT_PARAM = {
  intent: {
    type: "string",
    description: "What the user is designing, building, or asking about. Be specific."
  }
};

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------

const ONBOARDING_TOOLS = [
  {
    name: "temper_onboard_show",
    description:
      "Stage 1 of Temper onboarding. Analyzes the project and returns the opening message. " +
      "Call once when the user asks about Temper onboarding in a project that does not yet have temper.config.json. " +
      "Deliver the 'opening' field to the user in your own voice. " +
      "Do NOT call temper_onboard_findings until the user has responded.",
    inputSchema: {
      type: "object",
      properties: CWD_PARAM,
      required: ["cwd"]
    }
  },
  {
    name: "temper_onboard_findings",
    description:
      "Stage 2 of Temper onboarding. Returns the analysis findings (concerns and strengths). " +
      "Only call after the user has acknowledged the stage 1 opening. " +
      "Deliver the 'findings_message' field to the user. " +
      "Do NOT call temper_onboard_recommend until the user has acknowledged.",
    inputSchema: {
      type: "object",
      properties: CWD_PARAM,
      required: ["cwd"]
    }
  },
  {
    name: "temper_onboard_recommend",
    description:
      "Stage 3 of Temper onboarding. Returns the recommended next action for this project. " +
      "Only call after delivering stage 2 findings and the user has acknowledged. " +
      "Deliver the 'recommendation_message' field. " +
      "Do NOT call temper_onboard_preview until the user has confirmed the recommendation.",
    inputSchema: {
      type: "object",
      properties: CWD_PARAM,
      required: ["cwd"]
    }
  },
  {
    name: "temper_onboard_preview",
    description:
      "Shows exactly which files will be created or modified by the Temper install. " +
      "Only call after the user has confirmed the recommendation from stage 3. " +
      "Present the 'file_changes' list to the user. " +
      "Ask for explicit confirmation before calling temper_onboard_apply — this is the last check before files are written.",
    inputSchema: {
      type: "object",
      properties: CWD_PARAM,
      required: ["cwd"]
    }
  },
  {
    name: "temper_onboard_apply",
    description:
      "Applies the Temper install: writes temper.config.json, assistant guides, continuity files, and injects workflow hooks into AGENTS.md and CLAUDE.md. " +
      "ONLY call after the user has explicitly confirmed after seeing the preview. " +
      "This writes files to the project and cannot be undone automatically.",
    inputSchema: {
      type: "object",
      properties: {
        ...CWD_PARAM,
        name: {
          type: "string",
          description: "Optional: override the inferred project name."
        },
        betaBranch: {
          type: "string",
          description: "Optional: override the inferred beta branch name."
        },
        prodBranch: {
          type: "string",
          description: "Optional: override the inferred prod branch name."
        }
      },
      required: ["cwd"]
    }
  }
];

const OPERATIONAL_TOOLS = [
  {
    name: "temper_coach",
    description:
      "Fetch Temper doctrine and routing for a design, build, or review question. " +
      "Returns advisor hat selections, architecture family, doctrine chunks, and a render contract. " +
      "Use BEFORE answering major design, balance, UX, infra, or security questions — not after. " +
      "Set 'capability' to focus the routing: 'balance' for economy/tuning/progression, " +
      "'ux' for player-facing feel/readability/onboarding, 'infra' for deploy/ops/services, " +
      "'security' for auth/trust/exploit surfaces, 'gamify' for applying game design patterns " +
      "(progression, engagement loops, retention, mastery curves) to non-game consumer apps. " +
      "Leave capability empty for general-purpose coaching. " +
      "Ground your response in the returned doctrine chunks and hat selections. " +
      "Do NOT dump the raw packet to the user — synthesize it into actionable feedback.",
    inputSchema: {
      type: "object",
      properties: {
        ...CWD_PARAM,
        ...INTENT_PARAM,
        capability: {
          type: "string",
          enum: ["coach", "balance", "ux", "infra", "security", "gamify"],
          description:
            "Focus area for doctrine routing. Omit or set 'coach' for general-purpose routing."
        },
        files: {
          type: "array",
          items: { type: "string" },
          description: "Paths to files relevant to the question. Improves hat and family selection."
        },
        hats: {
          type: "array",
          items: { type: "string" },
          description: "Explicit advisor hats to include: kaplan, miyamoto, meier, wright, carmack."
        }
      },
      required: ["cwd", "intent"]
    },
    annotations: { readOnlyHint: true }
  },
  {
    name: "temper_hotfix",
    description:
      "Temper's incident-response doctrine router. Pre-scoped to capability=hotfix and env=prod. " +
      "Call when something is broken in a live environment and the user needs a recovery plan. " +
      "Returns doctrine focused on rollback, blast radius, narrowest safe fix, and production trust. " +
      "Ground your response in the returned doctrine. Bias toward the narrowest safe fix path. " +
      "Do NOT suggest speculative improvements — focus on stopping the bleeding.",
    inputSchema: {
      type: "object",
      properties: {
        ...CWD_PARAM,
        ...INTENT_PARAM,
        env: {
          type: "string",
          description: "Target environment. Defaults to 'prod'. Override only if the incident is in staging/beta."
        },
        files: {
          type: "array",
          items: { type: "string" },
          description: "Paths to files involved in the incident."
        }
      },
      required: ["cwd", "intent"]
    },
    annotations: { readOnlyHint: true }
  },
  {
    name: "temper_ship",
    description:
      "Run Temper's shipping pipeline: build, test, and review steps defined in temper.config.json. " +
      "Defaults to dry_run=true, which previews the plan without executing any commands. " +
      "Set dry_run=false to execute the steps (pnpm build, pnpm test, etc.). Execution may take several minutes. " +
      "Use mode='lite' for narrow implementation confidence (default). " +
      "Use mode='full' for player-facing, economy, infra, security, or multi-system changes. " +
      "The response includes execution results, patch notes, coach routing, and warnings. " +
      "Present warnings and failures clearly. Do NOT proceed past a failed step without user acknowledgment.",
    inputSchema: {
      type: "object",
      properties: {
        ...CWD_PARAM,
        mode: {
          type: "string",
          enum: ["lite", "full"],
          description: "Ship mode. 'lite' = fast default steps. 'full' = deeper blessed path with gated follow-ups."
        },
        dry_run: {
          type: "boolean",
          description: "If true (default), preview the plan without running commands. Set to false to execute."
        },
        intent: {
          type: "string",
          description: "Summary of what is being shipped. Used for coach routing and patch notes."
        },
        promote: {
          type: "array",
          items: { type: "string" },
          description: "Gated step IDs to promote into this run. Only valid for steps listed in gated_steps."
        },
        confirm_prod: {
          type: "boolean",
          description: "Required when promoting prod-sensitive gated steps. Safety gate."
        },
        env: {
          type: "string",
          description: "Override the inferred target environment (local, beta, prod)."
        }
      },
      required: ["cwd"]
    }
  },
  {
    name: "temper_handoff_preview",
    description:
      "Preview a workstream handoff: shows the HANDOFF_<slug>.md content and SESSION.md update that will be written. " +
      "Call when the user is ending a session, switching branches, or handing work to another agent. " +
      "Present the preview to the user and ask for confirmation before calling temper_handoff_apply. " +
      "Do NOT call temper_handoff_apply without user confirmation.",
    inputSchema: {
      type: "object",
      properties: {
        ...CWD_PARAM,
        slug: {
          type: "string",
          description: "Workstream identifier. Inferred from the current branch if omitted."
        },
        summary: {
          type: "string",
          description: "One-paragraph summary of what changed in this workstream."
        },
        next: {
          type: "string",
          description: "Next step(s) for whoever picks this up. Separate multiple steps with ' | '."
        },
        title: {
          type: "string",
          description: "Human-readable title for the handoff document. Defaults to slug."
        },
        status: {
          type: "string",
          description: "Workstream status: in_progress_dirty, ready_to_resume, blocked, done."
        },
        deploy_state: {
          type: "string",
          description: "Current deploy state: 'local only', 'deployed to beta', 'live in prod', etc."
        },
        notes: {
          type: "string",
          description: "Anything surprising or easy to miss about the current state."
        }
      },
      required: ["cwd"]
    },
    annotations: { readOnlyHint: true }
  },
  {
    name: "temper_handoff_apply",
    description:
      "Write the handoff files previewed by temper_handoff_preview. " +
      "Writes HANDOFF_<slug>.md, updates SESSION.md, and updates .temper/workflow/session.json. " +
      "ONLY call after the user has confirmed the preview from temper_handoff_preview. " +
      "This writes files to the project.",
    inputSchema: {
      type: "object",
      properties: {
        ...CWD_PARAM,
        slug: {
          type: "string",
          description: "Workstream identifier. Must match the slug used in temper_handoff_preview."
        },
        summary: {
          type: "string",
          description: "One-paragraph summary of what changed."
        },
        next: {
          type: "string",
          description: "Next step(s). Separate multiple steps with ' | '."
        },
        title: {
          type: "string",
          description: "Human-readable title for the handoff document."
        },
        status: {
          type: "string",
          description: "Workstream status."
        },
        deploy_state: {
          type: "string",
          description: "Current deploy state."
        },
        notes: {
          type: "string",
          description: "Anything surprising or easy to miss."
        }
      },
      required: ["cwd"]
    },
    annotations: { destructiveHint: true }
  },
  {
    name: "temper_session_show",
    description:
      "Read the current Temper session board: active workstreams, branches, statuses, and next steps. " +
      "Call at the start of a conversation to understand what the user was working on. " +
      "Read-only — does not modify any files.",
    inputSchema: {
      type: "object",
      properties: CWD_PARAM,
      required: ["cwd"]
    },
    annotations: { readOnlyHint: true }
  },
  {
    name: "temper_session_set",
    description:
      "Update a workstream entry in the Temper session board. " +
      "By default, previews the change without writing. Set write=true to persist to SESSION.md and session.json. " +
      "Use to track status changes, update next steps, or link a handoff document to a workstream.",
    inputSchema: {
      type: "object",
      properties: {
        ...CWD_PARAM,
        workstream: {
          type: "string",
          description: "Workstream identifier to update. Inferred from current branch if omitted."
        },
        status: {
          type: "string",
          description: "New status: active, in_progress_dirty, ready_to_resume, blocked, done."
        },
        next: {
          type: "string",
          description: "Updated next step for this workstream."
        },
        branch: {
          type: "string",
          description: "Git branch for this workstream. Auto-detected if omitted."
        },
        handoff: {
          type: "string",
          description: "Path to the associated HANDOFF_<slug>.md file."
        },
        write: {
          type: "boolean",
          description: "If true, persist changes to disk. If false (default), preview only."
        }
      },
      required: ["cwd"]
    }
  },
  {
    name: "temper_inspect",
    description:
      "Read-only health check of the Temper installation in a project. " +
      "Returns config status, repo state, assistant file presence, continuity file status, " +
      "execution policy summary, and recent run artifacts. " +
      "Use to diagnose missing files, understand the project's ship policy, or verify installation integrity.",
    inputSchema: {
      type: "object",
      properties: CWD_PARAM,
      required: ["cwd"]
    },
    annotations: { readOnlyHint: true }
  }
];

const TOOLS = [...ONBOARDING_TOOLS, ...OPERATIONAL_TOOLS];

// ---------------------------------------------------------------------------
// Tool listing
// ---------------------------------------------------------------------------

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

// ---------------------------------------------------------------------------
// Tool execution
// ---------------------------------------------------------------------------

function ok(data) {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
  };
}

function fail(message) {
  return {
    content: [{ type: "text", text: message }],
    isError: true
  };
}

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (!args?.cwd) {
      throw new Error("cwd is required");
    }

    // Enforce onboarding stage order
    requireStage(args.cwd, name);

    // --- Onboarding tools (direct library import — pure/sync, no stdout risk) ---

    if (name === "temper_onboard_show") {
      markStageComplete(args.cwd, name);
      return ok({
        project_root: path.resolve(args.cwd),
        opening: [
          "Temper installs an operating contract I read every session — it's how I know what this project is, how to ship safely, and how to hand off work without losing context. Takes about 30 seconds.",
          "",
          "Three things I need:",
          "",
          "1. What's the game called?",
          "2. What kind of game is it? The more detail the better — inspiration, mechanics, what makes it different.",
          "",
          "   Common types: RPG, card game, tower defense, platformer, roguelike, puzzle, strategy, sim",
          "",
          "3. How much game dev experience do you have? (first time / some experience / shipped before)"
        ].join("\n"),
        pacing_note:
          "Deliver the opening above in your own voice. Ask the three questions. Wait for the user's answers. Do not run any commands, guess answers, or analyze the repo yet. The interview comes first. Once you have all three answers, call temper_onboard_findings with name, family, and experience.",
        next_tool: "temper_onboard_findings"
      });
    }

    if (name === "temper_onboard_findings") {
      const interview = buildOnboardingInterview({ cwd: args.cwd });
      const findings = interview.analysis_findings ?? { strengths: [], concerns: [] };
      const concerns = findings.concerns ?? [];
      const findingsMessage =
        concerns.length > 0
          ? [
              "Before we go any further, a couple of things worth knowing:",
              "",
              ...concerns.map((c) => `- ${c.title} ${c.impact}`),
              "",
              "Once you've had a chance to take that in, I'll share my recommendation for how to proceed."
            ].join("\n")
          : "Nothing significant to flag here — the repo is in clean enough shape to proceed.";
      markStageComplete(args.cwd, name);
      return ok({
        concerns,
        strengths: findings.strengths ?? [],
        designer_read: findings.designer_read ?? null,
        project_summary: findings.project_summary ?? null,
        findings_message: findingsMessage,
        pacing_note:
          "Deliver the findings_message to the user. Wait for them to acknowledge before calling temper_onboard_recommend.",
        next_tool: "temper_onboard_recommend"
      });
    }

    if (name === "temper_onboard_recommend") {
      const interview = buildOnboardingInterview({ cwd: args.cwd });
      const move = interview.user_facing_next_move;
      const recommendationMessage = [
        move.summary,
        "",
        move.confirm_prompt,
        ...(move.alternatives.length > 0
          ? [
              "",
              "Or if you want to go a different direction:",
              ...move.alternatives.map((a) => `- ${a.label} — say ${a.reply}`)
            ]
          : [])
      ].join("\n");
      markStageComplete(args.cwd, name);
      return ok({
        recommendation_message: recommendationMessage,
        recommended_command: move.command,
        confirm_prompt: move.confirm_prompt,
        why: move.why,
        alternatives: move.alternatives,
        dry_run_command: interview.dry_run_command,
        apply_command: interview.apply_command,
        pacing_note:
          "Deliver the recommendation_message. Wait for user confirmation before calling temper_onboard_preview.",
        next_tool: "temper_onboard_preview"
      });
    }

    if (name === "temper_onboard_preview") {
      const result = buildExistingProjectOnboarding({ cwd: args.cwd });
      const preview = buildOnboardingInstallPreview({ result, assistants: ["claude", "codex"] });
      markStageComplete(args.cwd, name);
      return ok({
        project_root: preview.project_root,
        file_changes: preview.file_changes,
        unchanged_files: preview.unchanged_files,
        habit_changes: preview.habit_changes,
        rollback: preview.rollback,
        pacing_note:
          "Present the file_changes list to the user. Ask for explicit confirmation before calling temper_onboard_apply.",
        next_tool: "temper_onboard_apply"
      });
    }

    if (name === "temper_onboard_apply") {
      const result = buildExistingProjectOnboarding({
        cwd: args.cwd,
        name: args.name,
        betaBranch: args.betaBranch,
        prodBranch: args.prodBranch
      });
      const generated = materializeOnboardingInstall({
        result,
        assistants: ["claude", "codex"]
      });
      markStageComplete(args.cwd, name);
      return ok({
        project_root: result.analysis.root,
        config_path: generated.configPath,
        onboarding_report: generated.onboardingPath,
        adoption_report: generated.adoptionPath,
        continuity_files: generated.continuity.written,
        assistant_files: generated.written,
        next_steps:
          "Temper is now installed. Run `pnpm exec temper assistant show --cwd .` to confirm, then commit the generated files."
      });
    }

    // --- Operational tools (shell out to CLI binary) ---
    // Require onboarding for all operational tools except inspect (read-only diagnostic)
    const ONBOARDING_EXEMPT = new Set(["temper_inspect"]);
    if (!STAGE_TOOL_MAP[name] && !ONBOARDING_EXEMPT.has(name) && !findConfig(args.cwd)) {
      throw new Error(
        "This repo hasn't been onboarded yet. Call temper_onboard_show to start the onboarding flow."
      );
    }

    if (name === "temper_coach") {
      const cliArgs = ["coach", "--json", "--cwd", args.cwd, "--intent", args.intent];
      if (args.capability && args.capability !== "coach") {
        cliArgs.push("--capability", args.capability);
      }
      if (args.files?.length > 0) {
        cliArgs.push("--files", args.files.join(","));
      }
      if (args.hats?.length > 0) {
        cliArgs.push("--hat", args.hats.join(","));
      }
      const stdout = await runTemper(cliArgs);
      return ok(JSON.parse(stdout));
    }

    if (name === "temper_hotfix") {
      const cliArgs = [
        "hotfix", "--json", "--cwd", args.cwd,
        "--intent", args.intent,
        "--env", args.env || "prod"
      ];
      if (args.files?.length > 0) {
        cliArgs.push("--files", args.files.join(","));
      }
      const stdout = await runTemper(cliArgs);
      return ok(JSON.parse(stdout));
    }

    if (name === "temper_ship") {
      const mode = args.mode || "lite";
      const dryRun = args.dry_run !== false;
      const cliArgs = ["ship", mode, "--json", "--cwd", args.cwd];
      if (dryRun) {
        cliArgs.push("--dry-run");
      }
      if (args.intent) {
        cliArgs.push("--intent", args.intent);
      }
      if (args.env) {
        cliArgs.push("--env", args.env);
      }
      if (args.promote?.length > 0) {
        for (const step of args.promote) {
          cliArgs.push("--promote", step);
        }
      }
      if (args.confirm_prod) {
        cliArgs.push("--confirm-prod");
      }
      const timeout = dryRun ? 120_000 : 300_000;
      const stdout = await runTemper(cliArgs, { timeout });
      return ok(JSON.parse(stdout));
    }

    if (name === "temper_handoff_preview") {
      const cliArgs = ["handoff", "--json", "--cwd", args.cwd];
      if (args.slug) cliArgs.push("--slug", args.slug);
      if (args.summary) cliArgs.push("--summary", args.summary);
      if (args.next) cliArgs.push("--next", args.next);
      if (args.title) cliArgs.push("--title", args.title);
      if (args.status) cliArgs.push("--status", args.status);
      if (args.deploy_state) cliArgs.push("--deploy-state", args.deploy_state);
      if (args.notes) cliArgs.push("--notes", args.notes);
      const stdout = await runTemper(cliArgs);
      return ok(JSON.parse(stdout));
    }

    if (name === "temper_handoff_apply") {
      const cliArgs = ["handoff", "--json", "--write", "--cwd", args.cwd];
      if (args.slug) cliArgs.push("--slug", args.slug);
      if (args.summary) cliArgs.push("--summary", args.summary);
      if (args.next) cliArgs.push("--next", args.next);
      if (args.title) cliArgs.push("--title", args.title);
      if (args.status) cliArgs.push("--status", args.status);
      if (args.deploy_state) cliArgs.push("--deploy-state", args.deploy_state);
      if (args.notes) cliArgs.push("--notes", args.notes);
      const stdout = await runTemper(cliArgs);
      return ok(JSON.parse(stdout));
    }

    if (name === "temper_session_show") {
      const stdout = await runTemper(["session", "show", "--json", "--cwd", args.cwd]);
      return ok(JSON.parse(stdout));
    }

    if (name === "temper_session_set") {
      const cliArgs = ["session", "set", "--cwd", args.cwd];
      if (args.workstream) cliArgs.push("--workstream", args.workstream);
      if (args.status) cliArgs.push("--status", args.status);
      if (args.next) cliArgs.push("--next", args.next);
      if (args.branch) cliArgs.push("--branch", args.branch);
      if (args.handoff) cliArgs.push("--handoff", args.handoff);
      if (args.write) cliArgs.push("--write");
      const stdout = await runTemper(cliArgs);
      return ok(JSON.parse(stdout));
    }

    if (name === "temper_inspect") {
      const stdout = await runTemper(["inspect", "--json", "--cwd", args.cwd]);
      return ok(JSON.parse(stdout));
    }

    throw new Error(`Unknown tool: ${name}`);
  } catch (error) {
    return fail(`Error: ${error.message}`);
  }
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

const transport = new StdioServerTransport();
await server.connect(transport);
