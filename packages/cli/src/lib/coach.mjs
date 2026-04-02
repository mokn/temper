import path from "node:path";
import { searchDoctrine } from "./doctrine.mjs";
import { gatherRepoContext } from "./repo-context.mjs";

const HAT_REGISTRY = {
  kaplan: {
    id: "kaplan",
    name: "Jeff Kaplan",
    emoji: "🎯",
    docId: "hats/kaplan",
    keywords: [
      "fairness",
      "trust",
      "progression",
      "drop",
      "reward",
      "onboarding",
      "community",
      "live",
      "liveops",
      "patch",
      "player"
    ],
    defaultTone: ["player-first", "plainspoken", "pragmatic"]
  },
  miyamoto: {
    id: "miyamoto",
    name: "Shigeru Miyamoto",
    emoji: "✨",
    docId: "hats/miyamoto",
    keywords: [
      "feel",
      "tutorial",
      "onboarding",
      "first",
      "camera",
      "controls",
      "delight",
      "readability",
      "sound",
      "puzzle",
      "exploration",
      "ux"
    ],
    defaultTone: ["warm", "clear", "playful"]
  },
  meier: {
    id: "meier",
    name: "Sid Meier",
    emoji: "♟️",
    docId: "hats/meier",
    keywords: [
      "decision",
      "decisions",
      "tradeoff",
      "tradeoffs",
      "strategy",
      "balance",
      "economy",
      "build",
      "tactics",
      "upgrade",
      "progression"
    ],
    defaultTone: ["analytical", "calm", "precise"]
  },
  wright: {
    id: "wright",
    name: "Will Wright",
    emoji: "🌱",
    docId: "hats/wright",
    keywords: [
      "system",
      "systems",
      "emergence",
      "emergent",
      "simulation",
      "sandbox",
      "procedural",
      "ugc",
      "crafting",
      "story",
      "stories",
      "possibility"
    ],
    defaultTone: ["curious", "systems-oriented", "generative"]
  },
  carmack: {
    id: "carmack",
    name: "John Carmack",
    emoji: "🔧",
    docId: "hats/carmack",
    keywords: [
      "infra",
      "security",
      "performance",
      "network",
      "networking",
      "rendering",
      "rollback",
      "hotfix",
      "deploy",
      "debug",
      "tooling",
      "measurement",
      "refactor"
    ],
    defaultTone: ["terse", "skeptical", "evidence-seeking"]
  }
};

const CAPABILITY_REGISTRY = {
  coach: {
    id: "coach",
    docId: "capabilities/coach",
    hats: [],
    keywords: ["coach", "feedback", "mentor", "hat"]
  },
  ship: {
    id: "ship",
    docId: "capabilities/ship",
    hats: ["kaplan", "carmack"],
    keywords: ["ship", "release", "patch", "notes", "version"]
  },
  hotfix: {
    id: "hotfix",
    docId: "capabilities/hotfix",
    hats: ["carmack", "kaplan"],
    keywords: ["hotfix", "incident", "prod", "rollback"]
  },
  review: {
    id: "review",
    docId: "capabilities/review",
    hats: ["carmack", "kaplan"],
    keywords: ["review", "regression", "bug", "risk"]
  },
  verify: {
    id: "verify",
    docId: "capabilities/verify",
    hats: ["carmack"],
    keywords: ["verify", "validation", "parity", "check"]
  },
  handoff: {
    id: "handoff",
    docId: "capabilities/handoff",
    hats: ["carmack"],
    keywords: ["handoff", "session", "worktree", "restart"]
  },
  security: {
    id: "security",
    docId: "capabilities/security",
    hats: ["carmack", "kaplan"],
    keywords: ["security", "auth", "abuse", "exploit", "permission"]
  },
  infra: {
    id: "infra",
    docId: "capabilities/infra",
    hats: ["carmack"],
    keywords: ["infra", "deploy", "service", "ops", "secret"]
  },
  deploy: {
    id: "deploy",
    docId: "capabilities/deploy",
    hats: ["carmack", "kaplan"],
    keywords: ["deploy", "beta", "staging", "prod", "environment"]
  },
  balance: {
    id: "balance",
    docId: "capabilities/balance",
    hats: ["kaplan", "meier", "wright"],
    keywords: ["balance", "economy", "drop", "ability", "tuning", "progression"]
  },
  audit: {
    id: "audit",
    docId: "capabilities/audit",
    hats: ["carmack"],
    keywords: ["audit", "drift", "consistency", "architecture"]
  },
  ux: {
    id: "ux",
    docId: "capabilities/ux",
    hats: ["miyamoto", "kaplan"],
    keywords: ["ux", "tutorial", "onboarding", "readability", "mobile", "flow"]
  },
  future: {
    id: "future",
    docId: "capabilities/future",
    hats: ["wright", "carmack", "meier"],
    keywords: ["future", "roadmap", "migration", "extensibility", "longterm"]
  }
};

