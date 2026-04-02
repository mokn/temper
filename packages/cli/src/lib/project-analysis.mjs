import fs from "node:fs";
import path from "node:path";
import { gatherRepoContext } from "./repo-context.mjs";
import { findProjectRoot, rel } from "./project-config.mjs";

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

const FAMILY_DEFINITIONS = [
  {
    id: "data-driven-progression-rpg",
    label: "Data-Driven Progression RPG",
    keywords: [
      "ability",
      "abilities",
      "class",
      "classes",
      "drop",
      "drops",
      "effect",
      "effects",
      "item",
      "items",
      "loot",
      "monster",
      "monsters",
      "progression",
      "worlds"
    ]
  },
  {
    id: "deterministic-turn-based",
    label: "Deterministic Turn-Based",
    keywords: ["board", "card", "cards", "phase", "turn", "turns", "tactics", "match-state"]
  },
  {
    id: "real-time-action",
    label: "Real-Time Action",
    keywords: ["camera", "combat", "controller", "hud", "input", "movement", "platformer", "player"]
  },
  {
    id: "real-time-wave-systemic",
    label: "Real-Time Wave/Systemic",
    keywords: ["auto", "spawn", "survivor", "tower", "wave", "waves"]
  },
  {
    id: "competitive-server-authoritative",
    label: "Competitive Server-Authoritative",
    keywords: ["authority", "matchmaking", "moba", "pvp", "replication", "shooter"]
  },
  {
    id: "simulation-management-sandbox",
    label: "Simulation / Management / Sandbox",
    keywords: ["city", "colony", "factory", "sandbox", "simulation"]
  },
  {
    id: "narrative-choice-driven-puzzle",
    label: "Narrative / Choice-Driven / Puzzle",
    keywords: ["dialogue", "narrative", "puzzle", "quest", "story"]
  },
  {
    id: "social-persistent-ugc",
    label: "Social / Persistent / UGC",
    keywords: ["creator", "moderation", "persistent", "social", "ugc"]
  }
];

const STACK_DEFINITIONS = [
  {
    id: "browser-typescript-monorepo",
    label: "Browser + TypeScript Monorepo",
    required: ["package-json", "typescript"]
  },
  {
    id: "godot",
    label: "Godot",
    required: ["godot"]
  },
  {
    id: "unity",
    label: "Unity",
    required: ["unity"]
  },
  {
    id: "unreal",
    label: "Unreal",
    required: ["unreal"]
  }
];

const GENERATED_HINTS = [
  ".astro",
  ".mud",
  "coverage",
  "dist",
  "node_modules",
  "src/codegen"
];

const SOURCE_OF_TRUTH_PATTERNS = [
  /(^|\/)(items|effects|monsters|quests|abilities|classes|cards|zones)\.(json|md|ts)$/i,
  /(^|\/)mud\.config\.(ts|js)$/i,
  /(^|\/)worlds\.json$/i,
  /(^|\/)DESIGN_PHILOSOPHY\.md$/i,
  /(^|\/)CHANGELOG\.md$/i
];

export function analyzeProject(options = {}) {
  const root = findProjectRoot(options.cwd ?? process.cwd());
  const repo = gatherRepoContext({ cwd: root });
  const files = collectProjectFiles(root, options.fileLimit ?? 2500);
  const packageScan = scanPackageJsons(root);
  const packageManager = detectPackageManager(root);
  const family = detectFamily(files);
  const stack = detectStack(root, files, packageScan);
  const sourceOfTruth = detectSourceOfTruth(files);
  const workflow = detectWorkflow(root, repo);
  const environments = detectEnvironments(root, packageScan, repo);
  const commands = inferCommands(root, packageManager, packageScan);
  const generated = GENERATED_HINTS.filter((hint) => files.some((file) => file.includes(hint)));
  const warnings = [];

  if (sourceOfTruth.length === 0) {
    warnings.push("No strong source-of-truth paths detected. Expect to refine config manually.");
  }

  if (!commands.build) {
    warnings.push("No build command inferred.");
  }

  if (!commands.test) {
    warnings.push("No test command inferred.");
  }

  return {
    root,
    repo,
    name: packageScan.root?.json?.name || path.basename(root),
    package_manager: packageManager,
    family,
    stack,
    environments,
    surfaces: {
      source_of_truth: sourceOfTruth,
      generated,
      workflow
    },
    commands,
    package_scan: {
      root: simplifyPackageEntry(root, packageScan.root),
      workspaces: packageScan.workspaces.map((entry) => simplifyPackageEntry(root, entry))
    },
    warnings
  };
}

