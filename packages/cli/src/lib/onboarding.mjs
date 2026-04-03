import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import {
  TEMPER_RUNTIME_MARKER,
  installAssistantAdapters,
  planAssistantAdapters,
  removeMarkedBlock
} from "./assistant.mjs";
import {
  collectContinuityRemovalChanges,
  materializeContinuityInstall,
  planContinuityInstall
} from "./continuity.mjs";
import {
  analyzeProject,
  createConfigFromAnalysis,
  renderAdoptionReport
} from "./project-analysis.mjs";
import { CONFIG_FILENAME, writeProjectConfig, writeProjectFile } from "./project-config.mjs";
import { TEMPER_SWORD_ART } from "./output.mjs";

const SKIP_DIRS = new Set([
  ".git",
  ".next",
  ".turbo",
  ".vercel",
  "coverage",
  "derived",
  "dist",
  "node_modules",
  "out",
  "tmp"
]);

const REHEARSAL_SKIP_DIRS = new Set([...SKIP_DIRS, ".temper"]);

export function buildExistingProjectOnboarding(options = {}) {
  const analysis = analyzeProject({ cwd: options.cwd });
  const initialConfig = createConfigFromAnalysis(analysis, {
    mode: "onboarded",
    family: options.family,
    stack: options.stack,
    name: options.name
  });
  const answers = normalizeOnboardingAnswers(initialConfig, options);
  const baseConfig = applyOnboardingAnswersToConfig(initialConfig, answers);
  const packageCatalog = scanPackageDefinitions(analysis.root);
  const workflows = inspectGitHubWorkflows(analysis.root);
  const history = inspectGitHistory(analysis.repo.gitRoot);
  const scriptAudit = inspectScriptAudit(analysis.root, packageCatalog, baseConfig);
  const lifecycle = inferLifecycle(analysis, workflows, history);
  const executionPolicy = buildExecutionPolicy(baseConfig, packageCatalog);
  const efficiency = buildEfficiencyReport(analysis, workflows, executionPolicy, scriptAudit);
  const strengths = collectStrengths(analysis, workflows, history);
  const recommendations = buildRecommendations({
    analysis,
    workflows,
    scriptAudit,
    executionPolicy,
    efficiency
  });
  const memory = buildWorkflowMemory({
    analysis,
    workflows,
    history,
    scriptAudit,
    executionPolicy,
    recommendations
  });
  const resurfacing = buildResurfacingSignals({
    analysis,
    executionPolicy,
    scriptAudit,
    recommendations,
    memory
  });

  const config = {
    ...baseConfig,
    ship: applyExecutionPolicyToShip(baseConfig.ship, executionPolicy.lifecycle),
    execution_policy: executionPolicy,
    onboarding: {
      generated_at: new Date().toISOString(),
      lifecycle,
      efficiency: {
        score: efficiency.score,
        current_startup_tokens: efficiency.current_startup_tokens,
        projected_startup_tokens: efficiency.projected_startup_tokens
      },
      operator_answers: answers,
      memory,
      resurfacing: resurfacing.map((item) => ({
        id: item.id,
        phase: item.phase,
        priority: item.priority,
        message: item.message
      })),
      recommendations: recommendations.map((item) => ({
        id: item.id,
        priority: item.priority,
        title: item.title
      }))
    }
  };

  const onboarding = {
    generated_at: new Date().toISOString(),
    lifecycle,
    history,
    workflows,
    strengths,
    operator_answers: answers,
    efficiency,
    memory,
    resurfacing,
    script_audit: scriptAudit,
    execution_policy: executionPolicy,
    recommendations
  };

  return {
    analysis,
    config,
    onboarding,
    report: renderOnboardingReport({
      analysis,
      config,
      onboarding
    }),
    adoptionReport: renderAdoptionReport(analysis, config)
  };
}

export function buildOnboardingInterview(options = {}) {
  const result = buildExistingProjectOnboarding(options);
  const answers = result.onboarding.operator_answers ?? {};
  const environments = result.config.environments ?? {};
  const findings = buildAssistantAnalysisFindings(result, environments);
  const userFacingNextMove = buildUserFacingNextMove(result, environments, findings);
  const unreliableAnalysis = isAnalysisUnreliable(result.analysis);
  return {
    project_root: result.analysis.root,
    recommended_answers: answers,
    analysis_findings: findings,
    unreliable_analysis: unreliableAnalysis,
    user_facing_next_move: userFacingNextMove,
    apply_command:
      "temper onboard existing --write --cwd . [--name <name>] [--family <id>] [--stack <id>] [--beta-branch <branch>] [--prod-branch <branch>]",
    dry_run_command:
      "temper onboard existing --rehearse --cwd . [--out <rehearsal-dir>] [--name <name>] [--family <id>] [--stack <id>] [--beta-branch <branch>] [--prod-branch <branch>]",
    preview_command:
      "temper onboard existing --preview --cwd . [--name <name>] [--family <id>] [--stack <id>] [--beta-branch <branch>] [--prod-branch <branch>]",
    assistant_flow: {
      mode: "continue_in_chat",
      opening: userFacingNextMove.summary,
      style_rules: [
        "Do not dump the raw interview JSON to the user.",
        "Do not say 'Temper is asking'.",
        "Lead with what you found — strengths first, then anything worth knowing — before making the recommendation.",
        "Surface the recommendation as your own judgment, not a list of options for the user to pick from.",
        "After the user confirms a path, walk through the staged approach: rehearsal → review → apply.",
        "If the user pushes back or wants to customize, offer the alternatives naturally in conversation."
      ],
      reply_template: buildOnboardingReplyTemplate(userFacingNextMove, findings),
      follow_up_template: buildOnboardingFindingTemplate(findings)
    },
    inferred: {
      name: result.analysis.name,
      family: result.analysis.family.id,
      stack: result.analysis.stack.id,
      environments: Object.fromEntries(
        Object.entries(environments).map(([id, value]) => [id, value.branch])
      )
    },
    next_step:
      "Use the reply_template as your opening message. Lead with analysis_findings.strengths, then analysis_findings.concerns, then user_facing_next_move. Run the recommended command when the user confirms. If they push back, offer the alternatives. Do not ask the user to choose a path — tell them the recommended one and let them redirect if needed."
  };
}

export function materializeOnboardingInstall(options) {
  const projectRoot = path.resolve(options.projectRoot ?? options.result.analysis.root);
  const result = options.result;
  const configPath = writeProjectConfig(projectRoot, result.config, {
    force: options.force
  });
  const continuity = materializeContinuityInstall({
    projectRoot,
    config: result.config,
    analysis: result.analysis,
    onboarding: result.onboarding
  });
  const onboardingPath = writeProjectFile(projectRoot, ".temper/reports/onboarding.md", result.report);
  const onboardingJsonPath = writeProjectFile(
    projectRoot,
    ".temper/reports/onboarding.json",
    JSON.stringify(result.onboarding, null, 2) + "\n"
  );
  const adoptionPath = writeProjectFile(projectRoot, ".temper/reports/adoption.md", result.adoptionReport);
  const written = installAssistantAdapters({
    projectRoot,
    config: result.config,
    analysis: result.analysis,
    onboarding: result.onboarding,
    assistants: options.assistants
  });

  return {
    configPath,
    onboardingPath,
    onboardingJsonPath,
    adoptionPath,
    continuity,
    written
  };
}

export function buildOnboardingInstallPreview(options) {
  const projectRoot = path.resolve(options.projectRoot ?? options.result.analysis.root);
  const result = options.result;
  const environments = result.config.environments ?? {};
  const continuityPlan = planContinuityInstall({
    projectRoot,
    config: result.config,
    analysis: result.analysis,
    onboarding: result.onboarding
  });
  const assistantPlan = planAssistantAdapters({
    projectRoot,
    config: result.config,
    analysis: result.analysis,
    onboarding: result.onboarding,
    assistants: options.assistants
  });
  const filePlans = [
    buildPreviewFilePlan(projectRoot, CONFIG_FILENAME, JSON.stringify(result.config, null, 2) + "\n"),
    buildPreviewFilePlan(projectRoot, ".temper/reports/onboarding.md", result.report),
    buildPreviewFilePlan(projectRoot, ".temper/reports/onboarding.json", JSON.stringify(result.onboarding, null, 2) + "\n"),
    buildPreviewFilePlan(projectRoot, ".temper/reports/adoption.md", result.adoptionReport),
    ...continuityPlan.files,
    ...assistantPlan.files
  ];
  const fileChanges = filePlans
    .filter((item) => item.action !== "unchanged")
    .map(({ relativePath, action }) => ({
      path: relativePath,
      action
    }));
  const unchangedFiles = filePlans.filter((item) => item.action === "unchanged").map((item) => item.relativePath);
  const findings = buildAssistantAnalysisFindings(result, environments);

  return {
    project_root: projectRoot,
    runtime_command: assistantPlan.runtime.command,
    user_facing_next_move: buildUserFacingNextMove(result, environments, findings),
    file_changes: fileChanges,
    unchanged_files: unchangedFiles,
    analysis_findings: findings,
    habit_changes: buildPreviewHabitChanges(assistantPlan.runtime.command, result.onboarding.execution_policy),
    rollback: buildPreviewRollback(fileChanges),
    deeper_review_command: "temper onboard existing --preview --cwd . --json"
  };
}

