import fs from "node:fs";
import path from "node:path";
import { canonRoot, derivedRoot } from "./paths.mjs";
import { extractSections, summarizeContent } from "./markdown.mjs";

export function listCanonDocs() {
  return walkMarkdownFiles(canonRoot);
}

export function deriveCanonDocs() {
  const docs = listCanonDocs();
  const results = [];

  for (const docPath of docs) {
    const relativePath = path.relative(canonRoot, docPath);
    const markdown = fs.readFileSync(docPath, "utf8");
    const sections = extractSections(markdown);
    const docId = relativePath.replace(/\\/g, "/").replace(/\.md$/, "");

    const manifest = {
      id: docId,
      source: relativePath.replace(/\\/g, "/"),
      sectionCount: sections.length,
      sections: sections.map((section, index) => ({
        id: `${docId}.${String(index + 1).padStart(2, "0")}`,
        title: section.title,
        level: section.level,
        slug: section.slug,
        summary: summarizeContent(section.content)
      }))
    };

    const manifestPath = path.join(derivedRoot, "manifests", `${safeFileName(docId)}.json`);
    const chunkPath = path.join(derivedRoot, "chunks", `${safeFileName(docId)}.jsonl`);

    fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
    fs.mkdirSync(path.dirname(chunkPath), { recursive: true });
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");

    const chunkLines = sections.map((section, index) =>
      JSON.stringify({
        id: `${docId}.${String(index + 1).padStart(2, "0")}`,
        doc: docId,
        title: section.title,
        level: section.level,
        slug: section.slug,
        summary: summarizeContent(section.content),
        content: section.content
      })
    );
    fs.writeFileSync(chunkPath, chunkLines.join("\n") + "\n");

    results.push({
      docId,
      manifestPath,
      chunkPath,
      sectionCount: sections.length
    });
  }

  return results;
}

export function inspectDoctrine() {
  const docs = listCanonDocs();
  return {
    canonDocCount: docs.length,
    canonDocs: docs.map((docPath) => path.relative(canonRoot, docPath).replace(/\\/g, "/"))
  };
}

function walkMarkdownFiles(root) {
  const results = [];

  function visit(currentPath) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });
    for (const entry of entries) {
      const nextPath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        visit(nextPath);
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        results.push(nextPath);
      }
    }
  }

  if (fs.existsSync(root)) {
    visit(root);
  }

  return results.sort();
}

function safeFileName(input) {
  return input.replace(/[\\/]/g, "__");
}