export function createConfigFromAnalysis(analysis, options = {}) {
  const projectName = options.name || analysis.name;
  const familyId = options.family || analysis.family.id;
  const stackId = options.stack || analysis.stack.id;
  const sourceOfTruth = dedupe(analysis.surfaces.source_of_truth);

  return {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    mode: options.mode || "adopted",
    name: projectName,
    family: familyId,
    stack: {
      id: stackId,
      overlays: analysis.stack.overlays
    },
    package_manager: analysis.package_manager,
    paths: {
      source_of_truth: sourceOfTruth,
      generated: analysis.surfaces.generated,
      workflow: analysis.surfaces.workflow
    },
    environments: toEnvironmentConfig(analysis.environments),
    commands: analysis.commands,
    ship: {
      lite: {
        steps: collectShipSteps(analysis.commands, "lite")
      },
      full: {
        steps: collectShipSteps(analysis.commands, "full")
      }
    },
    assistants: {
      install_claude_commands: true,
      install_codex_guides: true
    },
    notes: analysis.warnings
  };
}

export function renderAdoptionReport(analysis, config) {
  const lines = [
    "# Temper Adoption Report",
    "",
    `- Project: ${analysis.name}`,
    `- Root: ${analysis.root}`,
    `- Family: ${analysis.family.label} (${analysis.family.id})`,
    `- Stack: ${analysis.stack.label} (${analysis.stack.id})`,
    `- Package manager: ${analysis.package_manager || "unknown"}`,
    "",
    "## Source Of Truth Candidates",
    ...asBulletLines(analysis.surfaces.source_of_truth),
    "",
    "## Workflow Surfaces",
    ...asBulletLines(
      Object.entries(analysis.surfaces.workflow)
        .filter(([, value]) => Boolean(value) && (!Array.isArray(value) || value.length > 0))
        .map(([key, value]) => {
          if (Array.isArray(value)) {
            return `${key}: ${value.join(", ")}`;
          }
          return `${key}: ${value}`;
        })
    ),
    "",
    "## Inferred Commands",
    ...asBulletLines(
      Object.entries(analysis.commands).map(([key, value]) => `${key}: ${value.cmd.join(" ")} (${value.source})`)
    ),
    "",
    "## Recommended Ship Steps",
    ...asBulletLines([
      `ship lite: ${config.ship.lite.steps.join(", ") || "none"}`,
      `ship full: ${config.ship.full.steps.join(", ") || "none"}`
    ]),
    "",
    "## Recommended Migration Stages",
    ...asBulletLines([
      "1. Install Temper config and assistant surfaces in read-only mode.",
      "2. Use `temper ship lite --dry-run` against the repo until the inferred hooks feel right.",
      "3. Tighten source-of-truth paths and environment branches inside temper.config.json.",
      "4. Promote `ship full` and hotfix flows once the report matches lived workflow."
    ])
  ];

  if (analysis.warnings.length > 0) {
    lines.push("", "## Warnings", ...asBulletLines(analysis.warnings));
  }

  return lines.join("\n") + "\n";
}

function detectPackageManager(root) {
  if (fs.existsSync(path.join(root, "pnpm-lock.yaml"))) {
    return "pnpm";
  }
  if (fs.existsSync(path.join(root, "package-lock.json"))) {
    return "npm";
  }
  if (fs.existsSync(path.join(root, "yarn.lock"))) {
    return "yarn";
  }
  if (fs.existsSync(path.join(root, "bun.lockb")) || fs.existsSync(path.join(root, "bun.lock"))) {
    return "bun";
  }
  const packageJsonPath = path.join(root, "package.json");
  if (fs.existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
      const manager = String(packageJson.packageManager || "").trim();
      if (manager.startsWith("pnpm@")) {
        return "pnpm";
      }
      if (manager.startsWith("yarn@")) {
        return "yarn";
      }
      if (manager.startsWith("npm@")) {
        return "npm";
      }
      if (manager.startsWith("bun@")) {
        return "bun";
      }
    } catch {}
  }
  return null;
}

