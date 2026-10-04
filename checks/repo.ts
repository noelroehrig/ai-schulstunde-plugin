import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

/** A problem a rule found, located by repo-relative forward-slash path. */
export interface Finding {
  file: string;
  rule: string;
  message: string;
}

/** Which set of checks runs: `build` during development, `release` before shipping. */
export type Mode = "build" | "release";

/** A read-only view of a repository; the only way rules see files. */
export interface Repo {
  /** All files, as sorted repo-relative paths with forward slashes. */
  listFiles(): string[];
  readText(path: string): string;
  readBytes(path: string): Uint8Array;
}

/** A named check that inspects a repository and reports findings. */
export interface Rule {
  name: string;
  run(repo: Repo, mode: Mode): Finding[];
  /** Informational lines that are not findings, such as an expected gap during the build. */
  notices?(repo: Repo, mode: Mode): string[];
}

/** Directory names the walk never enters, at any depth. */
const SKIPPED_DIRS = new Set([".git", "node_modules"]);

/** Converts a native relative path to a repo-relative path with forward slashes. */
export function toRepoPath(nativePath: string, separator: string = sep): string {
  return nativePath.split(separator).join("/");
}

/** Creates a repository view backed by the file system under `root`. */
export function createFsRepo(root: string): Repo {
  return {
    listFiles: () => walk(root, root).sort(),
    readText: (path) => readFileSync(join(root, path), "utf8"),
    readBytes: (path) => readFileSync(join(root, path)),
  };
}

/** Lists files below `dir` as repo paths, skipping tooling directories. */
function walk(root: string, dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIPPED_DIRS.has(entry.name)) files.push(...walk(root, full));
    } else if (entry.isFile()) {
      files.push(toRepoPath(relative(root, full)));
    }
  }
  return files;
}

/** Creates an in-memory repository view from a map of repo paths to contents. */
export function createMemoryRepo(files: Record<string, string | Uint8Array>): Repo {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const get = (path: string): string | Uint8Array => {
    const content = files[path];
    if (content === undefined) throw new Error(`no such file: ${path}`);
    return content;
  };
  return {
    listFiles: () => Object.keys(files).sort(),
    readText: (path) => {
      const content = get(path);
      return typeof content === "string" ? content : decoder.decode(content);
    },
    readBytes: (path) => {
      const content = get(path);
      return typeof content === "string" ? encoder.encode(content) : content;
    },
  };
}
