import fs from "node:fs";
import path from "node:path";
import { writeProjectConfig, writeProjectFile } from "./project-config.mjs";
import { installAssistantAdapters } from "./assistant.mjs";
import { materializeContinuityInstall } from "./continuity.mjs";

// Human-friendly aliases → canonical family ids
const FAMILY_ALIASES = {
  rpg: "data-driven-progression-rpg",
  "role-playing": "data-driven-progression-rpg",
  dungeon: "data-driven-progression-rpg",
  roguelike: "data-driven-progression-rpg",
  roguelite: "data-driven-progression-rpg",
  "card-game": "deterministic-turn-based",
  "card game": "deterministic-turn-based",
  cards: "deterministic-turn-based",
  "deck-builder": "deterministic-turn-based",
  "deck builder": "deterministic-turn-based",
  board: "deterministic-turn-based",
  tactics: "deterministic-turn-based",
  "turn-based": "deterministic-turn-based",
  "tower-defense": "real-time-wave-systemic",
  "tower defense": "real-time-wave-systemic",
  tower: "real-time-wave-systemic",
  "auto-battler": "real-time-wave-systemic",
  "auto battler": "real-time-wave-systemic",
  wave: "real-time-wave-systemic",
  survivor: "real-time-wave-systemic",
  platformer: "real-time-action",
  action: "real-time-action",
  "action-adventure": "real-time-action",
  fps: "competitive-server-authoritative",
  shooter: "competitive-server-authoritative",
  moba: "competitive-server-authoritative",
  pvp: "competitive-server-authoritative",
  sim: "simulation-management-sandbox",
  simulation: "simulation-management-sandbox",
  "city-builder": "simulation-management-sandbox",
  "city builder": "simulation-management-sandbox",
  factory: "simulation-management-sandbox",
  strategy: "simulation-management-sandbox",
  puzzle: "narrative-choice-driven-puzzle",
  narrative: "narrative-choice-driven-puzzle",
  "visual-novel": "narrative-choice-driven-puzzle",
  "visual novel": "narrative-choice-driven-puzzle",
  story: "narrative-choice-driven-puzzle",
  adventure: "narrative-choice-driven-puzzle",
  social: "social-persistent-ugc",
  mmo: "social-persistent-ugc",
  sandbox: "social-persistent-ugc"
};

const FAMILY_LABELS = {
  "data-driven-progression-rpg": "Data-Driven Progression RPG",
  "deterministic-turn-based": "Deterministic Turn-Based",
  "real-time-action": "Real-Time Action",
  "real-time-wave-systemic": "Real-Time Wave / Systemic",
  "competitive-server-authoritative": "Competitive Server-Authoritative",
  "simulation-management-sandbox": "Simulation / Management / Sandbox",
  "narrative-choice-driven-puzzle": "Narrative / Choice-Driven / Puzzle",
  "social-persistent-ugc": "Social / Persistent / UGC"
};

export function resolveFamily(input) {
  if (!input) {
    return { id: "data-driven-progression-rpg", label: "Data-Driven Progression RPG", inferred: true };
  }
  const normalized = input.toLowerCase().trim();
  const resolved = FAMILY_ALIASES[normalized] ?? normalized;
  const label = FAMILY_LABELS[resolved] ?? resolved;
  return { id: resolved, label, inferred: false };
}

export function buildInitConfig({ name, family, stack, packageManager = "pnpm", description, experience }) {
  const resolvedFamily = resolveFamily(family);
  const stackId = stack || "browser-typescript-monorepo";

  return {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    mode: "onboarded",
    name: name || "my-game",
    family: resolvedFamily.id,
    stack: { id: stackId, overlays: [] },
    package_manager: packageManager,
    experience: experience || null,
    paths: {
      source_of_truth: [],
      generated: [],
      workflow: {}
    },
    environments: {
      local: { label: "Local", branch: "*" },
      beta: { label: "Beta", branch: "dev" },
      prod: { label: "Production", branch: "main" }
    },
    commands: {
      build: { cmd: [packageManager, "build"], source: "init" },
      test: { cmd: [packageManager, "test"], source: "init" }
    },
    ship: {
      lite: { steps: ["build", "test"] },
      full: { steps: ["build", "test"] }
    },
    assistants: {
      install_claude_commands: true,
      install_codex_guides: true
    },
    notes: description ? [description] : []
  };
}