function detectFamily(files) {
  const scores = new Map();
  const reasons = new Map();
  const tokens = dedupe(files.flatMap(tokenizePath));

  for (const definition of FAMILY_DEFINITIONS) {
    let score = 0;
    const hits = [];
    for (const keyword of definition.keywords) {
      if (tokens.includes(keyword)) {
        score += 1;
        hits.push(keyword);
      }
    }
    scores.set(definition.id, score);
    reasons.set(definition.id, hits);
  }

  const winner =
    FAMILY_DEFINITIONS
      .map((definition) => ({
        ...definition,
        score: scores.get(definition.id) ?? 0,
        reasons: reasons.get(definition.id) ?? []
      }))
      .sort((left, right) => right.score - left.score || left.id.localeCompare(right.id))[0] ??
    FAMILY_DEFINITIONS[0];

  if ((winner.score ?? 0) === 0) {
    return {
      id: "data-driven-progression-rpg",
      label: "Data-Driven Progression RPG",
      reasons: ["default: no strong family signal detected"]
    };
  }

  return winner;
}

function detectStack(root, files, packageScan) {
  const markers = new Set();
  if (packageScan.root) {
    markers.add("package-json");
  }
  if (files.some((file) => /(^|\/)tsconfig(\..+)?\.json$/i.test(file) || /\.(ts|tsx|mts|cts)$/i.test(file))) {
    markers.add("typescript");
  }
  if (files.some((file) => /\.(unity|prefab|asmdef)$/i.test(file))) {
    markers.add("unity");
  }
  if (files.some((file) => /\.godot$/i.test(file) || /project\.godot$/i.test(file))) {
    markers.add("godot");
  }
  if (files.some((file) => /\.(uproject|uplugin)$/i.test(file))) {
    markers.add("unreal");
  }

  const matched =
    STACK_DEFINITIONS.find((definition) => definition.required.every((marker) => markers.has(marker))) ??
    {
      id: "custom",
      label: "Custom / Mixed Stack"
    };

  const overlays = [];
  if (files.some((file) => /(^|\/)mud\.config\.(ts|js)$/i.test(file)) || packageUses(packageScan, "@latticexyz")) {
    overlays.push("mud-onchain");
  }
  if (packageUses(packageScan, "react") || files.some((file) => /\.(tsx|jsx)$/i.test(file))) {
    overlays.push("react-client");
  }
  if (files.some((file) => /railway/i.test(file))) {
    overlays.push("railway-service");
  }

  return {
    ...matched,
    overlays
  };
}

