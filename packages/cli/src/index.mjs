import fs from "node:fs";
import path from "node:path";
import { repoRoot, specRoot } from "./lib/paths.mjs";
import { deriveCanonDocs, inspectDoctrine, searchDoctrine } from "./lib/doctrine.mjs";
import { buildCoachPacket, parseCoachArgs } from "./lib/coach.mjs";
import { printHeader, printList } from "./lib/output.mjs";

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

  if (capabilityCommands.has(command)) {
    return runCapability(command, rest);
  }

  throw new Error(`Unknown command: ${command}`);
}

function showHelp() {
  printHeader("Temper");
  console.log("Doctrine-driven CLI scaffold");
  console.log("");
  console.log("Commands:");
  printList([
    "doctor",
    "derive",
    "query <terms>",
    "coach [--json] [--intent ...] [--hat ...] [--capability ...]",
    "init",
    "adopt",
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
  printList(doctrine.canonDocs);
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

  printHeader("Temper Coach");
  console.log(`Query: ${packet.query || "(selection only)"}`);

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

  console.log("");
  console.log("Doctrine Chunks:");
  for (const chunk of packet.retrieval.chunks) {
    console.log(`${chunk.score.toString().padStart(2, " ")}  ${chunk.doc} :: ${chunk.title}`);
    console.log(`    ${chunk.summary}`);
  }
}

function runCapability(command, rest) {
  const detail = rest.join(" ").trim();
  const mode = command === "ship" ? (rest[0] === "full" ? "full" : "lite") : null;

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

function capitalize(input) {
  return input.charAt(0).toUpperCase() + input.slice(1);
}