export function renderOnboardingPreview(preview) {
  const findings = preview.analysis_findings ?? { strengths: [], concerns: [] };
  const lines = [
    "## Preview",
    "- no files are written in preview mode",
    "- this is the safe inspection pass before Temper touches the repo"
  ];

  if (findings.strengths.length > 0) {
    lines.push("", "## What's Already In Good Shape", ...asBulletLines(findings.strengths.map((s) => s.text)));
  }

  if (findings.concerns.length > 0) {
    lines.push(
      "",
      "## Worth Knowing Before We Install",
      ...asBulletLines(findings.concerns.map((c) => `${c.title} ${c.impact}`))
    );
  }

  lines.push(
    "",
    "## Recommended Next Move",
    `- ${preview.user_facing_next_move.summary}`,
    `- run: \`${preview.user_facing_next_move.command}\``,
    ...asBulletLines(preview.user_facing_next_move.why.map((item) => `why: ${item}`))
  );

  lines.push(
    "",
    "## What Will Change",
    ...asBulletLines(
      preview.file_changes.length > 0
        ? preview.file_changes.map((item) => `${item.action}: ${item.path}`)
        : ["none. the repo already matches the current Temper install plan."]
    )
  );

  if (preview.unchanged_files.length > 0) {
    lines.push("", "## Already Matches", ...asBulletLines(preview.unchanged_files));
  }

  lines.push("", "## Rollback", ...asBulletLines(preview.rollback));
  lines.push("", "## After Install", ...asBulletLines(preview.habit_changes));
  lines.push("", "## Deeper Review", `- run \`${preview.deeper_review_command}\` for the full analysis and policy report`);

  return lines.join("\n") + "\n";
}

export function renderOnboardingInterview(interview) {
  const findings = interview.analysis_findings ?? { strengths: [], concerns: [] };
  const lines = [
    "## Onboarding Interview",
    "- lead with what you found before making the recommendation",
    "- surface strengths first, then anything worth knowing, then the recommended path",
    "- present the recommendation as your own judgment — not a menu",
    "- only surface config details (family, stack, branch names) if the user asks to customize"
  ];

  if (findings.strengths.length > 0) {
    lines.push("", "## What's Already In Good Shape");
    for (const s of findings.strengths) {
      lines.push(`- ${s.text}`);
    }
  }

  if (findings.concerns.length > 0) {
    lines.push("", "## Worth Knowing Before We Install");
    for (const c of findings.concerns) {
      lines.push(`- ${c.title}`);
      lines.push(`  ${c.impact}`);
    }
  }

  lines.push(
    "",
    "## Recommended Next Move",
    `- ${interview.user_facing_next_move.summary}`,
    `- run: \`${interview.user_facing_next_move.command}\``,
    `- chat reply: ${interview.user_facing_next_move.confirm_prompt}`,
    ...asBulletLines(interview.user_facing_next_move.why.map((item) => `why: ${item}`))
  );

  if (interview.user_facing_next_move.alternatives.length > 0) {
    lines.push("", "## If The User Wants A Different Path");
    for (const alt of interview.user_facing_next_move.alternatives) {
      lines.push(`- ${alt.label} — they say ${alt.reply}`);
      lines.push(`  run: \`${alt.command}\``);
    }
  }

  lines.push("", "## Suggested Opening Message", interview.assistant_flow?.reply_template || interview.user_facing_next_move.summary);

  return lines.join("\n") + "\n";
}

export function renderOnboardingOpening(interview) {
  const findings = interview.analysis_findings ?? { strengths: [], concerns: [] };
  const strengths = findings.strengths;
  const concerns = findings.concerns;

  // If analysis is unreliable (dir-slug name + default family with no signals),
  // ask two questions before running any analysis — don't pretend we know anything
  if (interview.unreliable_analysis) {
    const lines = [
      "## Analysis Confidence: Low",
      "The project name and game type couldn't be reliably inferred. Ask two questions before proceeding.",
      "",
      "## Suggested Opening Message",
      "Before I set this up, two things I need from you:",
      "",
      "1. Is this a new game, or something you've already started building?",
      "   If it's new — what's it called, and what kind of game is it?",
      "   If it already exists — point me at it and I'll take a look.",
      "2. How much game dev experience do you have? (first time / some experience / shipped before)",
      "",
      "---",
      "STOP. Do not continue past this line.",
      "Ask those two questions. Wait for the user's answers.",
      "",
      "If new game:",
      "  pnpm exec temper init --name \"<name>\" --family <type> --experience <level> --description \"<description>\" --cwd .",
      "If existing game — they give you a path:",
      "  pnpm exec temper onboard existing --cwd <path> --name \"<name>\" --family <type>",
      "If existing game — they don't know the path:",
      "  Search for it: grep -ril \"<game name>\" ~ --include=\"*.json\" --include=\"*.js\" --include=\"*.ts\" --include=\"*.html\" 2>/dev/null",
      "  If found: run the onboard command above with the found path.",
      "  If not found: tell them clearly you can't locate it, ask if they have a path or built it elsewhere."
    ];
    return lines.join("\n") + "\n";
  }

  const lines = ["## What's Already In Good Shape"];
  if (strengths.length > 0) {
    for (const s of strengths) {
      lines.push(`- ${s.text}`);
    }
  } else {
    lines.push("- The repo is intelligible enough for Temper to start building a local operating contract.");
  }

  const openingMessage = strengths.length > 0
    ? [
        "Okay, I looked through the whole thing. A few things are already in good shape:",
        "",
        ...strengths.map((s) => `- ${s.text}`),
        "",
        concerns.length > 0
          ? "There are also a couple of things worth knowing before we install anything. I'll share those next."
          : "Nothing to flag before we proceed — the repo is in clean shape. Ready to share my recommendation whenever you are."
      ].join("\n")
    : concerns.length > 0
      ? "Okay, I looked through the repo. It's clean enough to work with. Let me flag a couple of things before we proceed."
      : "Okay, I looked through the repo. Nothing to flag — it's clean. Ready to share my recommendation whenever you are.";

  lines.push("", "## Suggested Opening Message", openingMessage);

  // If no concerns, collapse stages 1+2 — jump straight to recommendation
  if (concerns.length === 0) {
    lines.push(
      "",
      "---",
      "STOP. Do not continue past this line.",
      "Deliver the opening message above. Wait for the user to respond.",
      "",
      "When they are ready, run:",
      "  pnpm exec temper onboard existing --recommend --cwd ."
    );
  } else {
    lines.push(
      "",
      "---",
      "STOP. Do not continue past this line.",
      "Deliver the opening message above. Wait for the user to respond.",
      "",
      "When they are ready, run:",
      "  pnpm exec temper onboard existing --findings --cwd ."
    );
  }

  return lines.join("\n") + "\n";
}

export function renderOnboardingFindings(interview) {
  const findings = interview.analysis_findings ?? { strengths: [], concerns: [] };
  const concerns = findings.concerns;

  const lines = ["## Worth Knowing Before We Install"];
  if (concerns.length > 0) {
    for (const c of concerns) {
      lines.push(`- ${c.title}`);
      lines.push(`  ${c.impact}`);
    }
  } else {
    lines.push("- Nothing significant to flag. The repo is in clean enough shape to proceed.");
  }

  const findingsMessage = concerns.length > 0
    ? [
        "Before we go any further, a couple of things worth knowing:",
        "",
        ...concerns.map((c) => `- ${c.title} ${c.impact}`),
        "",
        "Once you've had a chance to take that in, I'll share my recommendation for how to proceed."
      ].join("\n")
    : "Nothing significant to flag here — the repo is in clean shape. Ready to move to the recommendation whenever you are.";

  lines.push("", "## Suggested Message", findingsMessage);

  lines.push(
    "",
    "---",
    "STOP. Do not continue past this line.",
    "Deliver the findings message above. Wait for the user to respond.",
    "",
    "When they are ready, run:",
    "  pnpm exec temper onboard existing --recommend --cwd ."
  );

  return lines.join("\n") + "\n";
}

