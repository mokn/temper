import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const repoRoot = path.resolve(__dirname, "../../../../");
export const canonRoot = path.join(repoRoot, "canon");
export const derivedRoot = path.join(repoRoot, "derived");
export const specRoot = path.join(repoRoot, "docs", "spec");
