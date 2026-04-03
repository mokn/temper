import fs from "node:fs";
import path from "node:path";
import { rel, writeProjectFile } from "./project-config.mjs";
import {
  buildAssistantContract,
  renderAssistantReadme,
  renderClaudeGuide,
  renderCodexGuide,
  renderSharedCanonMarkdown,
  renderWorkflowHookBlock
} from "./assistant-contract.mjs";

export const TEMPER_RUNTIME_MARKER = "TEMPER_RUNTIME";

export function installAssistantAdapters(options) {
  const projectRoot = path.resolve(options.projectRoot);
  const plan = planAssistantAdapters(options);
  const written = [];

  for (const file of plan.files) {
    if (file.action === "unchanged") {
      continue;
    }
    written.push(writeProjectFile(projectRoot, file.relativePath, file.content));
  }

  return written.map((filePath) => rel(projectRoot, filePath));
}

export function planAssistantAdapters(options) {
  const projectRoot = path.resolve(options.projectRoot);
  const assistants = normalizeAssistants(options.assistants);
  const contract = buildAssistantContract({
    projectRoot,
    config: options.config,
    analysis: options.analysis,
    onboarding: options.onboarding
  });
  const files = [];

  files.push(
    planGeneratedFile(projectRoot, ".temper/assistants/shared-canon.json", JSON.stringify(contract, null, 2) + "\n")
  );
  files.push(
    planGeneratedFile(projectRoot, ".temper/assistants/shared-canon.md", renderSharedCanonMarkdown(contract))
  );
  files.push(
    planGeneratedFile(projectRoot, ".temper/assistants/README.md", renderAssistantReadme(contract))
  );

  if (assistants.includes("claude")) {
    files.push(
      planGeneratedFile(projectRoot, ".temper/assistants/claude.md", renderClaudeGuide(contract))
    );
  }

  if (assistants.includes("codex")) {
    files.push(
      planGeneratedFile(projectRoot, ".temper/assistants/codex.md", renderCodexGuide(contract))
    );
  }

  files.push(...planWorkflowHooks(projectRoot, contract));

  return {
    runtime: contract.runtime,
    contract,
    files
  };
}

function planWorkflowHooks(projectRoot, contract) {
  const planned = [];
  const hookTargets = ["AGENTS.md", "CLAUDE.md"]
    .map((relativePath) => path.join(projectRoot, relativePath))
    .filter((filePath) => fs.existsSync(filePath));

  for (const filePath of hookTargets) {
    const existing = fs.readFileSync(filePath, "utf8");
    const next = upsertMarkedBlock(existing, TEMPER_RUNTIME_MARKER, renderWorkflowHookBlock(contract));
    planned.push(planGeneratedFile(projectRoot, rel(projectRoot, filePath), next));
  }

  return planned;
}

export function upsertMarkedBlock(content, marker, body) {
  const start = `<!-- ${marker}:BEGIN -->`;
  const end = `<!-- ${marker}:END -->`;
  const block = `${start}\n${body.trimEnd()}\n${end}`;
  const pattern = new RegExp(`${escapeRegExp(start)}[\\s\\S]*?${escapeRegExp(end)}\\n?`, "m");

  if (pattern.test(content)) {
    return content.replace(pattern, `${block}\n`);
  }

  const separator = content.endsWith("\n\n") ? "" : content.endsWith("\n") ? "\n" : "\n\n";
  return `${content}${separator}${block}\n`;
}

export function removeMarkedBlock(content, marker) {
  const start = `<!-- ${marker}:BEGIN -->`;
  const end = `<!-- ${marker}:END -->`;
  const pattern = new RegExp(`\\n?${escapeRegExp(start)}[\\s\\S]*?${escapeRegExp(end)}\\n?`, "m");
  if (!pattern.test(content)) {
    return content;
  }
  const stripped = content.replace(pattern, "\n").replace(/\n{3,}/g, "\n\n");
  return stripped.endsWith("\n") ? stripped : `${stripped}\n`;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeAssistants(assistants) {
  const requested = (assistants ?? ["claude", "codex"]).map((item) => item.toLowerCase());
  if (requested.includes("all")) {
    return ["claude", "codex"];
  }
  return [...new Set(requested)];
}

function planGeneratedFile(projectRoot, relativePath, content) {
  const filePath = path.join(projectRoot, relativePath);
  return {
    path: filePath,
    relativePath,
    action: classifyFileAction(filePath, content),
    content
  };
}

function classifyFileAction(filePath, content) {
  if (!fs.existsSync(filePath)) {
    return "create";
  }
  return fs.readFileSync(filePath, "utf8") === content ? "unchanged" : "update";
}