export function renderOnboardingRecommendation(interview) {
  const move = interview.user_facing_next_move;
  const lines = [
    "## Recommended Next Move",
    `- ${move.summary}`,
    `- run: \`${move.command}\``,
    `- chat reply: ${move.confirm_prompt}`,
    ...asBulletLines(move.why.map((item) => `why: ${item}`))
  ];

  if (move.alternatives.length > 0) {
    lines.push("", "## If The User Wants A Different Path");
    for (const alt of move.alternatives) {
      lines.push(`- ${alt.label} — they say ${alt.reply}`);
      lines.push(`  run: \`${alt.command}\``);
    }
  }

  const recommendationMessage = [
    move.summary,
    "",
    move.confirm_prompt,
    ...(move.alternatives.length > 0
      ? ["", "Or if you want to go a different direction:", ...move.alternatives.map((alt) => `- ${alt.label} — say ${alt.reply}`)]
      : [])
  ].join("\n");

  lines.push("", "## Suggested Message", recommendationMessage);

  return lines.join("\n") + "\n";
}

export function runExistingProjectOnboardingRehearsal(options = {}) {
  const sourceRoot = path.resolve(options.cwd ?? process.cwd());
  const rehearsalRoot = resolveRehearsalRoot(sourceRoot, options);

  prepareRehearsalRoot(sourceRoot, rehearsalRoot);
  const reset = applyTemperUninstall({ cwd: rehearsalRoot }).applied;
  const result = buildExistingProjectOnboarding({
    cwd: rehearsalRoot,
    family: options.family,
    stack: options.stack,
    name: options.name
  });
  const generated = materializeOnboardingInstall({
    projectRoot: rehearsalRoot,
    result,
    assistants: options.assistants,
    force: true
  });
  const rehearsalPath = writeProjectFile(
    rehearsalRoot,
    ".temper/reports/rehearsal.json",
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        source_root: sourceRoot,
        rehearsal_root: rehearsalRoot,
        reset_paths: reset,
        generated_paths: [
          relativeTo(rehearsalRoot, generated.configPath),
          ...generated.continuity.written,
          relativeTo(rehearsalRoot, generated.onboardingPath),
          relativeTo(rehearsalRoot, generated.onboardingJsonPath),
          relativeTo(rehearsalRoot, generated.adoptionPath),
          ...generated.written
        ]
      },
      null,
      2
    ) + "\n"
  );

  return {
    sourceRoot,
    rehearsalRoot,
    reset,
    rehearsalPath,
    result,
    generated: {
      ...generated,
      rehearsalPath
    }
  };
}

export function planTemperUninstall(options = {}) {
  const projectRoot = path.resolve(options.cwd ?? process.cwd());
  const changes = collectTemperInstallChanges(projectRoot);

  return {
    projectRoot,
    changes: changes.map(({ path: relativePath, action }) => ({
      path: relativePath,
      action
    }))
  };
}

export function applyTemperUninstall(options = {}) {
  const projectRoot = path.resolve(options.cwd ?? process.cwd());
  const changes = collectTemperInstallChanges(projectRoot);
  const applied = [];

  for (const change of changes) {
    const targetPath = path.join(projectRoot, change.path);
    if (change.action === "delete_file") {
      fs.rmSync(targetPath, { force: true });
      applied.push(change.path);
      continue;
    }
    if (change.action === "delete_dir") {
      fs.rmSync(targetPath, { recursive: true, force: true });
      applied.push(change.path);
      continue;
    }
    if (change.action === "update_file") {
      fs.writeFileSync(targetPath, change.content);
      applied.push(change.path);
    }
  }

  return {
    projectRoot,
    applied
  };
}

export function renderTemperUninstallPreview(plan) {
  const lines = [
    "## Uninstall Preview",
    "- no files are changed until you add `--write`",
    "",
    "## What Will Be Removed",
    ...asBulletLines(
      plan.changes.length > 0
        ? plan.changes.map((item) => `${formatUninstallAction(item.action)}: ${item.path}`)
        : ["no Temper install artifacts were found."]
    )
  ];

  return lines.join("\n") + "\n";
}

export function renderOnboardingReport({ analysis, config, onboarding }) {
  const lines = [
    "# Temper Onboarding Report",
    "",
    "```text",
    TEMPER_SWORD_ART,
    "```",
    "",
    `- Project: ${config.name}`,
    `- Root: ${analysis.root}`,
    `- Family: ${analysis.family.label} (${analysis.family.id})`,
    `- Stack: ${analysis.stack.label} (${analysis.stack.id})`,
    `- Lifecycle inference: ${onboarding.lifecycle.label}`,
    `- Current startup token load: ${onboarding.efficiency.current_startup_tokens}`,
    `- Projected after Temper contract + recommendations: ${onboarding.efficiency.projected_startup_tokens}`,
    "",
    "## What Temper Sees",
    ...asBulletLines([
      `environments: ${analysis.environments.map((item) => `${item.id}:${item.branch}`).join(", ")}`,
      `workflow surfaces: ${formatWorkflowSurfaces(analysis.surfaces.workflow)}`,
      `source of truth: ${analysis.surfaces.source_of_truth.join(", ") || "none detected"}`,
      `github workflows: ${onboarding.workflows.files.map((item) => item.path).join(", ") || "none detected"}`,
      `git history: ${formatHistory(onboarding.history)}`
    ]),
    "",
    "## What Already Looks Good",
    ...asBulletLines(onboarding.strengths),
    "",
    "## Lifecycle And Operator Posture",
    ...asBulletLines([
      ...onboarding.lifecycle.reasons,
      `operator habit: ${onboarding.lifecycle.operator_habit}`,
      `player impact: ${onboarding.lifecycle.player_impact}`
    ]),
    "",
    "## Workflow Memory",
    ...asBulletLines(renderWorkflowMemoryLines(onboarding.memory)),
    "",
    "## Token Efficiency",
    ...asBulletLines([
      `score: ${onboarding.efficiency.score}/100`,
      ...onboarding.efficiency.waste,
      ...onboarding.efficiency.payoffs
    ]),
    "",
    "## Execution Policy",
    ...asBulletLines(renderExecutionPolicyLines(onboarding.execution_policy)),
    "",
    "## Policy Lifecycle",
    ...asBulletLines(renderPolicyLifecycleLines(onboarding.execution_policy.lifecycle)),
    "",
    "## Recommended Hook Shape",
    ...asBulletLines(renderHookLines(onboarding.execution_policy.hook_recommendations)),
    "",
    "## Resurfacing",
    ...asBulletLines(onboarding.resurfacing.map((item) => `[${item.priority}] ${item.message}`)),
    "",
    "## Recommendations",
    ...renderRecommendationLines(onboarding.recommendations)
  ];

  return lines.join("\n") + "\n";
}

function resolveRehearsalRoot(sourceRoot, options) {
  if (options.out) {
    return path.resolve(options.out);
  }

  const repoName = path.basename(sourceRoot).replace(/[^a-zA-Z0-9._-]+/g, "-").toLowerCase() || "project";
  const labName = (options.lab || "first-run").replace(/[^a-zA-Z0-9._-]+/g, "-").toLowerCase() || "first-run";
  return path.join(os.homedir(), ".temper", "labs", `${repoName}-${labName}`);
}

function prepareRehearsalRoot(sourceRoot, rehearsalRoot) {
  if (rehearsalRoot === sourceRoot || rehearsalRoot.startsWith(`${sourceRoot}${path.sep}`)) {
    throw new Error("Rehearsal output must live outside the source repo.");
  }

  fs.rmSync(rehearsalRoot, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(rehearsalRoot), { recursive: true });
  execFileSync("git", ["clone", "--quiet", "--no-hardlinks", sourceRoot, rehearsalRoot], {
    stdio: "ignore"
  });
  clearWorkingTree(rehearsalRoot);
  copyWorkingTreeSnapshot(sourceRoot, rehearsalRoot);
}

function clearWorkingTree(rehearsalRoot) {
  for (const entry of fs.readdirSync(rehearsalRoot)) {
    if (entry === ".git") {
      continue;
    }
    fs.rmSync(path.join(rehearsalRoot, entry), { recursive: true, force: true });
  }
}

function copyWorkingTreeSnapshot(sourceRoot, rehearsalRoot) {
  const entries = fs.readdirSync(sourceRoot);
  for (const entry of entries) {
    if (REHEARSAL_SKIP_DIRS.has(entry) || entry === ".git") {
      continue;
    }

    const sourcePath = path.join(sourceRoot, entry);
    const targetPath = path.join(rehearsalRoot, entry);
    fs.cpSync(sourcePath, targetPath, {
      recursive: true,
      dereference: false,
      filter: (candidate) => shouldCopyForRehearsal(sourceRoot, candidate)
    });
  }
}