const FAMILY_REGISTRY = {
  "deterministic-turn-based": {
    id: "deterministic-turn-based",
    name: "Deterministic Turn-Based",
    docId: "architecture/families/deterministic-turn-based",
    hats: ["meier", "kaplan", "carmack"],
    keywords: ["board", "card", "turn", "tactics", "deterministic", "phase", "move"]
  },
  "data-driven-progression-rpg": {
    id: "data-driven-progression-rpg",
    name: "Data-Driven Progression RPG",
    docId: "architecture/families/data-driven-progression-rpg",
    hats: ["kaplan", "meier", "wright", "carmack"],
    keywords: ["rpg", "loot", "drop", "ability", "progression", "item", "roguelite"]
  },
  "real-time-wave-systemic": {
    id: "real-time-wave-systemic",
    name: "Real-Time Wave/Systemic",
    docId: "architecture/families/real-time-wave-systemic",
    hats: ["kaplan", "meier", "wright", "miyamoto"],
    keywords: ["wave", "spawn", "tower", "defense", "survivor", "pressure", "auto"]
  },
  "real-time-action": {
    id: "real-time-action",
    name: "Real-Time Action",
    docId: "architecture/families/real-time-action",
    hats: ["miyamoto", "kaplan", "carmack"],
    keywords: ["action", "platformer", "combat", "camera", "input", "movement"]
  },
  "competitive-server-authoritative": {
    id: "competitive-server-authoritative",
    name: "Competitive Server-Authoritative",
    docId: "architecture/families/competitive-server-authoritative",
    hats: ["kaplan", "carmack", "miyamoto"],
    keywords: ["moba", "shooter", "match", "authority", "replication", "prediction", "pvp"]
  },
  "simulation-management-sandbox": {
    id: "simulation-management-sandbox",
    name: "Simulation / Management / Sandbox",
    docId: "architecture/families/simulation-management-sandbox",
    hats: ["wright", "meier", "carmack"],
    keywords: ["simulation", "management", "city", "sandbox", "throughput", "economy", "colony"]
  },
  "narrative-choice-driven-puzzle": {
    id: "narrative-choice-driven-puzzle",
    name: "Narrative / Choice-Driven / Puzzle",
    docId: "architecture/families/narrative-choice-driven-puzzle",
    hats: ["miyamoto", "kaplan", "meier"],
    keywords: ["narrative", "branch", "dialogue", "puzzle", "story", "choice"]
  },
  "social-persistent-ugc": {
    id: "social-persistent-ugc",
    name: "Social / Persistent / UGC",
    docId: "architecture/families/social-persistent-ugc",
    hats: ["kaplan", "carmack", "wright"],
    keywords: ["ugc", "social", "persistent", "creator", "moderation", "publish"]
  }
};

const FILE_HINTS = [
  {
    pattern: /(item|loot|drop|ability|abilities|progression|economy|enemy|formula|tuning)/i,
    hats: ["kaplan", "meier", "wright"],
    capabilities: ["balance"],
    families: ["data-driven-progression-rpg"]
  },
  {
    pattern: /(camera|control|input|hud|tutorial|onboarding|ui|ux|audio|sound|mobile)/i,
    hats: ["miyamoto", "kaplan"],
    capabilities: ["ux"],
    families: ["real-time-action"]
  },
  {
    pattern: /(deploy|infra|ops|server|service|network|replication|authority|auth|security|hotfix|rollback|indexer|relayer)/i,
    hats: ["carmack", "kaplan"],
    capabilities: ["infra", "security"],
    families: ["competitive-server-authoritative"]
  },
  {
    pattern: /(simulation|sandbox|procedural|craft|crafting|world|city|colony)/i,
    hats: ["wright", "meier"],
    capabilities: ["future"],
    families: ["simulation-management-sandbox"]
  }
];

const OPERATING_MODEL_DOC = "architecture/operating-model";
const GENERIC_FILE_TERMS = new Set([
  "app",
  "apps",
  "bin",
  "build",
  "canon",
  "cli",
  "client",
  "components",
  "config",
  "configs",
  "derived",
  "dist",
  "doc",
  "docs",
  "file",
  "files",
  "index",
  "js",
  "json",
  "jsx",
  "lib",
  "md",
  "mjs",
  "module",
  "package",
  "packages",
  "scripts",
  "server",
  "source",
  "spec",
  "specs",
  "src",
  "test",
  "tests",
  "ts",
  "tsx",
  "txt",
  "util",
  "utils",
  "yaml",
  "yml"
]);

