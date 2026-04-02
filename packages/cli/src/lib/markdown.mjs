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

  return sections.filter((section) => section.content.length > 0);
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