function shouldCopyForRehearsal(sourceRoot, candidatePath) {
  const relativePath = path.relative(sourceRoot, candidatePath);
  if (!relativePath || relativePath.startsWith("..")) {
    return true;
  }

  const segments = relativePath.split(path.sep);
  return !segments.some((segment) => REHEARSAL_SKIP_DIRS.has(segment) || segment === ".git");
}

function collectTemperInstallChanges(projectRoot) {
  const changes = [...collectContinuityRemovalChanges(projectRoot)];
  const configPath = path.join(projectRoot, CONFIG_FILENAME);
  if (fs.existsSync(configPath)) {
    changes.push({
      path: CONFIG_FILENAME,
      action: "delete_file"
    });
  }

  const temperDir = path.join(projectRoot, ".temper");
  if (fs.existsSync(temperDir)) {
    changes.push({
      path: ".temper/",
      action: "delete_dir"
    });
  }

  const claudeCommandsDir = path.join(projectRoot, ".claude", "commands");
  if (fs.existsSync(claudeCommandsDir)) {
    for (const entry of fs.readdirSync(claudeCommandsDir)) {
      if (!/^temper-.*\.md$/i.test(entry)) {
        continue;
      }
      changes.push({
        path: path.posix.join(".claude/commands", entry),
        action: "delete_file"
      });
    }
  }

  for (const relativePath of ["AGENTS.md", "CLAUDE.md"]) {
    const filePath = path.join(projectRoot, relativePath);
    if (!fs.existsSync(filePath)) {
      continue;
    }
    const existing = fs.readFileSync(filePath, "utf8");
    const next = removeMarkedBlock(existing, TEMPER_RUNTIME_MARKER);
    if (next !== existing) {
      changes.push({
        path: relativePath,
        action: "update_file",
        content: next
      });
    }
  }

  return changes.sort((left, right) => left.path.localeCompare(right.path));
}

function formatUninstallAction(action) {
  switch (action) {
    case "delete_dir":
    case "delete_file":
      return "delete";
    case "update_file":
      return "update";
    default:
      return action;
  }
}

function relativeTo(root, targetPath) {
  return path.relative(root, targetPath).replace(/\\/g, "/") || ".";
}

function collectStrengths(analysis, workflows, history) {
  const strengths = [];
  if (analysis.surfaces.workflow.agents && analysis.surfaces.workflow.session && analysis.surfaces.workflow.claude) {
    strengths.push("The repo already has explicit operator context files for startup and session continuity.");
  }
  if (analysis.surfaces.workflow.claude_rules.length > 0) {
    strengths.push("Domain rules are already broken out into file-scoped guidance instead of one giant doc.");
  }
  if (analysis.surfaces.workflow.handoffs.length > 0) {
    strengths.push("Handoff artifacts exist, which lowers restart tax between sessions and agents.");
  }
  if (analysis.environments.some((item) => item.id === "beta") && analysis.environments.some((item) => item.id === "prod")) {
    strengths.push("The project distinguishes local, beta, and prod instead of treating release as one flat surface.");
  }
  if (analysis.surfaces.source_of_truth.length > 0) {
    strengths.push("Temper can detect canonical data and workflow surfaces without custom per-project code.");
  }
  if (workflows.files.length > 0) {
    strengths.push("GitHub workflow files exist, so the repo has machine-readable release or validation paths.");
  }
  if ((history.commit_count ?? 0) >= 50) {
    strengths.push("The repo has enough local history for Temper to infer patterns instead of guessing from a shallow snapshot.");
  }
  if (analysis.repo.sharedRoot && analysis.repo.sharedRoot !== analysis.root) {
    strengths.push("Worktree usage is explicit, and Temper can now carry shared project context into the active worktree.");
  }
  return strengths.length > 0 ? strengths : ["The repo is intelligible enough for Temper to start building a local operating contract."];
}

function inspectGitHubWorkflows(projectRoot) {
  const workflowsDir = path.join(projectRoot, ".github", "workflows");
  const files =
    fs.existsSync(workflowsDir) && fs.statSync(workflowsDir).isDirectory()
      ? fs
          .readdirSync(workflowsDir)
          .filter((entry) => /\.(ya?ml)$/i.test(entry))
          .sort()
          .map((entry) => {
            const absolutePath = path.join(workflowsDir, entry);
            const text = fs.readFileSync(absolutePath, "utf8");
            return {
              path: path.posix.join(".github/workflows", entry),
              triggers: detectWorkflowTriggers(text),
              environments: detectWorkflowEnvironments(text)
            };
          })
      : [];

  return {
    count: files.length,
    files
  };
}

function inspectGitHistory(gitRoot) {
  const commitCount = Number.parseInt(runGit(gitRoot, ["rev-list", "--count", "HEAD"]) || "", 10);
  const recent = (runGit(gitRoot, ["log", "--date=short", "--pretty=format:%h|%ad|%s", "-n", "12"]) || "")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const [hash, date, subject] = line.split("|");
      return {
        hash,
        date,
        subject
      };
    });
  const recentSubjects = recent.map((item) => item.subject);
  const conventionalCounts = {};
  for (const subject of recentSubjects) {
    const match = subject.match(/^([a-z]+)(?:\(.+\))?:/i);
    if (!match) {
      continue;
    }
    const id = match[1].toLowerCase();
    conventionalCounts[id] = (conventionalCounts[id] ?? 0) + 1;
  }

  return {
    commit_count: Number.isFinite(commitCount) ? commitCount : null,
    recent,
    conventional_counts: conventionalCounts
  };
}

function inspectScriptAudit(projectRoot, packageCatalog, config) {
  const rootEntry = packageCatalog.find((entry) => entry.relativePath === ".");
  const rootScripts = rootEntry?.scripts ?? {};
  const issues = [];

  if (rootScripts.test && /\blint\b/i.test(rootScripts.test) && !/\b(vitest|jest|mocha|ava|tap|node --test|forge test|tsx .*test)\b/i.test(rootScripts.test)) {
    issues.push({
      id: "root-test-is-lint",
      severity: "high",
      message: "Root `test` currently resolves to lint-style validation rather than a real test or verify path.",
      evidence: rootScripts.test
    });
  }

  if ((config.ship?.full?.steps ?? []).length === 0) {
    issues.push({
      id: "no-full-hook",
      severity: "medium",
      message: "No `ship full` steps were inferred. The repo needs an explicit deeper verification path.",
      evidence: "config.ship.full.steps is empty"
    });
  }

  return {
    root_scripts: rootScripts,
    issues
  };
}

function inferLifecycle(analysis, workflows, history) {
  const reasons = [];
  let id = "prototype";
  let label = "Prototype / Early Internal Project";

  const hasBeta = analysis.environments.some((item) => item.id === "beta");
  const hasProd = analysis.environments.some((item) => item.id === "prod");
  const commitCount = history.commit_count ?? 0;

  if (hasBeta) {
    id = "beta";
    label = "Beta / Structured Development Project";
    reasons.push("A beta environment is explicitly modeled in repo workflows or deploy rules.");
  }
  if (hasProd) {
    id = "live";
    label = "Live Service / Existing Users Likely";
    reasons.push("A production environment is explicitly modeled, which usually means operator mistakes have real user impact.");
  }
  if (hasProd && hasBeta && workflows.count > 0) {
    reasons.push("Both beta and prod exist alongside GitHub workflows, so release discipline already matters.");
  }
  if (commitCount >= 100) {
    reasons.push(`The repo has ${commitCount} commits locally, which suggests an established system rather than a throwaway prototype.`);
  }
  if (analysis.stack.overlays.includes("mud-onchain") || analysis.stack.overlays.includes("railway-service")) {
    reasons.push("The stack includes live-service overlays, so environment mistakes can mutate real state or real services.");
  }

  const operator_habit =
    id === "live"
      ? "Treat default automation as a safety rail, not a shortcut. Beta and prod paths should stay explicit."
      : id === "beta"
        ? "Bias toward local and beta confidence paths first, then promote only the flows you trust."
        : "Keep the workflow lightweight, but codify source-of-truth and session continuity early so the repo compounds cleanly.";
  const player_impact =
    id === "live"
      ? "Small workflow mistakes can hit players directly through progression, deploy, or economy surfaces."
      : id === "beta"
        ? "Workflow mistakes mostly cost team time and beta confidence, but can still erode trust with testers."
        : "Workflow changes mostly affect team speed today, but the wrong habits become expensive once users arrive.";

  return {
    id,
    label,
    reasons,
    operator_habit,
    player_impact
  };
}

function buildExecutionPolicy(config, packageCatalog) {
  const commands = {};
  for (const [id, commandConfig] of Object.entries(config.commands ?? {})) {
    commands[id] = classifyCommand(id, commandConfig, packageCatalog);
  }

  const hookRecommendations = buildHookRecommendations(config, commands);
  const lifecycle = buildPolicyLifecycle(hookRecommendations, commands);

  return {
    commands,
    hook_recommendations: hookRecommendations,
    lifecycle
  };
}