// Minimal analysis stub so installAssistantAdapters and
// materializeContinuityInstall don't need a real analyzeProject call.
function buildStubAnalysis({ name, family, stack, packageManager }) {
  const resolvedFamily = resolveFamily(family);
  return {
    name: name || "my-game",
    root: null,
    family: { id: resolvedFamily.id, label: resolvedFamily.label },
    stack: { id: stack || "browser-typescript-monorepo", overlays: [] },
    package_manager: packageManager || "pnpm",
    repo: { available: false },
    surfaces: { source_of_truth: [], generated: [], workflow: {} },
    environments: [],
    commands: {},
    warnings: []
  };
}

export function materializeInitInstall({ projectRoot, name, family, stack, packageManager, description, experience, assistants = ["claude", "codex"] }) {
  const root = path.resolve(projectRoot);
  const config = buildInitConfig({ name, family, stack, packageManager, description, experience });
  const analysis = buildStubAnalysis({ name, family, stack, packageManager });

  const configPath = writeProjectConfig(root, config);

  const continuity = materializeContinuityInstall({
    projectRoot: root,
    config,
    analysis,
    onboarding: { recommendations: [] }
  });

  const written = installAssistantAdapters({
    projectRoot: root,
    config,
    analysis,
    onboarding: { recommendations: [] },
    assistants
  });

  // Remove the postinstall trigger file — onboarding is complete
  try {
    fs.unlinkSync(path.join(root, ".claude/rules/temper-onboarding.md"));
  } catch {
    // File may not exist
  }

  return { configPath, continuity, written, config, resolvedFamily: resolveFamily(family) };
}

const FAMILY_DESIGNER_READ = {
  "data-driven-progression-rpg": "Progression games live and die by number feel. Get the economy right before you build art around it — a broken XP curve or stat cliff will undermine everything else.",
  "deterministic-turn-based": "Turn-based games are puzzles with personality. Rules need to be learnable and consistent before anything else — players can't strategize through ambiguity.",
  "real-time-action": "Action games are input-feel first. Everything else is secondary until movement feels right — if the controller doesn't feel good, no amount of content will save it.",
  "real-time-wave-systemic": "Wave games live in the first 60 seconds. The core loop needs to be satisfying immediately or players won't stay long enough to find the depth.",
  "competitive-server-authoritative": "Competitive games are trust machines. Every match outcome needs to feel earned — perceived fairness matters more than actual fairness at launch.",
  "simulation-management-sandbox": "Sim games are about interesting decisions, not correct ones. If every player converges on the same optimal path, the design space is too narrow.",
  "narrative-choice-driven-puzzle": "Narrative games make promises with every choice. If decisions don't feel like they matter, the story collapses — even great writing can't recover from that.",
  "social-persistent-ugc": "Social games depend on player investment, not designer investment. Build tools that let players make things they're proud of before you build content."
};

export const FAMILY_ADVISORS = {
  "data-driven-progression-rpg": "🎯 Kaplan · ♟️ Meier · 🔧 Carmack",
  "deterministic-turn-based": "♟️ Meier · 🎯 Kaplan · ✨ Miyamoto",
  "real-time-action": "🔧 Carmack · ✨ Miyamoto · 🎯 Kaplan",
  "real-time-wave-systemic": "🌱 Wright · ♟️ Meier · 🔧 Carmack",
  "competitive-server-authoritative": "🔧 Carmack · 🎯 Kaplan · ♟️ Meier",
  "simulation-management-sandbox": "🌱 Wright · ♟️ Meier · 🔧 Carmack",
  "narrative-choice-driven-puzzle": "✨ Miyamoto · 🌱 Wright · 🎯 Kaplan",
  "social-persistent-ugc": "🌱 Wright · 🎯 Kaplan · 🔧 Carmack"
};

