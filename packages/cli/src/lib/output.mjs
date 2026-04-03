export const TEMPER_SWORD_ART = String.raw`
      *
     /|\
    / | \
   /  |  \
  ====+====
      |
     [_]

   T E M P E R
Heat. Hammer. Quench. Ship.
`.trim();

export function printTemperBanner(subtitle) {
  console.log(TEMPER_SWORD_ART);
  if (subtitle) {
    console.log("");
    console.log(subtitle);
  }
}

export function printCoachBrief(gameName, packet) {
  const hats = packet.selection.hats;
  const chunks = packet.retrieval.chunks;
  const hatChunks = chunks.filter((c) => c.doc.startsWith("hats/"));
  const structuralChunks = chunks.filter((c) => !c.doc.startsWith("hats/"));

  // Intro line
  if (hats.length > 0) {
    const hatNames = hats.map((h) => `${h.emoji} ${h.name}`).join(" and ");
    console.log(`I pulled in ${hatNames} for this one. Here's their take on ${gameName}:`);
    console.log("");

    for (const hat of hats) {
      const hc = hatChunks.filter((c) => c.doc === `hats/${hat.id}`);
      if (hc.length > 0) {
        const raw = hc[0].summary.replace(/>/g, "").replace(/"/g, "").replace(/\s+/g, " ").trim();
        const capped = raw.length > 200 ? raw.slice(0, 200) : raw;
        const lastSentence = capped.match(/(.*[.!?])/s)?.[1]?.trim() ?? capped.trimEnd() + "...";
        console.log(`${hat.emoji} ${hat.name}`);
        console.log(`"${lastSentence}"`);
        console.log("");
      }
    }
  }

  // Where to start — prefer source-of-truth boundaries or core structural rule
  const guidanceChunk =
    structuralChunks.find((c) => c.title.toLowerCase().includes("source-of-truth")) ||
    structuralChunks.find((c) => c.title.toLowerCase().includes("core structural")) ||
    structuralChunks.find((c) => c.title.toLowerCase().includes("project structure"));

  const whyChunk = structuralChunks.find((c) => c.title.toLowerCase().includes("core structural"));

  if (guidanceChunk) {
    console.log("⚒ Where to Start");
    console.log("");

    if (whyChunk) {
      console.log(whyChunk.summary.trim());
      console.log("");
    }

    console.log("Define the data model first, in this order:");
    console.log("");

    // Parse "- item - item" format from summary
    const items = guidanceChunk.summary
      .split(/ - /)
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.toLowerCase().startsWith("canonical"));

    items.forEach((item, i) => console.log(`${i + 1}. ${item}`));
    console.log("");
    console.log("Get these into data files before writing game logic. Everything else builds on top cleanly.");
  }
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
