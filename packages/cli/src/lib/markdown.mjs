export function parseMarkdownDocument(markdown) {
  const { metadata, body } = extractFrontmatter(markdown);
  return {
    metadata,
    body,
    sections: extractSections(body)
  };
}

export function extractSections(markdown) {
  const lines = markdown.split(/\r?\n/);
  const sections = [];
  let current = {
    title: "Document",
    level: 0,
    slug: "document",
    content: []
  };

  for (const line of lines) {
    const match = /^(#{1,6})\s+(.*)$/.exec(line);
    if (match) {
      if (current.content.length > 0 || current.level > 0) {
        sections.push({
          title: current.title,
          level: current.level,
          slug: current.slug,
          content: current.content.join("\n").trim()
        });
      }
      const title = match[2].trim();
      current = {
        title,
        level: match[1].length,
        slug: slugify(title),
        content: []
      };
      continue;
    }
    current.content.push(line);
  }

  if (current.content.length > 0 || current.level > 0) {
    sections.push({
      title: current.title,
      level: current.level,
      slug: current.slug,
      content: current.content.join("\n").trim()
    });
  }

  return sections.filter(
    (section) => section.content.length > 0 && section.slug !== "table-of-contents"
  );
}

export function extractFrontmatter(markdown) {
  if (!markdown.startsWith("---\n")) {
    return {
      metadata: {},
      body: markdown
    };
  }

  const lines = markdown.split(/\r?\n/);
  let index = 1;
  const metadata = {};
  let activeArrayKey = null;

  for (; index < lines.length; index += 1) {
    const line = lines[index];

    if (line.trim() === "---") {
      return {
        metadata,
        body: lines.slice(index + 1).join("\n")
      };
    }

    if (/^\s*-\s+/.test(line) && activeArrayKey) {
      metadata[activeArrayKey].push(normalizeFrontmatterValue(line.replace(/^\s*-\s+/, "")));
      continue;
    }

    const match = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
    if (!match) {
      activeArrayKey = null;
      continue;
    }

    const [, rawKey, rawValue] = match;
    const key = rawKey.trim();
    const value = rawValue.trim();

    if (value.length === 0) {
      metadata[key] = [];
      activeArrayKey = key;
      continue;
    }

    metadata[key] = normalizeFrontmatterValue(value);
    activeArrayKey = null;
  }

  return {
    metadata: {},
    body: markdown
  };
}

export function slugify(input) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function summarizeContent(content) {
  const text = content.replace(/\s+/g, " ").trim();
  return text.slice(0, 180);
}

function normalizeFrontmatterValue(input) {
  return input.replace(/^['"]|['"]$/g, "").trim();
}