function classifyCommand(id, commandConfig, packageCatalog) {
  const scriptBody = findScriptBody(commandConfig, packageCatalog);
  const text = [id, ...(commandConfig?.cmd ?? []), commandConfig?.source ?? "", scriptBody ?? ""].join(" ").toLowerCase();
  const reasons = [];
  let risk = "safe_local";
  let effect = "local";
  let requires_confirmation = false;

  if (/(mainnet|production|prod|--prod|deploy:mainnet|ensure-access:mainnet|publish)/i.test(text)) {
    risk = "prod_sensitive";
    effect = "production";
    requires_confirmation = true;
    reasons.push("Touches production-facing deployment or publish surfaces.");
  } else if (/(smoke|testnet|beta|staging|zone:load|item:sync|ensure-access|world_address|private_key|rpc_url|broadcast|railway up|vercel)/i.test(text)) {
    risk = "live_stateful";
    effect = "beta_or_target_env";
    requires_confirmation = true;
    reasons.push("Depends on environment credentials or mutates a shared runtime surface.");
  } else if (/(build|typecheck|lint|test|vitest|forge test|node --test)/i.test(text)) {
    risk = /(build|typecheck|forge test|vitest|node --test|test:balance)/i.test(text) ? "expensive_local" : "safe_local";
    effect = "local";
    reasons.push("Runs local verification or compile work without explicit remote mutation.");
  } else if (/(changelog|release notes)/i.test(text)) {
    reasons.push("Generates local release metadata without mutating runtime state.");
  } else if (/(curl|gh api|snapshot|status|health|verify)/i.test(text)) {
    risk = "network_readonly";
    effect = "network_readonly";
    reasons.push("Reads remote state but does not imply mutation.");
  } else {
    reasons.push("No clear remote mutation signal detected. Review manually before promoting.");
  }

  return {
    id,
    cmd: commandConfig?.cmd ?? [],
    source: commandConfig?.source ?? null,
    script: scriptBody ?? null,
    risk,
    effect,
    requires_confirmation,
    reasons
  };
}

function buildHookRecommendations(config, commands) {
  const output = {};
  for (const mode of ["lite", "full"]) {
    const currentSteps = config.ship?.[mode]?.steps ?? [];
    const recommended_default = currentSteps.filter((stepId) => {
      const risk = commands[stepId]?.risk ?? "safe_local";
      return risk !== "live_stateful" && risk !== "prod_sensitive";
    });
    const gated_live = currentSteps.filter((stepId) => commands[stepId]?.risk === "live_stateful");
    const blocked_prod = currentSteps.filter((stepId) => commands[stepId]?.risk === "prod_sensitive");

    output[mode] = {
      current_steps: currentSteps,
      recommended_default,
      gated_live,
      blocked_prod,
      notes: buildHookNotes(mode, currentSteps, recommended_default, gated_live, blocked_prod)
    };
  }
  return output;
}

function buildPolicyLifecycle(hookRecommendations, commands) {
  const ship_modes = {};
  for (const mode of ["lite", "full"]) {
    const hook = hookRecommendations[mode];
    const discovered_steps = hook.current_steps;
    const blessed_steps = hook.recommended_default;
    const gated_steps = dedupe([...hook.gated_live, ...hook.blocked_prod]);
    const recommended_steps = dedupe([...blessed_steps, ...gated_steps]);
    const prod_confirmation_steps = hook.blocked_prod;

    ship_modes[mode] = {
      discovered_steps,
      recommended_steps,
      blessed_steps,
      gated_steps,
      prod_confirmation_steps,
      notes: buildLifecycleNotes(mode, { discovered_steps, blessed_steps, gated_steps, prod_confirmation_steps }, commands)
    };
  }

  return {
    stages: ["discovered", "recommended", "blessed", "gated"],
    promote_command: "temper ship <lite|full> --promote <step>",
    confirmation_rules: [
      "Live-stateful steps start gated and require explicit `--promote <step>` to run.",
      "Production-sensitive steps require both `--promote <step>` and `--confirm-prod`."
    ],
    ship_modes
  };
}

function buildEfficiencyReport(analysis, workflows, executionPolicy, scriptAudit) {
  let score = 100;
  const waste = [];
  const payoffs = [];

  if (!analysis.surfaces.workflow.agents) {
    score -= 18;
    waste.push("No AGENTS surface detected. Assistants will spend tokens rediscovering operating rules.");
  } else {
    payoffs.push("Shared operating instructions exist, which lowers repeated orientation cost.");
  }

  if (!analysis.surfaces.workflow.session) {
    score -= 18;
    waste.push("No SESSION surface detected. Restarting work will keep re-paying context setup.");
  } else {
    payoffs.push("Session state is already explicit, which helps carry work across turns and agents.");
  }

  if (!analysis.surfaces.workflow.claude) {
    score -= 12;
    waste.push("No CLAUDE.md detected. Assistant-specific guidance will stay more generic than necessary.");
  }

  if (analysis.surfaces.workflow.handoffs.length === 0) {
    score -= 10;
    waste.push("No handoff docs detected. End-of-session context is more likely to get lost.");
  } else {
    payoffs.push("Handoff artifacts exist, which reduces restart tax and duplicated investigation.");
  }

  if (analysis.surfaces.workflow.claude_rules.length === 0) {
    score -= 8;
    waste.push("No domain rule files detected. File-scoped context will have to be re-explained in chat.");
  } else {
    payoffs.push("Domain-specific rule files exist, so assistants can stay narrower and cheaper.");
  }

  if (analysis.surfaces.source_of_truth.length === 0) {
    score -= 15;
    waste.push("No strong source-of-truth files were detected. Humans and assistants will argue with the codebase more often.");
  } else {
    payoffs.push("Canonical source-of-truth surfaces are detectable, which is one of the biggest token savers in long-lived repos.");
  }

  if (workflows.count === 0) {
    score -= 6;
    waste.push("No GitHub workflows detected. Shipping discipline may live only in people's heads.");
  }

  if (scriptAudit.issues.some((item) => item.id === "root-test-is-lint")) {
    score -= 10;
    waste.push("Root `test` is acting like lint. That creates false confidence and expensive backtracking.");
  }

  const fullPolicy = executionPolicy.hook_recommendations.full;
  if (fullPolicy.gated_live.length > 0) {
    score -= 10;
    waste.push("Default `ship full` currently includes live-stateful verification. That is expensive, slower, and easier to misuse.");
  }

  score = Math.max(0, score);
  return {
    score,
    current_startup_tokens: tokenBand(score),
    projected_startup_tokens: tokenBand(Math.min(100, score + 20)),
    waste,
    payoffs
  };
}

function buildRecommendations({ analysis, scriptAudit, executionPolicy, efficiency }) {
  const recommendations = [];

  if (scriptAudit.issues.some((item) => item.id === "root-test-is-lint")) {
    recommendations.push({
      id: "split-root-test-from-lint",
      priority: "high",
      title: "Split root lint from root verification",
      why: "Humans and assistants both read `test` as a confidence signal. If it only lints, the repo looks safer than it is.",
      operator_change: "Rename the root lint path or add a stronger root verify path that matches what `test` implies.",
      player_impact: "Fewer releases will be called validated when only style checks ran.",
      tradeoff: "One-time script and CI cleanup. Slightly more explicit command names afterward.",
      token_impact: "Saves rework tokens by reducing false-positive confidence during shipping."
    });
  }

  if (executionPolicy.hook_recommendations.full.gated_live.length > 0) {
    recommendations.push({
      id: "gate-live-verification",
      priority: "high",
      title: "Keep live-stateful verification out of the default `ship full` path",
      why: "Environment-bound smoke tests and sync-style commands are valuable, but they should be promoted deliberately, not inferred as routine local validation.",
      operator_change: "Use `ship full` for local/deep local confidence and run beta/live verification as an explicit next step.",
      player_impact: "Reduces accidental mutation of shared game state while keeping beta confidence available when it matters.",
      tradeoff: "One more explicit step when you want deep environment validation.",
      token_impact: "Cuts long, expensive runs from the default path and avoids recovery sessions after accidental live writes."
    });
  }

  if (!analysis.surfaces.workflow.agents || !analysis.surfaces.workflow.session || analysis.surfaces.workflow.handoffs.length === 0) {
    recommendations.push({
      id: "codify-operator-context",
      priority: "medium",
      title: "Codify startup, session, and handoff surfaces",
      why: "Every missing operator doc pushes context back into chat, which is the most expensive place to store it.",
      operator_change: "Keep AGENTS, SESSION, and handoff docs short, current, and repo-native.",
      player_impact: "Less operator drift means fewer avoidable mistakes during hotfixes and live changes.",
      tradeoff: "Requires a few minutes of discipline at the start and end of a workstream.",
      token_impact: "This is one of the biggest recurring token savings because the same explanation stops repeating."
    });
  }

  if (efficiency.score >= 75) {
    recommendations.push({
      id: "surface-strengths-over-time",
      priority: "medium",
      title: "Use Temper to preserve and reinforce what already works",
      why: "Strong repos still leak tokens when their good habits stay implicit instead of machine-readable.",
      operator_change: "Let Temper keep the workflow contract current and keep reviewing its recommendations as the repo evolves.",
      player_impact: "Existing quality stays durable as more agents or contributors touch the project.",
      tradeoff: "The repo gains one more contract file and periodic review of recommendations.",
      token_impact: "Maintains low startup cost instead of letting entropy push the repo back toward repeated orientation."
    });
  }

  return recommendations;
}

