import fs from "node:fs";
import path from "node:path";
import { repoRoot, specRoot } from "./lib/paths.mjs";
import { deriveCanonDocs, inspectDoctrine, searchDoctrine } from "./lib/doctrine.mjs";
import { buildCoachPacket, parseCoachArgs } from "./lib/coach.mjs";
import { installAssistantAdapters } from "./lib/assistant.mjs";
import {
  analyzeProject,
  createConfigFromAnalysis,
  renderAdoptionReport
} from "./lib/project-analysis.mjs";
import {
  buildOnboardingInterview,
  applyTemperUninstall,
  buildExistingProjectOnboarding,
  buildOnboardingInstallPreview,
  materializeOnboardingInstall,
  planTemperUninstall,
  renderOnboardingInterview,
  renderOnboardingPreview,
  renderTemperUninstallPreview,
  runExistingProjectOnboardingRehearsal
} from "./lib/onboarding.mjs";
import {
  applySessionPlan,
  applyHandoffPlan,
  buildSessionPlan,
  buildHandoffPlan,
  materializeContinuityInstall,
  readSessionState,
  renderHandoffPreview,
  renderSessionPreview
} from "./lib/continuity.mjs";
import { buildInspectReport } from "./lib/inspect.mjs";
import {
  CONFIG_FILENAME,
  findConfig,
  findProjectRoot,
  loadProjectConfig,
  writeProjectConfig,
  writeProjectFile
} from "./lib/project-config.mjs";
import { listRunArtifacts, loadRunArtifact, recordRunArtifact } from "./lib/run-artifacts.mjs";
import { printShipReport, runShip } from "./lib/ship.mjs";
import { printHeader, printList, printTemperBanner } from "./lib/output.mjs";
import { evaluateRestartReadiness, renderRestartEval } from "./lib/restart-eval.mjs";

const capabilityCommands = new Set([
  "init",
  "adopt",
  "doctor",
  "ship",
  "hotfix",
  "review",
  "verify",
  "handoff",
  "security",
  "infra",
  "deploy",
  "balance",
  "audit",
  "ux",
  "future"
]);

export async function main(argv) {
  const [command = "help", ...rest] = argv;

  if (command === "help" || command === "--help" || command === "-h") {
    return showHelp();
  }

  if (command === "doctor") {
    return runDoctor();
  }

  if (command === "derive") {
    return runDerive();
  }

  if (command === "query") {
    return runQuery(rest);
  }

  if (command === "coach") {
    return runCoach(rest);
  }

  if (command === "inspect") {
    return runInspect(rest);
  }

  if (command === "runs") {
    return runRuns(rest);
  }

  if (command === "session") {
    return runSession(rest);
  }

  if (command === "eval") {
    return runEval(rest);
  }

  if (command === "assistant") {
    return runAssistant(rest);
  }

  if (command === "onboard") {
    return runOnboard(rest);
  }

  if (command === "uninstall" || command === "reset") {
    return runUninstall(rest);
  }

  if (command === "handoff") {
    return runHandoff(rest);
  }

  if (capabilityCommands.has(command)) {
    return runCapability(command, rest);
  }

  throw new Error(`Unknown command: ${command}`);
}

function showHelp() {
  printTemperBanner("Project onboarding and operating system for AI-assisted game teams");
  console.log("");
  console.log("Commands:");
  printList([
    "onboard existing [--cwd ...] [--interview] [--preview|--dry-run] [--write] [--rehearse] [--lab first-run] [--out <dir>] [--name <name>] [--family <id>] [--stack <id>] [--beta-branch <branch>] [--prod-branch <branch>] [--assistant claude,codex]",
    "uninstall [--cwd ...] [--preview|--dry-run] [--write]",
    "doctor",
    "derive",
    "query <terms>",
    "coach [--json] [--intent ...] [--hat ...] [--capability ...] [--cwd ...] [--no-repo]",
    "inspect [--cwd ...] [--json]",
    "runs [ls|show <id>] [--cwd ...] [--json]",
    "session [show|set] [--cwd ...] [--workstream ...] [--status ...] [--next ...] [--handoff ...] [--write]",
    "eval restart [--cwd ...] [--json]",
    "assistant <install|show>",
    "init [--cwd ...] [--family ...] [--stack ...] [--existing]",
    "adopt [--cwd ...] [--write] [--assistant claude,codex]",
    "ship [lite|full]",
    "hotfix",
    "review",
    "verify",
    "handoff [--cwd ...] [--slug ...] [--summary ...] [--next ...] [--write]",
    "security",
    "infra",
    "deploy",
    "balance",
    "audit",
    "ux",
    "future"
  ]);
}

