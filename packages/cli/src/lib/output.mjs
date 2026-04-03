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

// Reads a named section from a family canon file directly.
// Returns the section text or null if not found.
function readFamilySection(familyId, sectionHeading) {
  const filePath = path.join(canonRoot, "architecture", "families", `${familyId}.md`);
  let content;
  try {
    content = fs.readFileSync(filePath, "utf8");
  } catch {
    return null;
  }
  const pattern = new RegExp(`## ${sectionHeading}\\s*\\n([\\s\\S]*?)(?=\\n## |$)`, "i");
  const match = content.match(pattern);
  return match ? match[1].trim() : null;
}

// Outputs an AI-facing context block for Pablo to synthesize into advice.
// This is NOT user-facing — the AI reads it and delivers in its own voice.
export function printCoachBrief(gameName, description, familyId, packet) {
  const hats = packet.selection.hats;
  const chunks = packet.retrieval.chunks;

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

  // Core structural principle — from retrieval or direct file read
  const coreChunk = chunks.find((c) => c.title.toLowerCase().includes("core structural"));
  const coreText = coreChunk
    ? coreChunk.summary.replace(/>/g, "").replace(/\s+/g, " ").trim()
    : readFamilySection(familyId, "Core structural rule");
  if (coreText) {
    console.log(`Core principle: ${coreText}`);
    console.log("");
  }

  // Source-of-truth — from retrieval or direct file read
  const sotChunk = chunks.find((c) => c.title.toLowerCase().includes("source-of-truth"));
  const sotText = sotChunk
    ? sotChunk.summary.replace(/>/g, "").replace(/\s+/g, " ").trim()
    : readFamilySection(familyId, "Source-of-truth boundaries");
  if (sotText) {
    console.log(`Source-of-truth boundaries:\n${sotText}`);
    console.log("");
  }

  // Failure modes — from retrieval or direct file read
  const failureChunk = chunks.find((c) => c.title.toLowerCase().includes("failure"));
  const failureText = failureChunk
    ? failureChunk.summary.replace(/>/g, "").replace(/\s+/g, " ").trim()
    : readFamilySection(familyId, "Failure modes");
  if (failureText) {
    console.log(`Key failure modes:\n${failureText}`);
    console.log("");
  }

  // Advisor notes from hat chunks
  const hatChunks = chunks.filter((c) => c.doc.startsWith("hats/"));
  if (hatChunks.length > 0) {
    console.log("Advisor doctrine:");
    for (const hat of hats) {
      const hc = hatChunks.filter((c) => c.doc === `hats/${hat.id}`);
      if (hc.length > 0) {
        const text = hc[0].summary.replace(/>/g, "").replace(/"/g, "").replace(/\s+/g, " ").trim().slice(0, 200);
        console.log(`  ${hat.emoji} ${hat.name}: ${text}`);
      }
    }
    console.log("");
  }

  console.log("Deliver your first message in this order:");
  console.log("  1. Brief: what to build first and why — 2-3 sentences max");
  console.log("  2. Surface the advisors directly. Give each one a line with their emoji and a specific take on THIS game.");
  console.log("     e.g. '🎯 Kaplan: [specific observation about this game's onboarding or trust moment]'");
  console.log("     e.g. '♟️ Meier: [specific observation about this game's systems or tradeoffs]'");
  console.log("  3. The ordered data model list — what to define first");
  console.log("  4. One key risk specific to this game's traits");
  console.log("  5. End with a question to keep the conversation going");
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
