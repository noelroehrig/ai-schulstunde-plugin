import { execFileSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { formatFinding } from "./run.ts";
import { checkVersionBump, isValidRef } from "./version-bump.ts";

const USAGE = "usage: version-bump-cli.ts --base <ref>";

const MANIFEST = "plugin/.claude-plugin/plugin.json";
const CHANGELOG = "CHANGELOG.md";

/** Runs git with an argument array and returns its standard output; throws on failure. */
export type Git = (args: string[]) => string;

/** Starts the real git in `root`, without a shell. */
function systemGit(root: string): Git {
  return (args) =>
    execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

/** Reads the value of `--base` from the arguments; undefined when missing. */
export function parseBase(args: string[]): string | undefined {
  const index = args.indexOf("--base");
  return index === -1 ? undefined : args[index + 1];
}

/** Splits `git diff --name-only` output into paths, accepting LF and CRLF. */
function parseNameList(output: string): string[] {
  return output.split(/\r?\n/).filter((line) => line !== "");
}

/** Reads the `version` string of a `plugin.json` text; throws when it is missing. */
function manifestVersion(text: string, source: string): string {
  const version: unknown = (JSON.parse(text) as { version?: unknown }).version;
  if (typeof version !== "string") throw new Error(`${source}: no string version`);
  return version;
}

/**
 * Compares the working tree of `root` with the merge base of `<ref>` and `HEAD` and writes the
 * report through `out`. Returns the exit code: 0 clean, 1 findings, 2 usage or git error.
 */
export function main(
  args: string[],
  root: string,
  git: Git = systemGit(root),
  out: (line: string) => void = console.log,
  err: (line: string) => void = console.error,
): number {
  const base = parseBase(args);
  if (base === undefined || !isValidRef(base)) {
    err(USAGE);
    return 2;
  }
  let changedFiles: string[];
  let baseVersion: string;
  let headVersion: string;
  try {
    // Unquoted UTF-8 paths and both sides of a rename, so every changed path is seen as written.
    changedFiles = parseNameList(
      git(["-c", "core.quotepath=false", "diff", "--name-only", "--no-renames", `${base}...HEAD`]),
    );
    baseVersion = manifestVersion(git(["show", `${base}:${MANIFEST}`]), `${base}:${MANIFEST}`);
    headVersion = manifestVersion(readFileSync(join(root, MANIFEST), "utf8"), MANIFEST);
  } catch (error) {
    err(error instanceof Error ? error.message : String(error));
    return 2;
  }
  const findings = checkVersionBump({
    changedFiles,
    baseVersion,
    headVersion,
    changelogChanged: changedFiles.includes(CHANGELOG),
  });
  for (const finding of findings) out(formatFinding(finding));
  out(`${findings.length} findings (version bump)`);
  return findings.length > 0 ? 1 : 0;
}

/** True when this module is the process entry point rather than an import. */
function isEntryPoint(): boolean {
  const entry = process.argv[1];
  return entry !== undefined && realpathSync(entry) === realpathSync(fileURLToPath(import.meta.url));
}

if (isEntryPoint()) {
  process.exitCode = main(process.argv.slice(2), process.cwd());
}