function runDoctor() {
  printHeader("Temper Doctor");

  const doctrine = inspectDoctrine();
  console.log(`Repo root: ${repoRoot}`);
  console.log(`Spec docs present: ${fs.existsSync(specRoot) ? "yes" : "no"}`);
  console.log(`Canonical docs: ${doctrine.canonDocCount}`);
  console.log(
    `Breakdown: hats ${doctrine.grouped.hats}, architecture ${doctrine.grouped.architecture}, capabilities ${doctrine.grouped.capabilities}, other ${doctrine.grouped.other}`
  );

  const configPath = findConfig(process.cwd());
  if (configPath) {
    const config = loadProjectConfig({ cwd: process.cwd() });
    console.log(`Config: ${configPath}`);
    console.log(`Project: ${config.name}`);
    console.log(`Family: ${config.family}`);
    console.log(`Stack: ${config.stack?.id ?? "unknown"}`);
    console.log(`Ship lite: ${(config.ship?.lite?.steps ?? []).join(", ") || "none"}`);
    console.log(`Ship full: ${(config.ship?.full?.steps ?? []).join(", ") || "none"}`);
  } else {
    console.log(`Config: none (${CONFIG_FILENAME} not found from current cwd)`);
  }
}

function runDerive() {
  printHeader("Temper Derive");
  const results = deriveCanonDocs();
  for (const result of results) {
    console.log(`${result.docId}: ${result.sectionCount} sections`);
  }
}

function runQuery(rest) {
  const query = rest.join(" ").trim();
  if (!query) {
    throw new Error("Usage: temper query <terms>");
  }

  printHeader("Temper Query");
  console.log(`Query: ${query}`);
  console.log("");

  const results = searchDoctrine(query);
  if (results.length === 0) {
    console.log("No matches.");
    return;
  }

  for (const result of results) {
    console.log(`${result.score.toString().padStart(2, " ")}  ${result.doc} :: ${result.title}`);
    console.log(`    ${result.summary}`);
  }
}

function runCoach(rest) {
  const input = parseCoachArgs(rest);
  if (!input.queryText && input.hats.length === 0 && input.capabilities.length === 0 && input.families.length === 0 && input.files.length === 0) {
    throw new Error(
      "Usage: temper coach [--json] --intent <text> [--hat <id>] [--capability <id>] [--family <id>] [--files <path1,path2>]"
    );
  }

  const packet = buildCoachPacket(input);

  if (input.json) {
    console.log(JSON.stringify(packet, null, 2));
    return;
  }

  printCoachPacket("Temper Coach", packet);
}

function runInspect(rest) {
  const args = parseCommonArgs(rest);
  const report = buildInspectReport({ cwd: args.cwd });

  if (args.json) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  printHeader("Temper Inspect");
  console.log(`Root: ${report.project.root}`);
  console.log(`Project: ${report.project.name}`);
  console.log(`Config: ${report.config.present ? report.config.path : "none"}`);

  if (report.repo.available) {
    console.log(`Repo: ${report.repo.branch} | ${report.repo.dirty ? "dirty" : "clean"} | changed ${report.repo.counts.changed}`);
  }

  console.log("");
  console.log("Assistants:");
  printList(renderInspectFileLines(report.assistants));

  console.log("");
  console.log("Continuity:");
  printList([
    `session: ${report.continuity.session_file.present ? report.continuity.session_file.path : "missing"}`,
    ...renderInspectFileLines(report.continuity.workflow_files),
    `handoffs: ${report.continuity.handoff_count}`
  ]);

  if (report.execution_policy) {
    console.log("");
    console.log("Execution Policy:");
    printList([
      `stages: ${report.execution_policy.stages.join(" -> ") || "none"}`,
      `lite blessed: ${report.execution_policy.lite.blessed.join(", ") || "none"}`,
      `lite gated: ${report.execution_policy.lite.gated.join(", ") || "none"}`,
      `full blessed: ${report.execution_policy.full.blessed.join(", ") || "none"}`,
      `full gated: ${report.execution_policy.full.gated.join(", ") || "none"}`
    ]);
  }

  console.log("");
  console.log("Runs:");
  printList(
    report.runs.latest.length > 0
      ? report.runs.latest.map((item) => `${item.run_id} | ${item.command} ${item.action} | ${item.status}`)
      : ["none"]
  );
}