function renderExecutionPolicyLines(executionPolicy) {
  const groups = {
    safe_local: [],
    expensive_local: [],
    network_readonly: [],
    live_stateful: [],
    prod_sensitive: []
  };

  for (const command of Object.values(executionPolicy.commands)) {
    groups[command.risk].push(command.id);
  }

  return [
    `safe local: ${groups.safe_local.join(", ") || "none"}`,
    `expensive local: ${groups.expensive_local.join(", ") || "none"}`,
    `network readonly: ${groups.network_readonly.join(", ") || "none"}`,
    `live stateful: ${groups.live_stateful.join(", ") || "none"}`,
    `prod sensitive: ${groups.prod_sensitive.join(", ") || "none"}`
  ];
}

function renderHookLines(hooks) {
  return [
    `ship lite current: ${hooks.lite.current_steps.join(", ") || "none"}`,
    `ship lite recommended default: ${hooks.lite.recommended_default.join(", ") || "none"}`,
    `ship full current: ${hooks.full.current_steps.join(", ") || "none"}`,
    `ship full recommended default: ${hooks.full.recommended_default.join(", ") || "none"}`,
    `promote to explicit beta/live verification: ${hooks.full.gated_live.join(", ") || "none"}`,
    `keep behind explicit prod confirmation: ${hooks.full.blocked_prod.join(", ") || "none"}`
  ];
}

function renderPolicyLifecycleLines(lifecycle) {
  if (!lifecycle) {
    return ["none"];
  }

  const lines = [
    `stages: ${lifecycle.stages.join(" -> ")}`,
    `promotion command: ${lifecycle.promote_command}`
  ];

  for (const mode of ["lite", "full"]) {
    const policy = lifecycle.ship_modes?.[mode];
    if (!policy) {
      continue;
    }
    lines.push(`${mode} discovered: ${policy.discovered_steps.join(", ") || "none"}`);
    lines.push(`${mode} blessed default: ${policy.blessed_steps.join(", ") || "none"}`);
    lines.push(`${mode} gated: ${policy.gated_steps.join(", ") || "none"}`);
    if (policy.prod_confirmation_steps.length > 0) {
      lines.push(`${mode} prod confirmation: ${policy.prod_confirmation_steps.join(", ")}`);
    }
  }

  return [...lines, ...(lifecycle.confirmation_rules ?? [])];
}

function renderWorkflowMemoryLines(memory) {
  if (!memory) {
    return ["none"];
  }

  const lines = [];
  if (memory.release_pattern) {
    lines.push(`release pattern: ${memory.release_pattern}`);
  }
  if (memory.continuity_pattern) {
    lines.push(`continuity pattern: ${memory.continuity_pattern}`);
  }
  if (memory.recurring_failure_modes?.length > 0) {
    lines.push(...memory.recurring_failure_modes.map((item) => `recurring failure mode: ${item}`));
  }
  if (memory.recent_signals?.length > 0) {
    lines.push(...memory.recent_signals.map((item) => `recent signal: ${item}`));
  }
  return lines.length > 0 ? lines : ["none"];
}

function renderRecommendationLines(recommendations) {
  if (recommendations.length === 0) {
    return ["- none right now. The repo already has a strong operating shape."];
  }

  const lines = [];
  for (const item of recommendations) {
    lines.push(`- [${item.priority}] ${item.title}`);
    lines.push(`- why: ${item.why}`);
    lines.push(`- operator change: ${item.operator_change}`);
    lines.push(`- player impact: ${item.player_impact}`);
    lines.push(`- tradeoff: ${item.tradeoff}`);
    lines.push(`- token impact: ${item.token_impact}`);
  }
  return lines;
}

function buildHookNotes(mode, currentSteps, recommendedDefault, gatedLive, blockedProd) {
  const notes = [];
  if (currentSteps.length === 0) {
    notes.push(`No ${mode} steps were inferred. The project needs an explicit contract.`);
  }
  if (recommendedDefault.length !== currentSteps.length) {
    notes.push(`Temper would keep ${mode} local-by-default and promote riskier steps only after explicit confirmation.`);
  }
  if (gatedLive.length > 0) {
    notes.push(`These ${mode} steps touch shared runtime state or require real environment credentials.`);
  }
  if (blockedProd.length > 0) {
    notes.push(`These ${mode} steps should stay behind production confirmation.`);
  }
  return notes;
}

function buildLifecycleNotes(mode, lifecycleMode, commands) {
  const notes = [];
  if (lifecycleMode.blessed_steps.length > 0) {
    notes.push(`${mode} blessed default stays local-first: ${lifecycleMode.blessed_steps.join(", ")}`);
  }
  if (lifecycleMode.gated_steps.length > 0) {
    notes.push(`${mode} gated steps require explicit promotion: ${lifecycleMode.gated_steps.join(", ")}`);
  }
  if (lifecycleMode.prod_confirmation_steps.length > 0) {
    notes.push(`${mode} prod-sensitive steps also require --confirm-prod: ${lifecycleMode.prod_confirmation_steps.join(", ")}`);
  }
  if (lifecycleMode.discovered_steps.length === 0) {
    notes.push(`${mode} has no discovered steps yet.`);
  }
  for (const stepId of lifecycleMode.gated_steps) {
    const reasons = commands[stepId]?.reasons ?? [];
    if (reasons.length > 0) {
      notes.push(`${stepId}: ${reasons[0]}`);
    }
  }
  return notes;
}

function applyExecutionPolicyToShip(shipConfig, lifecycle) {
  const next = {};
  for (const mode of ["lite", "full"]) {
    const lifecycleMode = lifecycle?.ship_modes?.[mode];
    const fallback = shipConfig?.[mode] ?? { steps: [] };
    next[mode] = {
      steps: lifecycleMode?.blessed_steps ?? fallback.steps ?? [],
      gated_steps: lifecycleMode?.gated_steps ?? [],
      discovered_steps: lifecycleMode?.discovered_steps ?? dedupe([...(fallback.steps ?? []), ...(fallback.gated_steps ?? [])])
    };
  }
  return next;
}

function buildWorkflowMemory({ analysis, workflows, history, scriptAudit, executionPolicy, recommendations }) {
  const releaseSignals = [];
  if (analysis.environments.some((item) => item.id === "beta")) {
    releaseSignals.push("beta environment is modeled");
  }
  if (analysis.environments.some((item) => item.id === "prod")) {
    releaseSignals.push("prod environment is modeled");
  }
  if (workflows.count > 0) {
    releaseSignals.push(`${workflows.count} GitHub workflow file${workflows.count === 1 ? "" : "s"} detected`);
  }

  const continuitySignals = [];
  if (analysis.surfaces.workflow.session) {
    continuitySignals.push("repo-native session tracking exists");
  }
  if (analysis.surfaces.workflow.handoffs.length > 0) {
    continuitySignals.push(`${analysis.surfaces.workflow.handoffs.length} handoff surface${analysis.surfaces.workflow.handoffs.length === 1 ? "" : "s"} detected`);
  }
  if (analysis.repo.sharedRoot && analysis.repo.sharedRoot !== analysis.root) {
    continuitySignals.push("worktree-aware workflow is already in use");
  }

  const recurringFailureModes = [];
  for (const issue of scriptAudit.issues) {
    recurringFailureModes.push(issue.message);
  }
  const fullLifecycle = executionPolicy.lifecycle?.ship_modes?.full;
  if ((fullLifecycle?.gated_steps?.length ?? 0) > 0) {
    recurringFailureModes.push(`deep verification has shared-state steps that should stay promoted, not default: ${fullLifecycle.gated_steps.join(", ")}`);
  }
  if (!analysis.surfaces.workflow.agents) {
    recurringFailureModes.push("assistant startup context is missing, so workflow rediscovery cost will keep recurring");
  }

  return {
    release_pattern: releaseSignals.join("; ") || "release discipline is mostly implicit today",
    continuity_pattern: continuitySignals.join("; ") || "session continuity is still light",
    recurring_failure_modes: dedupe(recurringFailureModes).slice(0, 6),
    recent_signals: summarizeRecentSignals(history, recommendations)
  };
}

