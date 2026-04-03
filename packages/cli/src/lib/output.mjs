import fs from "node:fs";
import path from "node:path";
import { canonRoot } from "./paths.mjs";

export const TEMPER_SWORD_ART = String.raw`
  ()==========>  T E M P E R
  Heat. Hammer. Quench. Ship.
`.trim();

export function printTemperBanner(subtitle) {
  console.log(TEMPER_SWORD_ART);
  if (subtitle) {
    console.log("");
    console.log(subtitle);
  }
}

// Reads a full canon doc and returns its content trimmed to maxChars.
// Returns null if the file doesn't exist.
function readCanonDoc(relPath, maxChars = 6000) {
  const filePath = path.join(canonRoot, relPath);
  try {
    const content = fs.readFileSync(filePath, "utf8");
    // Strip YAML frontmatter
    const stripped = content.replace(/^---[\s\S]*?---\n/, "").trim();
    return stripped.length > maxChars ? stripped.slice(0, maxChars).trimEnd() + "\n[...truncated]" : stripped;
  } catch {
    return null;
  }
}

// Outputs an AI-facing context block for Pablo to synthesize into advice.
// NOT user-facing — the AI reads it and delivers in its own voice.
export function printCoachBrief(gameName, description, familyId, packet) {
  const hats = packet.selection.hats;

  console.log("## AI Context — Synthesize into your first message. Do not read this section aloud.");
  console.log("");
  console.log(`Game: ${gameName}`);
  if (description) console.log(`Description: ${description}`);
  const familyName = packet.selection.families[0]?.name ?? familyId;
  console.log(`Family: ${familyName}`);
  if (hats.length > 0) {
    console.log(`Advisors: ${hats.map((h) => `${h.emoji} ${h.name}`).join(" · ")}`);
  }
  console.log("");

  // Full family doctrine — small files, load completely
  const familyDoc = readCanonDoc(`architecture/families/${familyId}.md`);
  if (familyDoc) {
    console.log("## Family Doctrine");
    console.log(familyDoc);
    console.log("");
  }

  // Hat doctrine — first 4K chars covers core philosophy without blowing context
  for (const hat of hats) {
    const hatDoc = readCanonDoc(`hats/${hat.id}.md`, 4000);
    if (hatDoc) {
      console.log(`## ${hat.emoji} ${hat.name} Doctrine`);
      console.log(hatDoc);
      console.log("");
    }
  }

  console.log("## Synthesis Instructions");
  console.log("Using the doctrine above, deliver your first message in this order:");
  console.log("  1. 2-3 sentences: what to build first and why, specific to this game");
  console.log("  2. Advisor voices — give each active advisor a line with their emoji and a specific");
  console.log("     observation about THIS game. Use their actual philosophy, not paraphrases.");
  console.log("     e.g. '🎯 Kaplan: [their specific take on this game's trust or onboarding moment]'");
  console.log("  3. Ordered data model — what to define first as data files, in priority order");
  console.log("  4. One key architectural risk specific to this game's traits");
  console.log("  5. End with a focused question to keep the build conversation moving");
}

export function printHeader(title) {
  console.log(title);
  console.log("=".repeat(title.length));
}

export function printList(items) {
  for (const item of items) {
    console.log(`- ${item}`);
  }
}
