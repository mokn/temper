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
  buildExistingProjectOnboarding,
  materializeOnboardingInstall,
  runExistingProjectOnboardingRehearsal
} from "./lib/onboarding.mjs";
import {
  CONFIG_FILENAME,
  findConfig,
  loadProjectConfig,
  writeProjectConfig,
  writeProjectFile
} from "./lib/project-config.mjs";
import { printShipReport, runShip } from "./lib/ship.mjs";
import { printHeader, printList, printTemperBanner } from "./lib/output.mjs";

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

  if (command === "assistant") {
    return runAssistant(rest);
  }

  if (command === "onboard") {
    return runOnboard(rest);
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
    "onboard existing [--cwd ...] [--write] [--rehearse] [--lab first-run] [--out <dir>] [--assistant claude,codex]",
    "doctor",
    "derive",
    "query <terms>",
    "coach [--json] [--intent ...] [--hat ...] [--capability ...] [--cwd ...] [--no-repo]",
    "assistant <install|show>",
    "init [--cwd ...] [--family ...] [--stack ...] [--existing]",
    "adopt [--cwd ...] [--write] [--assistant claude,codex]",
    "ship [lite|full]",
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

function runCapability(command, rest) {
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
    const report = runShip({
      ...input,
      mode: input.mode
    });

    if (input.json) {
      console.log(JSON.stringify(report, null, 2));
      return;
    }

    printHeader("Temper Ship");
    printShipReport(report);
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

  printHeader("Temper Init");
  console.log(`Root: ${analysis.root}`);
  console.log(`Config: ${configPath}`);
  console.log(`Family: ${config.family}`);
  console.log(`Stack: ${config.stack.id}`);
  console.log("");
  console.log("Generated:");
  printList([relativize(analysis.root, configPath), ...written]);
}

function runOnboard(rest) {
  const [subcommand = "existing", ...subRest] = rest;
  if (subcommand !== "existing") {
    throw new Error(
      "Usage: temper onboard existing [--cwd ...] [--write] [--rehearse] [--lab first-run] [--out <dir>] [--assistant claude,codex]"
    );
  }

  const args = parseCommonArgs(subRest);
  if (args.rehearse) {
    const rehearsal = runExistingProjectOnboardingRehearsal({
      cwd: args.cwd,
      family: args.family,
      stack: args.stack,
      name: args.name,
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
    name: args.name
  });

  if (args.json) {
    console.log(
      JSON.stringify(
        {
          analysis: result.analysis,
          config: result.config,
          onboarding: result.onboarding,
          report: result.report
        },
        null,
        2
      )
    );
    return;
  }

  if (args.write) {
    const generated = materializeOnboardingInstall({
      result,
      assistants: args.assistants,
      force: args.force
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
      relativize(result.analysis.root, generated.onboardingPath),
      relativize(result.analysis.root, generated.onboardingJsonPath),
      relativize(result.analysis.root, generated.adoptionPath),
      ...generated.written
    ]);
    return;
  }

  process.stdout.write(result.report);
  console.log("Run with --write to create temper.config.json, onboarding reports, and assistant files.");
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
    const written = installAssistantAdapters({
      projectRoot: analysis.root,
      config,
      analysis,
      assistants: args.assistants
    });

    printHeader("Temper Adopt");
    console.log(`Root: ${analysis.root}`);
    console.log(`Config: ${configPath}`);
    console.log(`Report: ${reportPath}`);
    console.log("");
    console.log("Generated:");
    printList([relativize(analysis.root, configPath), relativize(analysis.root, reportPath), ...written]);
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

function runAssistant(rest) {
  const [subcommand = "show", ...subRest] = rest;
  const args = parseCommonArgs(subRest);
  const config = loadProjectConfig({ cwd: args.cwd });
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
    rehearse: false
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
      default:
        break;
    }
  }

  return parsed;
}

function relativize(root, absolutePath) {
  return path.relative(root, absolutePath).replace(/\\/g, "/") || ".";
}