function summarizeRecentSignals(history, recommendations) {
  const signals = [];
  if ((history.commit_count ?? 0) > 0) {
    signals.push(`${history.commit_count} local commits available for pattern inference`);
  }
  const recentTypes = Object.entries(history.conventional_counts)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 3)
    .map(([id, count]) => `${id}:${count}`);
  if (recentTypes.length > 0) {
    signals.push(`recent commit mix ${recentTypes.join(", ")}`);
  }
  if (recommendations.length > 0) {
    signals.push(`top recommendations ${recommendations.slice(0, 2).map((item) => item.id).join(", ")}`);
  }
  return signals;
}

function buildResurfacingSignals({ analysis, executionPolicy, scriptAudit, recommendations, memory }) {
  const signals = [];
  const fullLifecycle = executionPolicy.lifecycle?.ship_modes?.full;
  if ((fullLifecycle?.gated_steps?.length ?? 0) > 0) {
    signals.push({
      id: "promote-gated-full-steps",
      phase: "ship",
      priority: "high",
      message: `Keep full-flow live verification explicit. Promote only when needed: ${fullLifecycle.gated_steps.join(", ")}.`
    });
  }
  if (scriptAudit.issues.some((item) => item.id === "root-test-is-lint")) {
    signals.push({
      id: "root-test-is-lint",
      phase: "ship",
      priority: "high",
      message: "Do not read root `test` as real release confidence until the repo splits lint from verification."
    });
  }
  if (!analysis.surfaces.workflow.agents || !analysis.surfaces.workflow.session || analysis.surfaces.workflow.handoffs.length === 0) {
    signals.push({
      id: "keep-workflow-context-current",
      phase: "session",
      priority: "medium",
      message: "Keep AGENTS, SESSION, and handoff surfaces current so restart cost does not creep back in."
    });
  }
  if (recommendations.some((item) => item.id === "surface-strengths-over-time")) {
    signals.push({
      id: "preserve-working-habits",
      phase: "always",
      priority: "medium",
      message: "Use Temper to keep the repo's good habits explicit instead of letting them drift back into chat."
    });
  }
  if ((memory.recurring_failure_modes?.length ?? 0) > 0) {
    signals.push({
      id: "watch-recurring-failure-modes",
      phase: "always",
      priority: "medium",
      message: `Recurring failure modes to keep visible: ${memory.recurring_failure_modes.slice(0, 2).join("; ")}`
    });
  }
  return signals;
}

function buildPreviewFilePlan(projectRoot, relativePath, content) {
  const filePath = path.join(projectRoot, relativePath);
  return {
    path: filePath,
    relativePath,
    action: classifyPreviewAction(filePath, content)
  };
}

function classifyPreviewAction(filePath, content) {
  if (!fs.existsSync(filePath)) {
    return "create";
  }
  return fs.readFileSync(filePath, "utf8") === content ? "unchanged" : "update";
}

function buildPreviewHabitChanges(runtimeCommand, executionPolicy) {
  const fullHooks = executionPolicy.hook_recommendations.full;
  const fullLifecycle = executionPolicy.lifecycle?.ship_modes?.full;
  const habitChanges = [
    `before major design or release guidance, run \`${runtimeCommand} coach --cwd . --json --intent "<user intent>"\``,
    `use \`${runtimeCommand} ship lite --cwd . --intent "<summary>"\` for narrow implementation confidence`,
    `use \`${runtimeCommand} ship full --cwd . --intent "<summary>"\` for player-facing, infra, economy, security, or multi-system work`,
    `keep \`SESSION.md\` short and update it through Temper-managed continuity surfaces`,
    `use \`${runtimeCommand} handoff --cwd . --slug <slug> --summary "<summary>" --next "<next step>"\` when pausing or transferring work`,
    "treat `temper.config.json`, `.temper/assistants/shared-canon.json`, and `.temper/assistants/*.md` as the repo-local operating contract"
  ];

  if (fullHooks.recommended_default.length > 0) {
    habitChanges.push(`default \`ship full\` stays local-first: ${fullHooks.recommended_default.join(", ")}`);
  }
  if (fullHooks.gated_live.length > 0) {
    habitChanges.push(`keep beta/live verification explicit for now: ${fullHooks.gated_live.join(", ")}`);
  }
  if (fullHooks.blocked_prod.length > 0) {
    habitChanges.push(`keep production-sensitive steps behind explicit confirmation: ${fullHooks.blocked_prod.join(", ")}`);
  }
  if ((fullLifecycle?.gated_steps?.length ?? 0) > 0) {
    habitChanges.push(`promote gated full-flow steps deliberately with \`${runtimeCommand} ship full --cwd . --promote <step>\``);
  }

  return habitChanges;
}

function buildPreviewRollback(fileChanges) {
  if (fileChanges.length === 0) {
    return ["nothing to roll back. preview mode does not write and the current install plan is already present."];
  }

  const rollback = [];
  if (fileChanges.some((item) => item.path === CONFIG_FILENAME || item.path.startsWith(".temper/"))) {
    rollback.push("delete `temper.config.json` and `.temper/`");
  }
  if (fileChanges.some((item) => item.path.startsWith(".claude/commands/temper-"))) {
    rollback.push("delete `.claude/commands/temper-*.md`");
  }

  const workflowHooks = fileChanges.filter((item) => item.path === "AGENTS.md" || item.path === "CLAUDE.md");
  if (workflowHooks.length > 0) {
    rollback.push(`remove the Temper runtime block from ${workflowHooks.map((item) => item.path).join(" and ")}`);
  }
  if (fileChanges.some((item) => item.path === "SESSION.md")) {
    rollback.push("remove the Temper session block from `SESSION.md`");
  }

  return rollback.length > 0 ? rollback : ["no manual rollback steps are needed beyond deleting generated Temper files."];
}

function normalizeOnboardingAnswers(config, options) {
  return {
    name: options.name || config.name,
    family: options.family || config.family,
    stack: options.stack || config.stack?.id || "",
    ...(config.environments?.beta ? { beta_branch: options.betaBranch || config.environments.beta.branch } : {}),
    ...(config.environments?.prod ? { prod_branch: options.prodBranch || config.environments.prod.branch } : {})
  };
}

function applyOnboardingAnswersToConfig(config, answers) {
  const environments = { ...(config.environments ?? {}) };
  if (answers.beta_branch && environments.beta) {
    environments.beta = {
      ...environments.beta,
      branch: answers.beta_branch
    };
  }
  if (answers.prod_branch && environments.prod) {
    environments.prod = {
      ...environments.prod,
      branch: answers.prod_branch
    };
  }

  return {
    ...config,
    name: answers.name || config.name,
    family: answers.family || config.family,
    stack: {
      ...(config.stack ?? {}),
      id: answers.stack || config.stack?.id || ""
    },
    environments
  };
}

function buildOnboardingReplyTemplate(userFacingNextMove, findings) {
  const { strengths, concerns } = findings;
  const lines = [];

  // Lead with what we found before the recommendation
  if (strengths.length > 0) {
    lines.push("Okay, I looked through the whole thing. A few things worth noting before we start:");
    lines.push("");
    lines.push("**What’s already in good shape:**");
    for (const s of strengths) {
      lines.push(`- ${s.text}`);
    }
  } else {
    lines.push("Okay, I looked through the whole thing.");
  }

  if (concerns.length > 0) {
    lines.push("");
    lines.push("**A couple of things to keep in mind:**");
    for (const c of concerns) {
      lines.push(`- ${c.title} ${c.impact}`);
    }
  }

  // Then the recommendation
  lines.push("");
  lines.push(userFacingNextMove.summary);
  lines.push("");
  lines.push(userFacingNextMove.confirm_prompt);

  // Alternatives
  if (userFacingNextMove.alternatives.length > 0) {
    lines.push("");
    lines.push("Or if you want to go a different direction:");
    for (const alt of userFacingNextMove.alternatives) {
      lines.push(`- ${alt.label} — say ${alt.reply}`);
    }
  }

  return lines.join("\n");
}

function buildOnboardingFindingTemplate(findings) {
  const { strengths, concerns } = findings;
  if (!strengths.length && !concerns.length) {
    return "Once the path is confirmed, I’ll walk through anything I found before applying anything.";
  }

  const lines = ["Once the path is clear, I’ll surface what I found:"];
  for (const s of strengths) {
    lines.push(`- (working well) ${s.text}`);
  }
  for (const c of concerns) {
    lines.push(`- (worth knowing) ${c.title} ${c.impact}`);
  }
  return lines.join("\n");
}