export function parseCoachArgs(args) {
  const flags = {
    json: false,
    repo: true,
    limit: 8,
    hats: [],
    capabilities: [],
    families: [],
    files: []
  };
  const positional = [];

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith("--")) {
      positional.push(arg);
      continue;
    }

    const [rawKey, inlineValue] = arg.slice(2).split("=", 2);
    const key = rawKey.trim();

    if (key === "json") {
      flags.json = true;
      continue;
    }
    if (key === "no-repo") {
      flags.repo = false;
      continue;
    }

    const nextValue =
      inlineValue ?? (index + 1 < args.length && !args[index + 1].startsWith("--") ? args[++index] : "");

    switch (key) {
      case "intent":
        flags.intent = nextValue;
        break;
      case "notes":
        flags.notes = nextValue;
        break;
      case "event":
        flags.event = nextValue;
        break;
      case "env":
        flags.env = nextValue;
        break;
      case "mode":
        flags.mode = nextValue;
        break;
      case "query":
        flags.query = nextValue;
        break;
      case "cwd":
        flags.cwd = nextValue;
        break;
      case "hat":
      case "hats":
        flags.hats.push(...splitList(nextValue));
        break;
      case "capability":
      case "capabilities":
        flags.capabilities.push(...splitList(nextValue));
        break;
      case "family":
      case "families":
        flags.families.push(...splitList(nextValue));
        break;
      case "file":
      case "files":
        flags.files.push(...splitList(nextValue));
        break;
      case "limit":
        flags.limit = Number.parseInt(nextValue, 10) || flags.limit;
        break;
      default:
        positional.push(arg);
        break;
    }
  }

  return {
    ...flags,
    positional,
    queryText: [flags.query, flags.intent, flags.notes, positional.join(" ")].filter(Boolean).join(" ").trim()
  };
}

export function buildCoachPacket(input) {
  const normalized = normalizeInput(input);
  const repo = normalized.repo ? gatherRepoContext({ cwd: normalized.cwd }) : null;
  const effectiveFiles = collectEffectiveFiles(normalized.files, repo);
  const routedInput = {
    ...normalized,
    repo,
    files: effectiveFiles,
    explicitFiles: normalized.files
  };
  const capabilitySelection = selectCapabilities(routedInput);
  const familySelection = selectFamilies(routedInput);
  const hatSelection = selectHats(routedInput, capabilitySelection, familySelection);
  const doctrineQuery = buildDoctrineQuery(routedInput, capabilitySelection, familySelection, hatSelection);
  const docIds = collectSelectedDocIds(capabilitySelection, familySelection, hatSelection);
  const retrieval = retrieveDoctrine(doctrineQuery, docIds, normalized.limit);

  const packet = {
    version: "0.1",
    type: "temper.coach.packet",
    query: doctrineQuery,
    input: {
      intent: normalized.intent,
      notes: normalized.notes,
      event: normalized.event,
      env: normalized.env,
      mode: normalized.mode,
      files: effectiveFiles,
      explicit_files: routedInput.explicitFiles,
      positional: normalized.positional,
      cwd: normalized.cwd
    },
    repo: repo ? summarizeRepo(repo) : null,
    selection: {
      hats: hatSelection.map(toSelectionPayload),
      capabilities: capabilitySelection.map(toSelectionPayload),
      families: familySelection.map(toSelectionPayload)
    },
    retrieval: {
      chunk_count: retrieval.length,
      chunks: retrieval
    },
    render: buildRenderContract(hatSelection, capabilitySelection, familySelection)
  };

  return packet;
}

function normalizeInput(input) {
  const positional = input.positional ?? [];
  const queryText =
    input.queryText?.trim() ||
    [input.query, input.intent, input.notes, positional.join(" ")].filter(Boolean).join(" ").trim();

  return {
    json: Boolean(input.json),
    repo: input.repo !== false,
    limit: clampLimit(input.limit),
    intent: input.intent?.trim() || "",
    notes: input.notes?.trim() || "",
    event: input.event?.trim() || "",
    env: input.env?.trim() || "",
    mode: input.mode?.trim() || "",
    cwd: input.cwd?.trim() || process.cwd(),
    files: dedupe(input.files ?? []),
    hats: dedupe((input.hats ?? []).map(normalizeId)),
    capabilities: dedupe((input.capabilities ?? []).map(normalizeId)),
    families: dedupe((input.families ?? []).map(normalizeId)),
    positional,
    queryText
  };
}

