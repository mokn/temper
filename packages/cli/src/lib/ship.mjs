import { execFileSync } from "node:child_process";
import path from "node:path";
import { buildCoachPacket } from "./coach.mjs";
import { loadProjectConfig, commandCwd, rel } from "./project-config.mjs";
import { gatherRepoContext } from "./repo-context.mjs";

export function runShip(options = {}) {
  const cwd = path.resolve(options.cwd ?? process.cwd());
  const config = loadProjectConfig({ cwd });
  const projectRoot = config.__projectRoot;
  const mode = options.mode === "full" ? "full" : "lite";
  const repo = gatherRepoContext({ cwd: projectRoot });
  const input = {
    ...options,
    cwd: projectRoot,
    capabilities: dedupe([...(options.capabilities ?? []), "ship"]),
    mode,
    repo: true
  };
  const coach = buildCoachPacket(input);
  const environment = inferEnvironment(config, repo.branch, options.env);
  const policy = resolveShipPolicy(config, mode, options);
  const steps = policy.selected_steps.map((stepId) => ({
    id: stepId,
    config: config.commands?.[stepId] ?? null
  }));

  const warnings = [];
  if (repo.available && repo.isDirty) {
    warnings.push("repo is dirty");
  }
  if (environment.id === "prod" && repo.available && repo.isDirty) {
    warnings.push("production-targeted flow from dirty worktree");
  }
  if (policy.promoted_steps.length > 0) {
    warnings.push(`running promoted gated steps: ${policy.promoted_steps.join(", ")}`);
  }

  const resurfacing = collectResurfacing(config, policy);
  warnings.push(...resurfacing.filter((item) => item.priority === "high").map((item) => item.message));

  const execution = executeSteps(projectRoot, steps, options.dryRun === true);
  const patchNotes = buildPatchNotes(projectRoot, repo, coach, execution);

  return {
    version: "0.1",
    type: "temper.ship.report",
    project: {
      name: config.name,
      root: projectRoot,
      family: config.family,
      stack: config.stack
    },
    mode,
    environment,
    repo: summarizeRepo(repo, projectRoot),
    coach: {
      selection: coach.selection,
      render: coach.render
    },
    plan: {
      blessed_steps: policy.blessed_steps,
      gated_steps: policy.gated_steps,
      promoted_steps: policy.promoted_steps,
      discovered_steps: policy.discovered_steps,
      steps: steps.map((step) => ({
        id: step.id,
        cmd: step.config?.cmd ?? null,
        cwd: step.config ? commandCwd(projectRoot, step.config) : null
      }))
    },
    policy,
    execution,
    patch_notes: patchNotes,
    resurfacing,
    warnings
  };
}

export function printShipReport(report) {
  console.log(`Project: ${report.project.name}`);
  console.log(`Mode: ${report.mode}`);
  console.log(`Environment: ${report.environment.id}`);

  if (report.repo.available) {
    console.log(`Repo: ${report.repo.branch} | ${report.repo.dirty ? "dirty" : "clean"} | changed ${report.repo.counts.changed}`);
  }

  if (report.warnings.length > 0) {
    console.log("");
    console.log("Warnings:");
    for (const warning of report.warnings) {
      console.log(`- ${warning}`);
    }
  }

  console.log("");
  console.log("Policy:");
  console.log(`- blessed default: ${report.plan.blessed_steps.join(", ") || "none"}`);
  console.log(`- gated available: ${report.plan.gated_steps.join(", ") || "none"}`);
  console.log(`- promoted this run: ${report.plan.promoted_steps.join(", ") || "none"}`);

  console.log("");
  console.log("Execution:");
  for (const step of report.execution.steps) {
    const label = step.skipped ? "skipped" : step.ok ? "ok" : "failed";
    console.log(`- ${step.id}: ${label}`);
    if (step.cmd) {
      console.log(`  cmd: ${step.cmd.join(" ")}`);
    }
    if (step.stdout_excerpt) {
      console.log(`  stdout: ${step.stdout_excerpt}`);
    }
    if (step.stderr_excerpt) {
      console.log(`  stderr: ${step.stderr_excerpt}`);
    }
  }

  console.log("");
  console.log("Review Routing:");
  console.log(`- hats: ${report.coach.selection.hats.map((item) => `${item.emoji} ${item.id}`).join(", ") || "none"}`);
  console.log(`- capabilities: ${report.coach.selection.capabilities.map((item) => item.id).join(", ") || "none"}`);
  if (report.coach.selection.families.length > 0) {
    console.log(`- families: ${report.coach.selection.families.map((item) => item.id).join(", ")}`);
  }

  console.log("");
  console.log("Patch Notes:");
  for (const line of report.patch_notes.summary) {
    console.log(`- ${line}`);
  }
  if (report.patch_notes.release_notes_output) {
    console.log("");
    console.log("Release Notes Command:");
    console.log(report.patch_notes.release_notes_output);
  }

  if (report.resurfacing.length > 0) {
    console.log("");
    console.log("Temper Reminders:");
    for (const item of report.resurfacing) {
      console.log(`- [${item.priority}] ${item.message}`);
    }
  }
}

