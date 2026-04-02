import fs from "node:fs";
import path from "node:path";
import { gatherRepoContext } from "./repo-context.mjs";

export const CONFIG_FILENAME = "temper.config.json";
export const TEMPER_DIRNAME = ".temper";

export function findProjectRoot(startCwd = process.cwd()) {
  const resolved = path.resolve(startCwd);
  const locatedConfig = findConfig(resolved);
  if (locatedConfig) {
    return path.dirname(locatedConfig);
  }

  const repo = gatherRepoContext({ cwd: resolved });
  if (repo.available) {
    return repo.gitRoot;
  }

  return resolved;
}

export function findConfig(startCwd = process.cwd()) {
  let current = path.resolve(startCwd);

  while (true) {
    const candidate = path.join(current, CONFIG_FILENAME);
    if (fs.existsSync(candidate)) {
      return candidate;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
}

export function loadProjectConfig(options = {}) {
  const cwd = options.cwd ? path.resolve(options.cwd) : process.cwd();
  const filePath = options.filePath ? path.resolve(options.filePath) : findConfig(cwd);

  if (!filePath) {
    if (options.required === false) {
      return null;
    }
    throw new Error(`No ${CONFIG_FILENAME} found from ${cwd}`);
  }

  const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
  return {
    ...parsed,
    __filePath: filePath,
    __projectRoot: path.dirname(filePath)
  };
}

export function writeProjectConfig(projectRoot, config, options = {}) {
  const root = path.resolve(projectRoot);
  const filePath = path.join(root, CONFIG_FILENAME);

  if (fs.existsSync(filePath) && !options.force) {
    throw new Error(`${CONFIG_FILENAME} already exists in ${root}. Use --force to overwrite.`);
  }

  fs.writeFileSync(filePath, JSON.stringify(config, null, 2) + "\n");
  return filePath;
}

export function ensureTemperDir(projectRoot) {
  const dirPath = path.join(path.resolve(projectRoot), TEMPER_DIRNAME);
  fs.mkdirSync(dirPath, { recursive: true });
  return dirPath;
}

export function writeProjectFile(projectRoot, relativePath, content) {
  const filePath = path.join(path.resolve(projectRoot), relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
  return filePath;
}

export function commandCwd(projectRoot, commandConfig) {
  const base = path.resolve(projectRoot);
  if (!commandConfig?.cwd) {
    return base;
  }
  return path.resolve(base, commandConfig.cwd);
}

export function rel(projectRoot, targetPath) {
  return path.relative(path.resolve(projectRoot), path.resolve(targetPath)).replace(/\\/g, "/") || ".";
}