const FAMILY_FIRST_STEPS = {
  "data-driven-progression-rpg": "character classes, stat systems, loot tables, or progression curves",
  "deterministic-turn-based": "game board, card definitions, turn structure, or win conditions",
  "real-time-action": "player controller, enemy AI, hitbox system, or level structure",
  "real-time-wave-systemic": "wave spawner, tower placement, enemy pathing, or economy loop",
  "competitive-server-authoritative": "hero roster, abilities, matchmaking, map layout, or game loop",
  "simulation-management-sandbox": "core resource loop, building system, simulation tick, or map generation",
  "narrative-choice-driven-puzzle": "dialogue system, choice branching, puzzle mechanics, or scene structure",
  "social-persistent-ugc": "player identity, world persistence, creation tools, or social graph"
};

export function renderInitSuccess({ name, family, experience }) {
  const resolvedFamily = resolveFamily(family);
  const firstSteps = FAMILY_FIRST_STEPS[resolvedFamily.id] ?? "core game loop";
  const designerRead = FAMILY_DESIGNER_READ[resolvedFamily.id] ?? null;
  const advisors = FAMILY_ADVISORS[resolvedFamily.id] ?? null;
  const isFirstTimer = experience === "first" || experience === "first-time";

  const lines = [
    "## What's Different Now",
    `${name} is set up as a ${resolvedFamily.label} game. Your next session opens with full project context instead of starting from scratch.`,
    "",
    "What Temper installed:",
    "- **temper.config.json** — the operating contract. Every Temper command reads this.",
    "- **SESSION.md** — tracks what's in progress across sessions.",
    "- **claude.md / codex.md** — assistant guides. Your AI reads these at the start of every session.",
    "- **MCP tools** — `temper_coach`, `temper_ship`, `temper_handoff` (via the Temper MCP server).",
    "",
    `Here's how Temper works day-to-day:`,
    `- **Before designing something new** → \`temper coach\` — ${advisors ?? "advisors"} weigh in through ${resolvedFamily.label} doctrine`,
    "- **After building a feature** → `temper ship` — runs your build + test pipeline",
    "- **When touching economy or progression** → `temper balance` — checks against your game's balance model",
    "- **Ending a session** → `temper handoff` — writes a restart artifact so the next session picks up clean",
    "",
    "To undo everything: `temper uninstall --preview --cwd .`"
  ];

  if (designerRead) {
    lines.push("", "## Designer's Take", designerRead);
  }

  const firstMoveCommand = `pnpm exec temper coach --cwd . --intent "starting ${firstSteps}"`;

  if (isFirstTimer) {
    lines.push(
      "",
      "## First Move",
      `Before you write any code, run this — it'll tell you exactly where to start and what to watch out for with a ${resolvedFamily.label} game:`,
      "",
      `\`${firstMoveCommand}\``
    );
  } else {
    lines.push(
      "",
      "## First Move",
      `\`${firstMoveCommand}\``
    );
  }

  return lines.join("\n") + "\n";
}

export function renderInitOpening({ name, family }) {
  const resolvedFamily = resolveFamily(family);
  const lines = [
    "## Starting From Scratch",
    "Looks like a new project — nothing here yet to analyze.",
    "",
    "## Suggested Opening Message",
    "Temper installs an operating contract your AI reads every session — it's how I know what this project is, how to ship safely, and how to hand off work without losing context. Takes about 30 seconds.",
    "",
    "Three things I need:",
    "",
    "1. What's the game called?",
    "2. What kind of game is it? The more detail the better — inspiration, mechanics, what makes it different.",
    "",
    "Common types: RPG, card game, tower defense, platformer, roguelike, puzzle, strategy, sim",
    "",
    "3. How much game dev experience do you have? (first time / some experience / shipped before)"
  ];

  if (name && family) {
    lines.push(
      "",
      "## Already Have Both — Run Directly",
      `  pnpm exec temper init --name "${name}" --family ${resolvedFamily.id} --cwd .`
    );
  } else {
    lines.push(
      "",
      "---",
      "STOP. Deliver the message above in your own voice. Ask the three questions. Wait for the user's answers.",
      "Do not run any commands. Do not guess the answers. Do not offer to skip ahead.",
      "",
      "When you have all three answers, run:",
      `  pnpm exec temper init --name "<name>" --family <type> --experience <first|experienced> --cwd .`,
      "After init completes, deliver the **Suggested Message** from its output — it includes the capability preview."
    );
  }

  return lines.join("\n") + "\n";
}