function resolveShipPolicy(config, mode, options) {
  const shipMode = config.ship?.[mode] ?? { steps: [] };
  const lifecycleMode = config.execution_policy?.lifecycle?.ship_modes?.[mode] ?? {};
  const blessed_steps = shipMode.steps ?? [];
  const gated_steps = shipMode.gated_steps ?? lifecycleMode.gated_steps ?? [];
  const discovered_steps = shipMode.discovered_steps ?? lifecycleMode.discovered_steps ?? dedupe([...blessed_steps, ...gated_steps]);
  const prod_confirmation_steps = lifecycleMode.prod_confirmation_steps ?? [];
  const promoted_steps = dedupe(options.promote ?? []);

  const invalidPromotions = promoted_steps.filter((stepId) => !gated_steps.includes(stepId));
  if (invalidPromotions.length > 0) {
    throw new Error(`Cannot promote unknown or non-gated step(s): ${invalidPromotions.join(", ")}`);
  }

  const prodPromotions = promoted_steps.filter((stepId) => prod_confirmation_steps.includes(stepId));
  if (prodPromotions.length > 0 && options.confirmProd !== true) {
    throw new Error(`Promoting prod-sensitive step(s) requires --confirm-prod: ${prodPromotions.join(", ")}`);
  }

  return {
    mode,
    discovered_steps,
    blessed_steps,
    gated_steps,
    promoted_steps,
    prod_confirmation_steps,
    selected_steps: discovered_steps.filter((stepId) => blessed_steps.includes(stepId) || promoted_steps.includes(stepId)),
    promote_command: config.execution_policy?.lifecycle?.promote_command ?? "temper ship <lite|full> --promote <step>"
  };
}

function collectResurfacing(config, policy) {
  const signals = config.onboarding?.resurfacing ?? [];
  return signals.filter((item) => {
    if (item.phase === "always") {
      return true;
    }
    if (item.phase === "ship") {
      return true;
    }
    if (item.phase === "session") {
      return policy.promoted_steps.length > 0;
    }
    return false;
  });
}

function executeSteps(projectRoot, steps, dryRun) {
  const results = [];
  let ok = true;

  for (const step of steps) {
    if (!step.config) {
      results.push({
        id: step.id,
        ok: false,
        skipped: false,
        cmd: null,
        stdout_excerpt: "",
        stderr_excerpt: "missing command config"
      });
      ok = false;
      break;
    }

    if (dryRun) {
      results.push({
        id: step.id,
        ok: true,
        skipped: true,
        cmd: step.config.cmd,
        stdout_excerpt: "",
        stderr_excerpt: ""
      });
      continue;
    }

    const cwd = commandCwd(projectRoot, step.config);
    const result = executeCommand(step.id, step.config.cmd, cwd);
    results.push(result);
    if (!result.ok && step.id !== "release_notes") {
      ok = false;
      break;
    }
  }

  return {
    ok,
    dry_run: dryRun,
    steps: results
  };
}

function executeCommand(id, cmd, cwd) {
  try {
    const stdout = execFileSync(cmd[0], cmd.slice(1), {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });

    return {
      id,
      ok: true,
      skipped: false,
      cmd,
      cwd,
      stdout_excerpt: excerpt(stdout),
      stderr_excerpt: ""
    };
  } catch (error) {
    return {
      id,
      ok: false,
      skipped: false,
      cmd,
      cwd,
      stdout_excerpt: excerpt(error.stdout),
      stderr_excerpt: excerpt(error.stderr || error.message)
    };
  }
}

function buildPatchNotes(projectRoot, repo, coach, execution) {
  const changedFiles = coach.input?.files ?? (repo.available ? repo.changedFiles : []);
  const categories = [];

  if (changedFiles.some((file) => /(items|effects|monsters|abilities|worlds|contracts)/i.test(file))) {
    categories.push("Game-data or contracts changed.");
  }
  if (changedFiles.some((file) => /(client|ui|hud|tutorial|pages|components)/i.test(file))) {
    categories.push("Player-facing client surfaces changed.");
  }
  if (changedFiles.some((file) => /(indexer|relayer|deploy|infra|railway|vercel|auth|security)/i.test(file))) {
    categories.push("Infra or trust surfaces changed.");
  }
  if (categories.length === 0) {
    categories.push("Scoped implementation work with no strongly typed player-facing category detected.");
  }

  const summary = [
    `Primary hat: ${formatHat(reportPrimaryHat(coach))}`,
    `Review overlays: ${coach.selection.capabilities.map((item) => item.id).join(", ") || "none"}`,
    ...categories
  ];

  const releaseNotesOutput = execution.steps.find((step) => step.id === "release_notes" && step.stdout_excerpt)?.stdout_excerpt ?? "";
  return {
    summary,
    release_notes_output: releaseNotesOutput
  };
}

function inferEnvironment(config, branch, explicitEnv) {
  if (explicitEnv && config.environments?.[explicitEnv]) {
    return {
      id: explicitEnv,
      ...config.environments[explicitEnv]
    };
  }

  for (const [id, definition] of Object.entries(config.environments ?? {})) {
    if (definition.branch === branch) {
      return {
        id,
        ...definition
      };
    }
  }

  return {
    id: "local",
    ...(config.environments?.local ?? { label: "Local", branch: "*" })
  };
}

function summarizeRepo(repo, projectRoot) {
  if (!repo.available) {
    return {
      available: false,
      reason: repo.reason
    };
  }

  return {
    available: true,
    branch: repo.branch,
    dirty: repo.isDirty,
    counts: repo.counts,
    changed_files: repo.changedFiles.map((file) => rel(projectRoot, path.join(projectRoot, file)))
  };
}

function excerpt(value) {
  const text = String(value ?? "").trim();
  if (!text) {
    return "";
  }
  return text.split(/\r?\n/).slice(-6).join(" | ");
}

function reportPrimaryHat(coach) {
  return coach.render?.primary_hat ? `${coach.render.primary_hat.emoji} ${coach.render.primary_hat.id}` : "none";
}

function formatHat(value) {
  return value || "none";
}

function dedupe(items) {
  return [...new Set(items.filter(Boolean))];
}