function runRuns(rest) {
  const [subcommand = "ls", maybeId, ...subRest] = rest;
  if (subcommand !== "ls" && subcommand !== "show") {
    throw new Error("Usage: temper runs [ls|show <id>] [--cwd ...] [--json]");
  }

  if (subcommand === "show") {
    const args = parseCommonArgs(subRest);
    const artifact = loadRunArtifact({
      cwd: args.cwd,
      id: maybeId || "latest"
    });

    if (args.json) {
      console.log(JSON.stringify(artifact, null, 2));
      return;
    }

    printHeader("Temper Run");
    console.log(`Root: ${findProjectRoot(args.cwd)}`);
    console.log(`Run: ${artifact.run_id}`);
    console.log(`Recorded: ${artifact.recorded_at}`);
    console.log(`Command: ${artifact.command} ${artifact.action}`);
    console.log(`Status: ${artifact.summary?.status || "unknown"}`);
    console.log(`Artifact: ${artifact.relative_path}`);
    console.log("");
    console.log(JSON.stringify(artifact.payload, null, 2));
    return;
  }

  const args = parseCommonArgs([maybeId, ...subRest].filter(Boolean));
  const artifacts = listRunArtifacts({ cwd: args.cwd });

  if (args.json) {
    console.log(JSON.stringify(artifacts, null, 2));
    return;
  }

  printHeader("Temper Runs");
  console.log(`Root: ${findProjectRoot(args.cwd)}`);
  if (artifacts.length === 0) {
    console.log("No runs recorded.");
    return;
  }

  console.log("");
  printList(
    artifacts.map(
      (item) =>
        `${item.run_id} | ${item.command} ${item.action} | ${item.summary?.status || "unknown"} | ${item.repo?.branch || "unknown"}`
    )
  );
}

