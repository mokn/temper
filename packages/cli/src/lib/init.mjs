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

export function buildInitConfig({ name, family, stack, packageManager = "pnpm" }) {
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
    notes: []
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

export function materializeInitInstall({ projectRoot, name, family, stack, packageManager, assistants = ["claude", "codex"] }) {
  const root = path.resolve(projectRoot);
  const config = buildInitConfig({ name, family, stack, packageManager });
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

  return { configPath, continuity, written, config, resolvedFamily: resolveFamily(family) };
}

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

export function renderInitSuccess({ name, family }) {
  const resolvedFamily = resolveFamily(family);
  const firstSteps = FAMILY_FIRST_STEPS[resolvedFamily.id] ?? "core systems";
  const lines = [
    "## Suggested First Message",
    `You're set up. ${name} is configured as a ${resolvedFamily.label} game.`,
    "",
    `To get started, tell me what you want to tackle first — ${firstSteps} — or I can suggest a good starting point.`
  ];
  return lines.join("\n") + "\n";
}

export function renderInitOpening({ name, family }) {
  const resolvedFamily = resolveFamily(family);
  const lines = [
    "## Starting From Scratch",
    "Looks like a new project — nothing here yet to analyze.",
    "",
    "## Suggested Opening Message",
    "Okay, starting from scratch. Two things I need from you:",
    "",
    "1. What's the game called?",
    "2. What kind of game is it?",
    "",
    "Common types: RPG, card game, tower defense, platformer, roguelike, puzzle, strategy, sim"
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
      "STOP. Do not continue past this line.",
      "Ask the two questions above. Wait for the user's answers.",
      "",
      "Then run:",
      `  pnpm exec temper init --name "<name>" --family <type> --cwd .`
    );
  }

  return lines.join("\n") + "\n";
}