function selectCapabilities(input) {
  const scores = new Map();
  const reasons = new Map();
  const keywords = tokenizeContext(input);

  for (const capability of input.capabilities) {
    if (!CAPABILITY_REGISTRY[capability]) {
      continue;
    }
    addScore(scores, reasons, capability, 100, `explicit:${capability}`);
  }

  for (const [id, config] of Object.entries(CAPABILITY_REGISTRY)) {
    for (const keyword of config.keywords) {
      if (keywords.includes(keyword)) {
        addScore(scores, reasons, id, 5, `keyword:${keyword}`);
      }
    }
  }

  for (const hint of inferFileHints(input.files)) {
    for (const capability of hint.capabilities) {
      addScore(scores, reasons, capability, 8, `file:${hint.file}`);
    }
  }

  if (input.event && CAPABILITY_REGISTRY[input.event]) {
    addScore(scores, reasons, input.event, 15, `event:${input.event}`);
  }

  return finalizeSelection(scores, reasons, CAPABILITY_REGISTRY, 3);
}

function selectFamilies(input) {
  const scores = new Map();
  const reasons = new Map();
  const keywords = tokenizeContext(input);

  for (const family of input.families) {
    if (!FAMILY_REGISTRY[family]) {
      continue;
    }
    addScore(scores, reasons, family, 100, `explicit:${family}`);
  }

  for (const [id, config] of Object.entries(FAMILY_REGISTRY)) {
    for (const keyword of config.keywords) {
      if (keywords.includes(keyword)) {
        addScore(scores, reasons, id, 4, `keyword:${keyword}`);
      }
    }
  }

  for (const hint of inferFileHints(input.files)) {
    for (const family of hint.families) {
      addScore(scores, reasons, family, 8, `file:${hint.file}`);
    }
  }

  return finalizeSelection(scores, reasons, FAMILY_REGISTRY, 1);
}

function selectHats(input, capabilities, families) {
  const scores = new Map();
  const reasons = new Map();
  const keywords = tokenizeContext(input);

  for (const hat of input.hats) {
    if (!HAT_REGISTRY[hat]) {
      continue;
    }
    addScore(scores, reasons, hat, 100, `explicit:${hat}`);
  }

  for (const [id, config] of Object.entries(HAT_REGISTRY)) {
    for (const keyword of config.keywords) {
      if (keywords.includes(keyword)) {
        addScore(scores, reasons, id, 5, `keyword:${keyword}`);
      }
    }
  }

  for (const capability of capabilities) {
    for (const hat of capability.hats ?? []) {
      addScore(scores, reasons, hat, 15, `capability:${capability.id}`);
    }
  }

  for (const family of families) {
    for (const hat of family.hats ?? []) {
      addScore(scores, reasons, hat, 10, `family:${family.id}`);
    }
  }

  for (const hint of inferFileHints(input.files)) {
    for (const hat of hint.hats) {
      addScore(scores, reasons, hat, 8, `file:${hint.file}`);
    }
  }

  if (scores.size === 0) {
    addScore(scores, reasons, "kaplan", 1, "default:player-trust-baseline");
  }

  return finalizeSelection(scores, reasons, HAT_REGISTRY, 2);
}

function buildDoctrineQuery(input, capabilities, families, hats) {
  const fileTerms = input.files.flatMap((file) => tokenizePath(file)).join(" ");
  const selectionTerms = [
    ...capabilities.map((item) => item.id),
    ...families.map((item) => item.id),
    ...hats.map((item) => item.id)
  ].join(" ");
  const repoTerms = input.repo?.available ? [input.repo.branch, input.repo.isDirty ? "dirty" : "clean"].join(" ") : "";

  return [input.queryText, input.event, input.env, input.mode, fileTerms, selectionTerms, repoTerms]
    .filter(Boolean)
    .join(" ")
    .trim();
}

function collectSelectedDocIds(capabilities, families, hats) {
  return dedupe([
    OPERATING_MODEL_DOC,
    ...capabilities.map((item) => item.docId).filter(Boolean),
    ...families.map((item) => item.docId).filter(Boolean),
    ...hats.map((item) => item.docId).filter(Boolean)
  ]);
}

