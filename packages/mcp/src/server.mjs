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

const server = new Server(
  { name: "temper", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

const CWD_PARAM = {
  cwd: {
    type: "string",
    description: "Absolute path to the project root."
  }
};

const TOOLS = [
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

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (!args?.cwd) {
      throw new Error("cwd is required");
    }

    if (name === "temper_onboard_show") {
      const interview = buildOnboardingInterview({ cwd: args.cwd });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                project_root: interview.project_root,
                opening: interview.assistant_flow.reply_template,
                style_rules: interview.assistant_flow.style_rules,
                inferred: interview.inferred,
                pacing_note:
                  "Deliver the opening above to the user in your own voice. Wait for their response before calling temper_onboard_findings.",
                next_tool: "temper_onboard_findings"
              },
              null,
              2
            )
          }
        ]
      };
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
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                concerns,
                strengths: findings.strengths ?? [],
                designer_read: findings.designer_read ?? null,
                project_summary: findings.project_summary ?? null,
                findings_message: findingsMessage,
                pacing_note:
                  "Deliver the findings_message to the user. Wait for them to acknowledge before calling temper_onboard_recommend.",
                next_tool: "temper_onboard_recommend"
              },
              null,
              2
            )
          }
        ]
      };
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
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
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
              },
              null,
              2
            )
          }
        ]
      };
    }

    if (name === "temper_onboard_preview") {
      const result = buildExistingProjectOnboarding({ cwd: args.cwd });
      const preview = buildOnboardingInstallPreview({ result, assistants: ["claude", "codex"] });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                project_root: preview.project_root,
                file_changes: preview.file_changes,
                unchanged_files: preview.unchanged_files,
                habit_changes: preview.habit_changes,
                rollback: preview.rollback,
                pacing_note:
                  "Present the file_changes list to the user. Ask for explicit confirmation before calling temper_onboard_apply.",
                next_tool: "temper_onboard_apply"
              },
              null,
              2
            )
          }
        ]
      };
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
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                project_root: result.analysis.root,
                config_path: generated.configPath,
                onboarding_report: generated.onboardingPath,
                adoption_report: generated.adoptionPath,
                continuity_files: generated.continuity.written,
                assistant_files: generated.written,
                next_steps:
                  "Temper is now installed. Run `pnpm exec temper assistant show --cwd .` to confirm, then commit the generated files."
              },
              null,
              2
            )
          }
        ]
      };
    }

    throw new Error(`Unknown tool: ${name}`);
  } catch (error) {
    return {
      content: [{ type: "text", text: `Error: ${error.message}` }],
      isError: true
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
