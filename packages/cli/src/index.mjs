import fs from "node:fs";
import path from "node:path";
import { repoRoot, specRoot } from "./lib/paths.mjs";
import { deriveCanonDocs, inspectDoctrine } from "./lib/doctrine.mjs";
import { printHeader, printList } from "./lib/output.mjs";

const capabilityCommands = new Set([
  "init",
  "adopt",
  "doctor",
  "ship",
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
    "init",
    "adopt",
    "ship [lite|full]",
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
  printList(doctrine.canonDocs);
}

function runDerive() {
  printHeader("Temper Derive");
  const results = deriveCanonDocs();
  for (const result of results) {
    console.log(`${result.docId}: ${result.sectionCount} sections`);
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