function detectSourceOfTruth(files) {
  return files
    .filter((file) => SOURCE_OF_TRUTH_PATTERNS.some((pattern) => pattern.test(file)))
    .filter((file) => !/\/__fixtures__\//i.test(file))
    .filter((file) => !/^packages\/guide\//i.test(file))
    .filter((file) => !/^packages\/indexer\/src\/api\//i.test(file))
    .filter((file) => !/\/(?:i18n\/)?locales?\//i.test(file))
    .sort((left, right) => sourceOfTruthPriority(right) - sourceOfTruthPriority(left) || left.localeCompare(right))
    .slice(0, 24);
}

function detectWorkflow(projectRoot, repo) {
  const roots = workflowRoots(projectRoot, repo);

  return {
    agents: toWorkflowPath(projectRoot, findFirstExistingFile(roots, "AGENTS.md")),
    session: toWorkflowPath(projectRoot, findFirstExistingFile(roots, "SESSION.md")),
    claude: toWorkflowPath(projectRoot, findFirstExistingFile(roots, "CLAUDE.md")),
    handoffs: dedupe(
      roots.flatMap((root) =>
        safeReadDir(root)
          .filter((entry) => /^HANDOFF_.*\.md$/i.test(entry))
          .map((entry) => rel(projectRoot, path.join(root, entry)))
      )
    ).sort(),
    claude_rules: dedupe(
      roots.flatMap((root) => {
        const rulesDir = path.join(root, ".claude", "rules");
        if (!fs.existsSync(rulesDir) || !fs.statSync(rulesDir).isDirectory()) {
          return [];
        }
        return fs
          .readdirSync(rulesDir)
          .filter((entry) => entry.endsWith(".md"))
          .map((entry) => rel(projectRoot, path.join(rulesDir, entry)));
      })
    ).sort()
  };
}

function detectEnvironments(projectRoot, packageScan, repo) {
  const environments = [{ id: "local", label: "Local", branch: "*" }];
  const deployRulePath = findFirstExistingFile(workflowRoots(projectRoot, repo), ".claude/rules/deploy.md");
  const hasDeployRule = Boolean(deployRulePath && fs.existsSync(deployRulePath));

  let betaBranch = "dev";
  let prodBranch = "main";
  if (hasDeployRule) {
    const text = fs.readFileSync(deployRulePath, "utf8");
    betaBranch = extractBranch(text, /`([^`]+)`\s*\|\s*Beta/i) || betaBranch;
    prodBranch = extractBranch(text, /`([^`]+)`\s*\|\s*(Production|Prod)/i) || prodBranch;
  }

  const allScripts = collectScriptEntries(packageScan);
  const hasBeta = allScripts.some((entry) => /(testnet|beta|staging)/i.test(entry.script));
  const hasProd = allScripts.some((entry) => /(mainnet|prod|production)/i.test(entry.script));

  if (hasBeta || hasDeployRule) {
    environments.push({ id: "beta", label: "Beta", branch: betaBranch });
  }
  if (hasProd || hasDeployRule) {
    environments.push({ id: "prod", label: "Production", branch: prodBranch });
  }

  return environments;
}

function inferCommands(root, packageManager, packageScan) {
  const commandPrefix = packageManager === "pnpm" ? ["pnpm"] : packageManager === "yarn" ? ["yarn"] : ["npm", "run"];
  const commands = {};

  const rootScripts = packageScan.root?.json?.scripts ?? {};
  if (rootScripts.build) {
    commands.build = makeCommand(commandPrefix, "build", packageScan.root.relativePath || ".", "root:scripts.build");
  }
  if (rootScripts.test) {
    commands.test = makeCommand(commandPrefix, "test", packageScan.root.relativePath || ".", "root:scripts.test");
  }
  if (rootScripts.typecheck) {
    commands.typecheck = makeCommand(commandPrefix, "typecheck", packageScan.root.relativePath || ".", "root:scripts.typecheck");
  }
  if (rootScripts["changelog:dry"]) {
    commands.release_notes = makeCommand(
      commandPrefix,
      "changelog:dry",
      packageScan.root.relativePath || ".",
      "root:scripts.changelog:dry"
    );
  }

  for (const entry of packageScan.workspaces) {
    const scripts = entry.json?.scripts ?? {};
    const packageName = entry.packageName || path.basename(entry.relativePath);

    if (!commands.typecheck && scripts.typecheck) {
      commands.typecheck = makeWorkspaceCommand(packageManager, packageName, "typecheck", entry.relativePath, `${packageName}:scripts.typecheck`);
    }

    if (!commands.smoke && scripts["test:smoke:all"]) {
      commands.smoke = makeWorkspaceCommand(
        packageManager,
        packageName,
        "test:smoke:all",
        entry.relativePath,
        `${packageName}:scripts.test:smoke:all`
      );
    }

    if (!commands.balance_verify && scripts["test:balance"]) {
      commands.balance_verify = makeWorkspaceCommand(
        packageManager,
        packageName,
        "test:balance",
        entry.relativePath,
        `${packageName}:scripts.test:balance`
      );
    }
  }

  if (Object.keys(commands).length === 0) {
    return {};
  }

  return commands;
}

function collectShipSteps(commands, mode) {
  const steps = [];
  if (commands.build) {
    steps.push("build");
  }
  if (commands.typecheck && mode === "full") {
    steps.push("typecheck");
  }
  if (commands.test) {
    steps.push("test");
  }
  if (commands.balance_verify && mode === "full") {
    steps.push("balance_verify");
  }
  if (commands.smoke && mode === "full") {
    steps.push("smoke");
  }
  if (commands.release_notes) {
    steps.push("release_notes");
  }
  return steps;
}

function toEnvironmentConfig(environments) {
  const config = {};
  for (const environment of environments) {
    config[environment.id] = {
      label: environment.label,
      branch: environment.branch
    };
  }
  return config;
}

function scanPackageJsons(root) {
  const packageFiles = collectPackageJsonFiles(root);
  const entries = packageFiles
    .map((filePath) => {
      try {
        const json = JSON.parse(fs.readFileSync(filePath, "utf8"));
        return {
          absolutePath: filePath,
          relativePath: rel(root, path.dirname(filePath)),
          packageName: json.name || null,
          json
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  const rootEntry = entries.find((entry) => entry.relativePath === ".");
  const workspaces = entries.filter((entry) => entry.relativePath !== ".");
  return {
    root: rootEntry || null,
    workspaces
  };
}

function collectProjectFiles(root, limit) {
  const results = [];
  visit(root);
  return results;

  function visit(current) {
    if (results.length >= limit) {
      return;
    }

    let entries = [];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (results.length >= limit) {
        return;
      }

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
      } else if (entry.isFile()) {
        results.push(relativePath);
      }
    }
  }
}

function collectPackageJsonFiles(root) {
  const results = [];
  visit(root);
  return results;

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
        results.push(absolutePath);
      }
    }
  }
}

function collectScriptEntries(packageScan) {
  return [packageScan.root, ...packageScan.workspaces]
    .filter(Boolean)
    .flatMap((entry) =>
      Object.keys(entry.json?.scripts ?? {}).map((script) => ({
        packageName: entry.packageName,
        script
      }))
    );
}

function packageUses(packageScan, dependencyName) {
  return [packageScan.root, ...packageScan.workspaces]
    .filter(Boolean)
    .some((entry) => {
      const dependencies = {
        ...(entry.json?.dependencies ?? {}),
        ...(entry.json?.devDependencies ?? {}),
        ...(entry.json?.peerDependencies ?? {})
      };
      return dependencyName in dependencies;
    });
}

function makeCommand(prefix, scriptName, cwd, source) {
  const command = [...prefix];
  if (prefix[0] === "pnpm" || prefix[0] === "yarn") {
    command.push(scriptName);
  } else {
    command.push(scriptName);
  }

  return {
    cmd: command,
    cwd,
    source
  };
}

function makeWorkspaceCommand(packageManager, packageName, scriptName, cwd, source) {
  if (packageManager === "pnpm") {
    return {
      cmd: ["pnpm", "--filter", packageName, "run", scriptName],
      cwd: ".",
      source
    };
  }

  return {
    cmd: ["npm", "run", scriptName],
    cwd,
    source
  };
}

function tokenizePath(file) {
  return file
    .toLowerCase()
    .split(/[\\/]/)
    .flatMap((segment) => segment.split(/[^a-z0-9]+/))
    .filter(Boolean);
}

function extractBranch(text, pattern) {
  const match = text.match(pattern);
  return match?.[1] ?? null;
}

function simplifyPackageEntry(root, entry) {
  if (!entry) {
    return null;
  }

  return {
    name: entry.packageName,
    path: rel(root, entry.absolutePath),
    scripts: Object.keys(entry.json?.scripts ?? {})
  };
}

function dedupe(items) {
  return [...new Set(items.filter(Boolean))];
}

function workflowRoots(projectRoot, repo) {
  return dedupe([projectRoot, repo?.sharedRoot].filter(Boolean));
}

function findFirstExistingFile(roots, relativePath) {
  for (const root of roots) {
    const candidate = path.join(root, relativePath);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

function toWorkflowPath(projectRoot, absolutePath) {
  return absolutePath ? rel(projectRoot, absolutePath) : null;
}

function safeReadDir(dirPath) {
  try {
    return fs.readdirSync(dirPath);
  } catch {
    return [];
  }
}

function sourceOfTruthPriority(file) {
  if (/^packages\/contracts\/zones\/[^/]+\/(items|effects|monsters)\.json$/i.test(file)) {
    return 100;
  }
  if (/^packages\/contracts\/worlds\.json$/i.test(file)) {
    return 90;
  }
  if (/^packages\/contracts\/mud\.config\.(ts|js)$/i.test(file)) {
    return 85;
  }
  if (/\/(items|effects|monsters|abilities|classes)\.(json|md|ts)$/i.test(file)) {
    return 70;
  }
  if (/CHANGELOG\.md$/i.test(file)) {
    return 10;
  }
  return 50;
}

function asBulletLines(items) {
  if (items.length === 0) {
    return ["- none detected"];
  }
  return items.map((item) => `- ${item}`);
}