function retrieveDoctrine(query, docIds, limit) {
  const anchored = [];
  const seen = new Set();

  for (const docId of docIds) {
    const [result] = searchDoctrine(query, {
      limit: 1,
      includeContent: true,
      docIds: [docId],
      boostDocIds: [docId]
    });

    if (!result || seen.has(result.id)) {
      continue;
    }

    seen.add(result.id);
    anchored.push(toChunkPayload(result));
  }

  const targeted = searchDoctrine(query, {
    limit: Math.max(limit, docIds.length + 2),
    includeContent: true,
    docIds,
    boostDocIds: docIds
  });
  const global = searchDoctrine(query, {
    limit: limit,
    includeContent: true,
    boostDocIds: docIds
  });

  const merged = [...anchored];

  for (const result of [...targeted, ...global]) {
    if (seen.has(result.id)) {
      continue;
    }
    seen.add(result.id);
    merged.push(toChunkPayload(result));
    if (merged.length >= limit) {
      break;
    }
  }

  return merged;
}

function toChunkPayload(result) {
  return {
    id: result.id,
    doc: result.doc,
    title: result.title,
    score: result.score,
    summary: result.summary,
    content: result.content,
    metadata: result.metadata
  };
}

function buildRenderContract(hats, capabilities, families) {
  const primaryHat = hats[0] ?? null;
  const tones = dedupe(hats.flatMap((hat) => hat.defaultTone ?? []));

  return {
    primary_hat: primaryHat
      ? {
          id: primaryHat.id,
          name: primaryHat.name,
          emoji: primaryHat.emoji
        }
      : null,
    secondary_hats: hats.slice(1).map((hat) => ({
      id: hat.id,
      name: hat.name,
      emoji: hat.emoji
    })),
    tones,
    output_shape: ["one observation", "one concrete risk or opportunity", "one question or next move"],
    avoid: ["theatrical impersonation", "long monologues", "ungrounded generic praise"],
    instruction:
      "Render a short, context-dependent feedback card grounded in the selected doctrine and retrieved chunks. Use hat labels with emoji, not literal impersonation.",
    selected_context: {
      capabilities: capabilities.map((item) => item.id),
      families: families.map((item) => item.id)
    }
  };
}

function inferFileHints(files) {
  const hints = [];

  for (const file of files) {
    for (const hint of FILE_HINTS) {
      if (hint.pattern.test(file)) {
        hints.push({
          file: path.basename(file),
          hats: hint.hats,
          capabilities: hint.capabilities,
          families: hint.families
        });
      }
    }
  }

  return hints;
}

function finalizeSelection(scores, reasons, registry, maxItems) {
  return [...scores.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, maxItems)
    .map(([id, score]) => ({
      ...registry[id],
      score,
      reasons: dedupe(reasons.get(id) ?? [])
    }));
}

function addScore(scores, reasons, id, amount, reason) {
  scores.set(id, (scores.get(id) ?? 0) + amount);
  const current = reasons.get(id) ?? [];
  current.push(reason);
  reasons.set(id, current);
}

function tokenizeContext(input) {
  return dedupe(
    [input.queryText, input.event, input.env, input.mode]
      .join(" ")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(Boolean)
  );
}

function tokenizePath(file) {
  return file
    .split(/[\\/]/)
    .flatMap((segment) => segment.toLowerCase().split(/[^a-z0-9]+/))
    .filter((term) => term && term.length > 2 && !GENERIC_FILE_TERMS.has(term));
}

function splitList(input) {
  return input
    .split(/[,\s]+/)
    .map((item) => normalizeId(item))
    .filter(Boolean);
}

function normalizeId(input) {
  return input.trim().toLowerCase();
}

function dedupe(items) {
  return [...new Set(items.filter(Boolean))];
}

function clampLimit(value) {
  if (!Number.isFinite(value)) {
    return 8;
  }
  return Math.max(1, Math.min(12, value));
}

function toSelectionPayload(item) {
  return {
    id: item.id,
    name: item.name ?? item.title ?? item.id,
    emoji: item.emoji ?? null,
    doc: item.docId ?? null,
    score: item.score,
    reasons: item.reasons
  };
}

function collectEffectiveFiles(explicitFiles, repo) {
  const files = explicitFiles.length > 0 ? explicitFiles : repo?.changedFiles ?? [];
  return dedupe(files).slice(0, 12);
}

function summarizeRepo(repo) {
  if (!repo.available) {
    return {
      available: false,
      cwd: repo.cwd,
      reason: repo.reason
    };
  }

  return {
    available: true,
    git_root: repo.gitRoot,
    branch: repo.branch,
    dirty: repo.isDirty,
    counts: repo.counts,
    changed_files: repo.changedFiles.slice(0, 12),
    status_lines: repo.statusLines.slice(0, 20),
    diff_summary: repo.diffSummary,
    workflow_files: repo.workflowFiles,
    session_excerpt: repo.sessionExcerpt
  };
}
