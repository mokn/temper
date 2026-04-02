import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

export function gatherRepoContext(options = {}) {
  const cwd = path.resolve(options.cwd ?? process.cwd());
  const gitRoot = runGit(cwd, ["rev-parse", "--show-toplevel"]);

  if (!gitRoot) {
    return {
      available: false,
      cwd,
      reason: "not-git-repo"
    };
  }

  const root = gitRoot.trim();
  const branch = runGit(root, ["rev-parse", "--abbrev-ref", "HEAD"])?.trim() ?? "unknown";
  const statusOutput = runGit(root, ["status", "--short", "--branch", "--untracked-files=all"]) ?? "";
  const status = parseStatus(statusOutput);
  const unstagedDiff = runGit(root, ["diff", "--no-ext-diff", "--unified=0", "--relative"]) ?? "";
  const stagedDiff =
    runGit(root, ["diff", "--cached", "--no-ext-diff", "--unified=0", "--relative"]) ?? "";

  const sessionPath = path.join(root, "SESSION.md");
  const agentsPath = path.join(root, "AGENTS.md");
  const claudePath = path.join(root, "CLAUDE.md");
  const handoffFiles = safeReadDir(root)
    .filter((entry) => /^HANDOFF_.*\.md$/i.test(entry))
    .sort();

  return {
    available: true,
    cwd,
    gitRoot: root,
    branch,
    isDirty: status.changedFiles.length > 0,
    changedFiles: status.changedFiles,
    stagedFiles: status.stagedFiles,
    unstagedFiles: status.unstagedFiles,
    untrackedFiles: status.untrackedFiles,
    counts: {
      changed: status.changedFiles.length,
      staged: status.stagedFiles.length,
      unstaged: status.unstagedFiles.length,
      untracked: status.untrackedFiles.length
    },
    statusLines: status.lines,
    diffSummary: summarizeDiffs(unstagedDiff, stagedDiff),
    workflowFiles: {
      agents: fs.existsSync(agentsPath) ? agentsPath : null,
      session: fs.existsSync(sessionPath) ? sessionPath : null,
      claude: fs.existsSync(claudePath) ? claudePath : null,
      handoffs: handoffFiles.map((file) => path.join(root, file))
    },
    sessionExcerpt: fs.existsSync(sessionPath) ? readExcerpt(sessionPath, 20) : null
  };
}

function runGit(cwd, args) {
  try {
    return execFileSync("git", ["-C", cwd, ...args], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    });
  } catch {
    return null;
  }
}

function parseStatus(output) {
  const lines = output
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean);

  const changedFiles = [];
  const stagedFiles = [];
  const unstagedFiles = [];
  const untrackedFiles = [];

  for (const line of lines) {
    if (line.startsWith("##")) {
      continue;
    }

    const x = line[0] ?? " ";
    const y = line[1] ?? " ";
    const file = normalizeStatusPath(line.slice(3));

    changedFiles.push(file);

    if (x !== " " && x !== "?") {
      stagedFiles.push(file);
    }
    if (y !== " ") {
      unstagedFiles.push(file);
    }
    if (x === "?" && y === "?") {
      untrackedFiles.push(file);
    }
  }

  return {
    lines,
    changedFiles: dedupe(changedFiles),
    stagedFiles: dedupe(stagedFiles),
    unstagedFiles: dedupe(unstagedFiles),
    untrackedFiles: dedupe(untrackedFiles)
  };
}

function normalizeStatusPath(rawPath) {
  const trimmed = rawPath.trim();
  if (trimmed.includes(" -> ")) {
    return trimmed.split(" -> ").at(-1).trim();
  }
  return trimmed;
}

function summarizeDiffs(...diffs) {
  const lines = diffs
    .flatMap((diff) => diff.split(/\r?\n/))
    .map((line) => line.trimEnd())
    .filter((line) => line.startsWith("diff --git") || line.startsWith("@@") || /^[+-][^+-]/.test(line))
    .slice(0, 40);

  return lines;
}

function readExcerpt(filePath, maxLines) {
  return fs
    .readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .slice(0, maxLines)
    .join("\n")
    .trim();
}

function safeReadDir(dirPath) {
  try {
    return fs.readdirSync(dirPath);
  } catch {
    return [];
  }
}

function dedupe(items) {
  return [...new Set(items.filter(Boolean))];
}