function runSession(rest) {
  const [subcommand = "show", ...subRest] = rest;
  if (subcommand !== "show" && subcommand !== "set") {
    throw new Error("Usage: temper session [show|set] [--cwd ...] [--workstream ...] [--status ...] [--next ...] [--handoff ...] [--write]");
  }

  if (subcommand === "show") {
    const args = parseCommonArgs(subRest);
    const state = readSessionState({ cwd: args.cwd });

    if (args.json) {
      console.log(JSON.stringify(state, null, 2));
      return;
    }

    printHeader("Temper Session");
    console.log(`Root: ${state.projectRoot}`);
    console.log("");
    printList(
      state.sessionState.entries.length > 0
        ? state.sessionState.entries.map(
            (entry) => `${entry.workstream} | ${entry.branch} | ${entry.status} | next: ${entry.next} | handoff: ${entry.handoff}`
          )
        : ["none"]
    );
    return;
  }

  const args = parseSessionArgs(subRest);
  const plan = buildSessionPlan({
    cwd: args.cwd,
    workstream: args.workstream,
    branch: args.branch,
    status: args.status,
    next: args.next,
    handoff: args.handoff
  });

  if (args.json) {
    const payload = args.write ? applySessionPlan(plan) : plan;
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  if (args.write) {
    const result = applySessionPlan(plan);
    const recorded = recordRunArtifact({
      cwd: result.projectRoot,
      command: "session",
      action: "write",
      payload: {
        entry: result.entry,
        sessionPath: relativize(result.projectRoot, result.sessionPath),
        sessionStatePath: relativize(result.projectRoot, result.sessionStatePath)
      }
    });
    printHeader("Temper Session");
    console.log(`Root: ${result.projectRoot}`);
    console.log(`Session: ${result.sessionPath}`);
    console.log(`Run Artifact: ${recorded.relativePath}`);
    return;
  }

  printHeader("Temper Session");
  console.log(`Root: ${plan.projectRoot}`);
  console.log("");
  process.stdout.write(renderSessionPreview(plan));
  console.log("Run with --write to record this session update.");
}

function runEval(rest) {
  const [subcommand = "restart", ...subRest] = rest;
  if (subcommand !== "restart") {
    throw new Error("Usage: temper eval restart [--cwd ...] [--json]");
  }

  const args = parseCommonArgs(subRest);
  const report = evaluateRestartReadiness({ cwd: args.cwd });

  if (args.json) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  process.stdout.write(renderRestartEval(report));
}

async function runCapability(command, rest) {
  const supportsCoach = new Set(["ship", "hotfix", "balance", "ux", "security", "infra"]);
  const capabilityRest = [...rest];
  const mode =
    command === "ship" && (capabilityRest[0] === "full" || capabilityRest[0] === "lite")
      ? capabilityRest.shift()
      : command === "ship"
        ? "lite"
        : null;

  if (command === "init") {
    return runInit(capabilityRest);
  }

  if (command === "adopt") {
    return runAdopt(capabilityRest);
  }

  if (command === "ship") {
    const input = parseCoachArgs(capabilityRest);
    input.capabilities = dedupeLocal([...(input.capabilities ?? []), command]);
    input.event = input.event || command;
    input.mode = input.mode || mode || "lite";
    if (!input.intent && input.positional.length > 0) {
      input.intent = input.positional.join(" ");
    }
    if (input.json) {
      const report = await runShip({
        ...input,
        mode: input.mode,
        streamOutput: false
      });
      console.log(JSON.stringify(report, null, 2));
      return;
    }

    printHeader("Temper Ship");
    const report = await runShip({
      ...input,
      mode: input.mode,
      streamOutput: true
    });

    const recorded =
      report.execution.dry_run === true
        ? null
        : recordRunArtifact({
            cwd: input.cwd,
            command: "ship",
            action: input.mode,
            payload: report
          });

    console.log("");
    printShipReport(report);
    if (recorded) {
      console.log("");
      console.log(`Run Artifact: ${recorded.relativePath}`);
    }
    return;
  }

  if (supportsCoach.has(command)) {
    const input = parseCoachArgs(capabilityRest);
    input.capabilities = dedupeLocal([...(input.capabilities ?? []), command]);
    input.event = input.event || command;
    if (mode) {
      input.mode = input.mode || mode;
    }
    if (!input.intent && input.positional.length > 0) {
      input.intent = input.positional.join(" ");
      input.queryText = [input.query, input.intent, input.notes].filter(Boolean).join(" ").trim();
    }

    const packet = buildCoachPacket(input);

    if (input.json) {
      console.log(JSON.stringify(packet, null, 2));
      return;
    }

    printCoachPacket(`Temper ${capitalize(command)}`, packet, {
      mode
    });
    return;
  }

  const detail = capabilityRest.join(" ").trim();

  printHeader(`Temper ${capitalize(command)}`);

  console.log("Status: scaffolded capability");
  if (mode) {
    console.log(`Mode: ${mode}`);
  }
  if (detail) {
    console.log(`Input: ${detail}`);
  }

  const doctrinePath = path.join(repoRoot, "canon", "capabilities", `${command}.md`);
  if (fs.existsSync(doctrinePath)) {
    console.log(`Doctrine: canon/capabilities/${command}.md`);
  } else {
    console.log("Doctrine: not yet authored");
  }

  console.log("Implementation note: runtime orchestration not built yet.");
}

function runInit(rest) {
  if (rest.includes("--existing") || rest[0] === "existing") {
    return runOnboard(["existing", ...rest.filter((item, index) => item !== "--existing" && !(index === 0 && item === "existing"))]);
  }

  const args = parseCommonArgs(rest);
  const analysis = analyzeProject({ cwd: args.cwd });
  const config = createConfigFromAnalysis(analysis, {
    mode: "initialized",
    family: args.family,
    stack: args.stack,
    name: args.name
  });
  const configPath = writeProjectConfig(analysis.root, config, {
    force: args.force
  });
  const written = installAssistantAdapters({
    projectRoot: analysis.root,
    config,
    analysis,
    assistants: args.assistants
  });
  const continuity = materializeContinuityInstall({
    projectRoot: analysis.root,
    config,
    analysis
  });
  const recorded = recordRunArtifact({
    cwd: analysis.root,
    command: "init",
    action: "write",
    payload: {
      configPath: relativize(analysis.root, configPath),
      generated: [...continuity.written, ...written]
    }
  });

  printHeader("Temper Init");
  console.log(`Root: ${analysis.root}`);
  console.log(`Config: ${configPath}`);
  console.log(`Family: ${config.family}`);
  console.log(`Stack: ${config.stack.id}`);
  console.log("");
  console.log("Generated:");
  printList([relativize(analysis.root, configPath), ...continuity.written, ...written]);
  console.log("");
  console.log(`Run Artifact: ${recorded.relativePath}`);
}

function runOnboard(rest) {
  const [subcommand = "existing", ...subRest] = rest;
  if (subcommand !== "existing") {
    throw new Error(
      "Usage: temper onboard existing [--cwd ...] [--interview] [--preview|--dry-run] [--write] [--rehearse] [--lab first-run] [--out <dir>] [--name <name>] [--family <id>] [--stack <id>] [--beta-branch <branch>] [--prod-branch <branch>] [--assistant claude,codex]"
    );
  }

  const args = parseCommonArgs(subRest);
  const actionModes = [
    args.interview ? "interview" : null,
    args.preview ? "preview" : null,
    args.write ? "write" : null,
    args.rehearse ? "rehearse" : null
  ].filter(Boolean);
  if (actionModes.length > 1) {
    throw new Error("Choose one of --interview, --preview/--dry-run, --write, or --rehearse.");
  }

  if (args.rehearse) {
    const rehearsal = runExistingProjectOnboardingRehearsal({
      cwd: args.cwd,
      family: args.family,
      stack: args.stack,
      name: args.name,
      betaBranch: args.betaBranch,
      prodBranch: args.prodBranch,
      assistants: args.assistants,
      lab: args.lab,
      out: args.out
    });

    if (args.json) {
      console.log(
        JSON.stringify(
          {
            source_root: rehearsal.sourceRoot,
            rehearsal_root: rehearsal.rehearsalRoot,
            reset: rehearsal.reset,
            generated: {
              config: rehearsal.generated.configPath,
              continuity: rehearsal.generated.continuity.written,
              onboarding_report: rehearsal.generated.onboardingPath,
              onboarding_json: rehearsal.generated.onboardingJsonPath,
              adoption_report: rehearsal.generated.adoptionPath,
              rehearsal_report: rehearsal.generated.rehearsalPath,
              assistant_files: rehearsal.generated.written
            },
            analysis: rehearsal.result.analysis,
            config: rehearsal.result.config,
            onboarding: rehearsal.result.onboarding,
            report: rehearsal.result.report
          },
          null,
          2
        )
      );
      return;
    }

    printTemperBanner("First-run onboarding rehearsal complete");
    console.log("");
    console.log(`Source: ${rehearsal.sourceRoot}`);
    console.log(`Rehearsal: ${rehearsal.rehearsalRoot}`);
    console.log(`Onboarding Report: ${rehearsal.generated.onboardingPath}`);
    console.log(`Adoption Report: ${rehearsal.generated.adoptionPath}`);
    console.log(`Replay Manifest: ${rehearsal.generated.rehearsalPath}`);
    console.log("");
    console.log("Reset:");
    printList(rehearsal.reset.length > 0 ? rehearsal.reset : ["no prior Temper install artifacts found"]);
    console.log("");
    console.log("Generated:");
    printList([
      relativize(rehearsal.rehearsalRoot, rehearsal.generated.configPath),
      ...rehearsal.generated.continuity.written,
      relativize(rehearsal.rehearsalRoot, rehearsal.generated.onboardingPath),
      relativize(rehearsal.rehearsalRoot, rehearsal.generated.onboardingJsonPath),
      relativize(rehearsal.rehearsalRoot, rehearsal.generated.adoptionPath),
      relativize(rehearsal.rehearsalRoot, rehearsal.generated.rehearsalPath),
      ...rehearsal.generated.written
    ]);
    return;
  }

  const result = buildExistingProjectOnboarding({
    cwd: args.cwd,
    family: args.family,
    stack: args.stack,
    name: args.name,
    betaBranch: args.betaBranch,
    prodBranch: args.prodBranch
  });
  const preview = buildOnboardingInstallPreview({
    result,
    assistants: args.assistants
  });
  const interview = buildOnboardingInterview({
    cwd: args.cwd,
    family: args.family,
    stack: args.stack,
    name: args.name,
    betaBranch: args.betaBranch,
    prodBranch: args.prodBranch
  });

  if (args.json) {
    if (args.interview) {
      console.log(
        JSON.stringify(
          {
            interview
          },
          null,
          2
        )
      );
      return;
    }

    console.log(
      JSON.stringify(
        {
          analysis: result.analysis,
          config: result.config,
          onboarding: result.onboarding,
          report: result.report,
          ...(args.preview ? { preview } : {})
        },
        null,
        2
      )
    );
    return;
  }

  if (args.interview) {
    printTemperBanner("Existing project onboarding interview");
    console.log("");
    console.log(`Root: ${result.analysis.root}`);
    console.log("");
    process.stdout.write(renderOnboardingInterview(interview));
    return;
  }

  if (args.preview) {
    printTemperBanner("Existing project onboarding preview");
    console.log("");
    console.log(`Root: ${result.analysis.root}`);
    console.log("");
    process.stdout.write(renderOnboardingPreview(preview));
    console.log("");
    process.stdout.write(result.report);
    console.log("Run with --interview to get the user-facing questions, --write to materialize this plan, or --rehearse to replay it in a disposable lab.");
    return;
  }

  if (args.write) {
    const generated = materializeOnboardingInstall({
      result,
      assistants: args.assistants,
      force: args.force
    });
    const recorded = recordRunArtifact({
      cwd: result.analysis.root,
      command: "onboard",
      action: "write",
      payload: {
        configPath: relativize(result.analysis.root, generated.configPath),
        onboardingPath: relativize(result.analysis.root, generated.onboardingPath),
        onboardingJsonPath: relativize(result.analysis.root, generated.onboardingJsonPath),
        adoptionPath: relativize(result.analysis.root, generated.adoptionPath),
        continuity: generated.continuity.written,
        assistants: generated.written
      }
    });

    printTemperBanner("Existing project onboarding complete");
    console.log("");
    console.log(`Root: ${result.analysis.root}`);
    console.log(`Config: ${generated.configPath}`);
    console.log(`Onboarding Report: ${generated.onboardingPath}`);
    console.log(`Adoption Report: ${generated.adoptionPath}`);
    console.log("");
    console.log("Generated:");
    printList([
      relativize(result.analysis.root, generated.configPath),
      ...generated.continuity.written,
      relativize(result.analysis.root, generated.onboardingPath),
      relativize(result.analysis.root, generated.onboardingJsonPath),
      relativize(result.analysis.root, generated.adoptionPath),
      ...generated.written
    ]);
    console.log("");
    console.log(`Run Artifact: ${recorded.relativePath}`);
    return;
  }

  process.stdout.write(result.report);
  console.log(
    "Run with --interview to ask the user the right questions in chat, --preview to inspect the exact install plan, --write to create temper.config.json and assistant files, or --rehearse to replay it in a disposable lab."
  );
}

function runAdopt(rest) {
  const args = parseCommonArgs(rest);
  const analysis = analyzeProject({ cwd: args.cwd });
  const config = createConfigFromAnalysis(analysis, {
    mode: "adopted",
    family: args.family,
    stack: args.stack,
    name: args.name
  });
  const report = renderAdoptionReport(analysis, config);

  if (args.json) {
    console.log(
      JSON.stringify(
        {
          analysis,
          config,
          report
        },
        null,
        2
      )
    );
    return;
  }

  if (args.write) {
    const configPath = writeProjectConfig(analysis.root, config, {
      force: args.force
    });
    const reportPath = writeProjectFile(analysis.root, ".temper/reports/adoption.md", report);
    const continuity = materializeContinuityInstall({
      projectRoot: analysis.root,
      config,
      analysis
    });
    const written = installAssistantAdapters({
      projectRoot: analysis.root,
      config,
      analysis,
      assistants: args.assistants
    });
    const recorded = recordRunArtifact({
      cwd: analysis.root,
      command: "adopt",
      action: "write",
      payload: {
        configPath: relativize(analysis.root, configPath),
        reportPath: relativize(analysis.root, reportPath),
        continuity: continuity.written,
        assistants: written
      }
    });

    printHeader("Temper Adopt");
    console.log(`Root: ${analysis.root}`);
    console.log(`Config: ${configPath}`);
    console.log(`Report: ${reportPath}`);
    console.log("");
    console.log("Generated:");
    printList([relativize(analysis.root, configPath), relativize(analysis.root, reportPath), ...continuity.written, ...written]);
    console.log("");
    console.log(`Run Artifact: ${recorded.relativePath}`);
    return;
  }

  printHeader("Temper Adopt");
  console.log(`Root: ${analysis.root}`);
  console.log(`Family: ${analysis.family.label} [${analysis.family.id}]`);
  console.log(`Stack: ${analysis.stack.label} [${analysis.stack.id}]`);
  console.log("");
  process.stdout.write(report);
  console.log("Run with --write to create temper.config.json and assistant files.");
}

function runUninstall(rest) {
  const args = parseCommonArgs(rest);
  if (args.preview && args.write) {
    throw new Error("Choose either preview/dry-run or write for uninstall.");
  }

  const plan = planTemperUninstall({ cwd: args.cwd });

  if (args.json) {
    const payload = args.write ? applyTemperUninstall({ cwd: args.cwd }) : plan;
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  if (args.write) {
    const result = applyTemperUninstall({ cwd: args.cwd });
    printHeader("Temper Uninstall");
    console.log(`Root: ${result.projectRoot}`);
    console.log("");
    console.log("Removed:");
    printList(result.applied.length > 0 ? result.applied : ["no Temper install artifacts found"]);
    return;
  }

  printHeader("Temper Uninstall");
  console.log(`Root: ${plan.projectRoot}`);
  console.log("");
  process.stdout.write(renderTemperUninstallPreview(plan));
  console.log("Run with --write to remove these Temper artifacts.");
}

function runHandoff(rest) {
  const args = parseHandoffArgs(rest);
  const plan = buildHandoffPlan({
    cwd: args.cwd,
    slug: args.slug,
    title: args.title,
    summary: args.summary,
    next: args.next,
    notes: args.notes,
    status: args.status,
    deployState: args.deployState
  });

  if (args.json) {
    const payload = args.write ? applyHandoffPlan(plan) : plan;
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  if (args.write) {
    const result = applyHandoffPlan(plan);
    const recorded = recordRunArtifact({
      cwd: result.projectRoot,
      command: "handoff",
      action: "write",
      payload: {
        handoffPath: relativize(result.projectRoot, result.handoffPath),
        sessionPath: relativize(result.projectRoot, result.sessionPath),
        sessionStatePath: relativize(result.projectRoot, result.sessionStatePath),
        slug: plan.slug,
        status: plan.status,
        nextSteps: plan.nextSteps
      }
    });
    printHeader("Temper Handoff");
    console.log(`Root: ${result.projectRoot}`);
    console.log(`Handoff: ${result.handoffPath}`);
    console.log(`Session: ${result.sessionPath}`);
    console.log(`Run Artifact: ${recorded.relativePath}`);
    return;
  }

  printHeader("Temper Handoff");
  console.log(`Root: ${plan.projectRoot}`);
  console.log("");
  process.stdout.write(renderHandoffPreview(plan));
  console.log("Run with --write to record this handoff and update SESSION.md.");
}

function runAssistant(rest) {
  const [subcommand = "show", ...subRest] = rest;
  const args = parseCommonArgs(subRest);
  const config = loadProjectConfig({ cwd: args.cwd, required: false });

  if (!config) {
    const interview = buildOnboardingInterview({
      cwd: args.cwd,
      family: args.family,
      stack: args.stack,
      name: args.name,
      betaBranch: args.betaBranch,
      prodBranch: args.prodBranch
    });

    if (subcommand === "install") {
      throw new Error(
        "Temper is installed but this repo is not onboarded yet. Run `temper assistant show --cwd . --json` and ask the interview questions in chat first."
      );
    }

    if (args.json) {
      console.log(
        JSON.stringify(
          {
            status: "needs_onboarding",
            interview
          },
          null,
          2
        )
      );
      return;
    }

    printHeader("Temper Assistant");
    console.log(`Root: ${interview.project_root}`);
    console.log("Status: needs onboarding");
    console.log("");
    process.stdout.write(renderOnboardingInterview(interview));
    console.log("");
    console.log("Ask those questions in chat, then rerun the apply command with the user's answers.");
    return;
  }

  const analysis = analyzeProject({ cwd: config.__projectRoot });

  if (subcommand === "install") {
    const written = installAssistantAdapters({
      projectRoot: config.__projectRoot,
      config,
      analysis,
      assistants: args.assistants
    });

    printHeader("Temper Assistant");
    console.log(`Root: ${config.__projectRoot}`);
    console.log("Generated:");
    printList(written);
    return;
  }

  printHeader("Temper Assistant");
  console.log(`Root: ${config.__projectRoot}`);
  console.log("Status: onboarded");
  console.log(`Claude guide: .temper/assistants/claude.md`);
  console.log(`Codex guide: .temper/assistants/codex.md`);
  console.log(`Claude commands: .claude/commands/temper-*.md`);
}

function capitalize(input) {
  return input.charAt(0).toUpperCase() + input.slice(1);
}

function printCoachPacket(title, packet, options = {}) {
  printHeader(title);
  console.log(`Query: ${packet.query || "(selection only)"}`);

  if (options.mode) {
    console.log(`Mode: ${options.mode}`);
  }

  if (packet.repo?.available) {
    console.log(
      `Repo: ${packet.repo.branch} | ${packet.repo.dirty ? "dirty" : "clean"} | changed ${packet.repo.counts.changed}`
    );
  }

  if (packet.selection.hats.length > 0) {
    console.log("");
    console.log("Hats:");
    printList(
      packet.selection.hats.map(
        (hat) => `${hat.emoji ?? ""} ${hat.name} [${hat.id}] :: ${hat.reasons.join(", ")}`
      )
    );
  }

  if (packet.selection.capabilities.length > 0) {
    console.log("");
    console.log("Capabilities:");
    printList(packet.selection.capabilities.map((item) => `${item.name} [${item.id}]`));
  }

  if (packet.selection.families.length > 0) {
    console.log("");
    console.log("Families:");
    printList(packet.selection.families.map((item) => `${item.name} [${item.id}]`));
  }

  if (packet.repo?.available && packet.repo.changed_files.length > 0) {
    console.log("");
    console.log("Changed Files:");
    printList(packet.repo.changed_files);
  }

  console.log("");
  console.log("Doctrine Chunks:");
  for (const chunk of packet.retrieval.chunks) {
    console.log(`${chunk.score.toString().padStart(2, " ")}  ${chunk.doc} :: ${chunk.title}`);
    console.log(`    ${chunk.summary}`);
  }
}

function dedupeLocal(items) {
  return [...new Set(items.filter(Boolean))];
}

function parseCommonArgs(args) {
  const parsed = {
    cwd: process.cwd(),
    assistants: ["claude", "codex"],
    force: false,
    write: false,
    json: false,
    rehearse: false,
    preview: false,
    interview: false
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith("--")) {
      continue;
    }

    const [key, inlineValue] = arg.slice(2).split("=", 2);
    const nextValue =
      inlineValue ?? (index + 1 < args.length && !args[index + 1].startsWith("--") ? args[++index] : "");

    switch (key) {
      case "cwd":
        parsed.cwd = path.resolve(nextValue || parsed.cwd);
        break;
      case "family":
        parsed.family = nextValue;
        break;
      case "stack":
        parsed.stack = nextValue;
        break;
      case "name":
        parsed.name = nextValue;
        break;
      case "assistant":
      case "assistants":
        parsed.assistants = nextValue
          .split(/[,\s]+/)
          .map((item) => item.trim().toLowerCase())
          .filter(Boolean);
        break;
      case "force":
        parsed.force = true;
        break;
      case "write":
        parsed.write = true;
        break;
      case "preview":
      case "dry-run":
        parsed.preview = true;
        break;
      case "interview":
        parsed.interview = true;
        break;
      case "json":
        parsed.json = true;
        break;
      case "rehearse":
        parsed.rehearse = true;
        break;
      case "lab":
        parsed.lab = nextValue;
        break;
      case "out":
        parsed.out = path.resolve(nextValue || parsed.cwd);
        break;
      case "beta-branch":
        parsed.betaBranch = nextValue;
        break;
      case "prod-branch":
        parsed.prodBranch = nextValue;
        break;
      default:
        break;
    }
  }

  return parsed;
}

function parseHandoffArgs(args) {
  const parsed = parseCommonArgs(args);
  parsed.next = [];

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith("--")) {
      continue;
    }

    const [key, inlineValue] = arg.slice(2).split("=", 2);
    const nextValue =
      inlineValue ?? (index + 1 < args.length && !args[index + 1].startsWith("--") ? args[++index] : "");

    switch (key) {
      case "slug":
        parsed.slug = nextValue;
        break;
      case "title":
        parsed.title = nextValue;
        break;
      case "summary":
        parsed.summary = nextValue;
        break;
      case "next":
        if (nextValue) {
          parsed.next.push(nextValue);
        }
        break;
      case "notes":
        parsed.notes = nextValue;
        break;
      case "status":
        parsed.status = nextValue;
        break;
      case "deploy-state":
        parsed.deployState = nextValue;
        break;
      default:
        break;
    }
  }

  return parsed;
}

function parseSessionArgs(args) {
  const parsed = parseCommonArgs(args);

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith("--")) {
      continue;
    }

    const [key, inlineValue] = arg.slice(2).split("=", 2);
    const nextValue =
      inlineValue ?? (index + 1 < args.length && !args[index + 1].startsWith("--") ? args[++index] : "");

    switch (key) {
      case "workstream":
      case "slug":
        parsed.workstream = nextValue;
        break;
      case "branch":
        parsed.branch = nextValue;
        break;
      case "status":
        parsed.status = nextValue;
        break;
      case "next":
        parsed.next = nextValue;
        break;
      case "handoff":
        parsed.handoff = nextValue;
        break;
      default:
        break;
    }
  }

  return parsed;
}

function relativize(root, absolutePath) {
  return path.relative(root, absolutePath).replace(/\\/g, "/") || ".";
}

function renderInspectFileLines(group) {
  return Object.values(group).map((item) => `${item.path}: ${item.present ? "present" : "missing"}`);
}
