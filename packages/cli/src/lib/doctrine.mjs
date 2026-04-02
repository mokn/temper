import fs from "node:fs";
import path from "node:path";
import { canonRoot, derivedRoot } from "./paths.mjs";
import { parseMarkdownDocument, summarizeContent } from "./markdown.mjs";

export function listCanonDocs() {
  return walkMarkdownFiles(canonRoot);
}

export function deriveCanonDocs() {
  const docs = listCanonDocs();
  const results = [];

  for (const docPath of docs) {
    const relativePath = path.relative(canonRoot, docPath);
    const markdown = fs.readFileSync(docPath, "utf8");
    const { metadata, sections } = parseMarkdownDocument(markdown);
    const docId = relativePath.replace(/\\/g, "/").replace(/\.md$/, "");

    const manifest = {
      id: docId,
      source: relativePath.replace(/\\/g, "/"),
      metadata,
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
        metadata,
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
  const grouped = {
    hats: 0,
    architecture: 0,
    capabilities: 0,
    other: 0
  };

  for (const docPath of docs) {
    const relative = path.relative(canonRoot, docPath).replace(/\\/g, "/");
    if (relative.startsWith("hats/")) {
      grouped.hats += 1;
    } else if (relative.startsWith("architecture/")) {
      grouped.architecture += 1;
    } else if (relative.startsWith("capabilities/")) {
      grouped.capabilities += 1;
    } else {
      grouped.other += 1;
    }
  }

  return {
    canonDocCount: docs.length,
    canonDocs: docs.map((docPath) => path.relative(canonRoot, docPath).replace(/\\/g, "/")),
    grouped
  };
}

export function searchDoctrine(query, options = {}) {
  const terms = tokenize(query);
  if (terms.length === 0 && !hasDocScope(options)) {
    return [];
  }

  const limit = Number.isFinite(options.limit) ? options.limit : 8;
  const results = [];

  for (const docPath of listCanonDocs()) {
    const relativePath = path.relative(canonRoot, docPath).replace(/\\/g, "/");
    const markdown = fs.readFileSync(docPath, "utf8");
    const { metadata, sections } = parseMarkdownDocument(markdown);
    const docId = relativePath.replace(/\.md$/, "");
    if (!matchesDocScope(docId, options)) {
      continue;
    }
    const metadataTerms = collectMetadataTerms(metadata);

    for (const [index, section] of sections.entries()) {
      const score = scoreSection({
        terms,
        section,
        docId,
        metadataTerms,
        options
      });

      if (score <= 0) {
        continue;
      }

      results.push({
        id: `${docId}.${String(index + 1).padStart(2, "0")}`,
        doc: docId,
        source: relativePath,
        title: section.title,
        slug: section.slug,
        level: section.level,
        score,
        summary: summarizeContent(section.content),
        metadata,
        content: options.includeContent ? section.content : undefined
      });
    }
  }

  return results
    .sort((left, right) => right.score - left.score || left.doc.localeCompare(right.doc))
    .slice(0, limit);
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

function hasDocScope(options) {
  return Boolean(options.docIds?.length || options.docPrefixes?.length);
}

function matchesDocScope(docId, options) {
  const { docIds = [], docPrefixes = [] } = options;
  if (docIds.length === 0 && docPrefixes.length === 0) {
    return true;
  }

  if (docIds.includes(docId)) {
    return true;
  }

  return docPrefixes.some((prefix) => docId.startsWith(prefix));
}

function tokenize(input) {
  return input
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map((term) => term.trim())
    .filter(Boolean);
}

function collectMetadataTerms(metadata) {
  const values = [];

  for (const value of Object.values(metadata)) {
    if (Array.isArray(value)) {
      values.push(...value);
    } else if (typeof value === "string") {
      values.push(value);
    }
  }

  return tokenize(values.join(" "));
}

function scoreSection({ terms, section, docId, metadataTerms, options }) {
  const titleTerms = tokenize(section.title);
  const slugTerms = tokenize(section.slug);
  const docTerms = tokenize(docId);
  const body = section.content.toLowerCase();
  let score = baseDocBoost(docId, options);

  for (const term of terms) {
    let termScore = 0;
    let matched = false;

    if (titleTerms.includes(term)) {
      termScore = Math.max(termScore, 8);
      matched = true;
    }
    if (slugTerms.includes(term)) {
      termScore = Math.max(termScore, 6);
      matched = true;
    }
    if (docTerms.includes(term)) {
      termScore = Math.max(termScore, 4);
      matched = true;
    }
    if (body.includes(term)) {
      termScore = Math.max(termScore, 1);
      matched = true;
    }
    if (matched && metadataTerms.includes(term)) {
      termScore += 2;
    }

    score += termScore;
  }

  return score;
}

function baseDocBoost(docId, options) {
  let boost = 0;

  if (options.boostDocIds?.includes(docId)) {
    boost += 3;
  }

  if (options.boostDocPrefixes?.some((prefix) => docId.startsWith(prefix))) {
    boost += 2;
  }

  return boost;
}