function isAnalysisUnreliable(analysis) {
  const nameLooksDirSlug = analysis.name === path.basename(analysis.root);
  const familyIsDefaultFallback = analysis.family.reasons?.some((r) => r.includes("default: no strong family signal"));
  return nameLooksDirSlug && familyIsDefaultFallback;
}

function buildAssistantAnalysisFindings(result, environments) {
  const strengths = [];
  const concerns = [];

  // Surface up to 3 computed strengths from the project analysis
  const computedStrengths = result.onboarding.strengths ?? [];
  for (const text of computedStrengths.slice(0, 3)) {
    strengths.push({ id: `strength-${strengths.length}`, text });
  }

  const recurringFailureModes = result.onboarding.memory?.recurring_failure_modes ?? [];
  const gatedFullSteps = result.onboarding.execution_policy?.lifecycle?.ship_modes?.full?.gated_steps ?? [];
  const branchSummary = [
    environments.beta?.branch ? `beta on \`${environments.beta.branch}\`` : null,
    environments.prod?.branch ? `prod on \`${environments.prod.branch}\`` : null
  ]
    .filter(Boolean)
    .join(" and ");

  if (result.onboarding.lifecycle?.id === "live") {
    concerns.push({
      id: "established-project",
      title: "This is a live project with real release infrastructure.",
      summary: `Found established repo history${branchSummary ? `, ${branchSummary},` : ""} and automation surfaces. That's worth protecting.`,
      impact: "Worth doing the rehearsal first so you can review exactly what Temper generates before it touches this repo.",
      default_action: "offer_dry_run_first"
    });
  }

  if (recurringFailureModes.some((item) => /root `test`/i.test(item))) {
    concerns.push({
      id: "root-test-is-lint",
      title: "The root test command is closer to lint than real release confidence.",
      summary: "The current root test path is mostly validation hygiene, not the full coverage story.",
      impact: "Temper will frame the ship flow accordingly — the assistant won't overstate what the test suite actually covers.",
      default_action: "keep_visible_in_ship_guidance"
    });
  }

  if (gatedFullSteps.length > 0) {
    concerns.push({
      id: "gated-live-verification",
      title: "Some verification steps touch shared state or real credentials.",
      summary: `These need to stay intentional: ${gatedFullSteps.join(", ")}.`,
      impact: "Temper keeps them gated by default — you promote them explicitly when you're ready to run them.",
      default_action: "gate_by_default"
    });
  }

  return { strengths, concerns };
}

function buildUserFacingNextMove(result, environments, findings = { strengths: [], concerns: [] }) {
  const lifecycle = result.onboarding.lifecycle?.id;
  const gatedFullSteps = result.onboarding.execution_policy?.lifecycle?.ship_modes?.full?.gated_steps ?? [];
  const branchNotes = [
    environments.beta?.branch ? `beta on \`${environments.beta.branch}\`` : null,
    environments.prod?.branch ? `prod on \`${environments.prod.branch}\`` : null
  ].filter(Boolean);

  const hasRealInfra = lifecycle === "live" || branchNotes.length > 0 || gatedFullSteps.length > 0;

  if (hasRealInfra) {
    const why = [
      branchNotes.length > 0
        ? `You have real release surfaces already in place — ${branchNotes.join(" and ")}. Worth keeping that intact.`
        : "This is an established project — not a blank slate — so it deserves a careful approach.",
      gatedFullSteps.length > 0
        ? `Some verification steps touch live credentials or shared state (${gatedFullSteps.join(", ")}) — those should stay under your explicit control.`
        : "A rehearsal lets you see exactly what Temper would generate before anything is written to this repo.",
      "We go in stages: review the rehearsal, make sure it looks right, then apply it here when you're ready."
    ];

    return {
      id: "existing_project_dry_run_first",
      title: "Recommended next move",
      summary:
        "Okay, I looked through everything. This is a real working project and I don't want to write files into it until you've seen exactly what I'd generate. My recommendation is a rehearsal first — a clean copy where I install Temper and you can inspect the output before committing to anything here.",
      command: "temper onboard existing --rehearse --cwd .",
      confirm_prompt: "Want to start there? Say `start the dry run` and I'll run it.",
      why,
      alternatives: [
        {
          id: "apply_here",
          label: "Skip the rehearsal and apply directly",
          reply: "`skip the rehearsal, apply it here`",
          command: "temper onboard existing --write --cwd ."
        },
        {
          id: "preview_only",
          label: "Just show me what would change, no install yet",
          reply: "`just show me the preview`",
          command: "temper onboard existing --preview --cwd ."
        }
      ],
      findings
    };
  }

  return {
    id: "existing_project_apply_here",
    title: "Recommended next move",
    summary:
      "Looked through the repo — it's a clean enough starting point that I'm comfortable applying Temper directly. Nothing here looks like it needs the extra caution of a rehearsal copy first.",
    command: "temper onboard existing --write --cwd .",
    confirm_prompt: "Ready to go? Say `apply it` and I'll write the install.",
    why: [
      "The repo shape is simple enough that direct install is the right call here.",
      "You can always do a rehearsal first if you'd rather inspect before committing — just say `start with a dry run`."
    ],
    alternatives: [
      {
        id: "dry_run_first",
        label: "Start with a rehearsal copy anyway",
        reply: "`start with a dry run instead`",
        command: "temper onboard existing --rehearse --cwd ."
      }
    ],
    findings
  };
}

function formatInterviewDefault(question) {
  const options = question.options ?? [];
  if (!options.length) {
    return question.default || "none";
  }

  return options.find((item) => item.value === question.default)?.label || question.default || "none";
}

function scanPackageDefinitions(root) {
  const files = [];
  visit(root);
  return files
    .map((filePath) => {
      try {
        const json = JSON.parse(fs.readFileSync(filePath, "utf8"));
        return {
          filePath,
          relativePath: rel(root, path.dirname(filePath)),
          packageName: json.name || null,
          scripts: json.scripts ?? {}
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  function visit(current) {
    let entries = [];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const absolutePath = path.join(current, entry.name);
      const relativePath = rel(root, absolutePath);

      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) {
          continue;
        }
        if (relativePath.startsWith(".claude/worktrees/")) {
          continue;
        }
        visit(absolutePath);
      } else if (entry.isFile() && entry.name === "package.json") {
        files.push(absolutePath);
      }
    }
  }
}

function findScriptBody(commandConfig, packageCatalog) {
  const source = String(commandConfig?.source ?? "");
  const rootMatch = source.match(/^root:scripts\.(.+)$/);
  if (rootMatch) {
    const rootEntry = packageCatalog.find((entry) => entry.relativePath === ".");
    return rootEntry?.scripts?.[rootMatch[1]] ?? null;
  }

  const workspaceMatch = source.match(/^(.+?):scripts\.(.+)$/);
  if (!workspaceMatch) {
    return null;
  }
  const [, packageName, scriptName] = workspaceMatch;
  const entry = packageCatalog.find((item) => item.packageName === packageName);
  return entry?.scripts?.[scriptName] ?? null;
}

function detectWorkflowTriggers(text) {
  const triggers = [];
  for (const trigger of ["push", "pull_request", "workflow_dispatch", "schedule"]) {
    if (new RegExp(`\\b${trigger}\\b`, "i").test(text)) {
      triggers.push(trigger);
    }
  }
  return triggers;
}

function detectWorkflowEnvironments(text) {
  const environments = [];
  for (const id of ["local", "beta", "staging", "testnet", "prod", "production", "mainnet"]) {
    if (new RegExp(`\\b${id}\\b`, "i").test(text)) {
      environments.push(id);
    }
  }
  return environments;
}

function formatWorkflowSurfaces(workflow) {
  return Object.entries(workflow)
    .filter(([, value]) => Boolean(value) && (!Array.isArray(value) || value.length > 0))
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        return `${key}=${value.join(", ")}`;
      }
      return `${key}=${value}`;
    })
    .join("; ");
}

function formatHistory(history) {
  const count = history.commit_count ?? "unknown";
  const conventional = Object.entries(history.conventional_counts)
    .map(([key, value]) => `${key}:${value}`)
    .join(", ");
  return `${count} commits${conventional ? `; recent types ${conventional}` : ""}`;
}

function tokenBand(score) {
  if (score >= 85) {
    return "~2K-5K tokens";
  }
  if (score >= 65) {
    return "~5K-15K tokens";
  }
  if (score >= 40) {
    return "~15K-40K tokens";
  }
  return "~40K-80K tokens";
}

function runGit(cwd, args) {
  try {
    return execFileSync("git", ["-C", cwd, ...args], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim();
  } catch {
    return "";
  }
}

function rel(projectRoot, targetPath) {
  return path.relative(path.resolve(projectRoot), path.resolve(targetPath)).replace(/\\/g, "/") || ".";
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
