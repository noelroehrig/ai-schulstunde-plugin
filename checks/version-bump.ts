import type { Finding } from "./repo.ts";

const RULE = "version-bump";

const MANIFEST = "plugin/.claude-plugin/plugin.json";
const CHANGELOG = "CHANGELOG.md";
const PLUGIN_DIR = "plugin/";

const VERSION = /^(\d+)\.(\d+)\.(\d+)$/;

/** Characters allowed in a ref from outside; `..` and a leading `-` are refused separately. */
const REF = /^[A-Za-z0-9._/-]+$/;

/** A parsed `X.Y.Z` version. */
export type Version = [number, number, number];

/** What the version-bump check needs to know about a pull request. */
export interface VersionBumpInput {
  /** Repo-relative paths with forward slashes, as `git diff --name-only` prints them. */
  changedFiles: string[];
  baseVersion: string;
  headVersion: string;
  changelogChanged: boolean;
}

/** Parses `X.Y.Z`; undefined for anything else, including pre-release suffixes. */
export function parseVersion(text: string): Version | undefined {
  const match = VERSION.exec(text);
  if (!match) return undefined;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

/** Compares two versions numerically: negative, zero, or positive like a sort comparator. */
export function compareVersions(a: Version, b: Version): number {
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i]! - b[i]!;
  }
  return 0;
}

/** True when `ref` is safe to pass to git as a revision (no option, no range). */
export function isValidRef(ref: string): boolean {
  return REF.test(ref) && !ref.includes("..") && !ref.startsWith("-");
}

/**
 * Checks that a change under `plugin/` raises the plugin version and changes the changelog
 * for teachers. Changes outside `plugin/` need neither.
 */
export function checkVersionBump(input: VersionBumpInput): Finding[] {
  if (!input.changedFiles.some((file) => file.startsWith(PLUGIN_DIR))) return [];
  const findings: Finding[] = [];
  const versionProblem = versionBumpProblem(input.baseVersion, input.headVersion);
  if (versionProblem) findings.push({ file: MANIFEST, rule: RULE, message: versionProblem });
  if (!input.changelogChanged) {
    findings.push({ file: CHANGELOG, rule: RULE, message: "plugin/ changed but CHANGELOG.md did not" });
  }
  return findings;
}

/** Describes why `head` is not a valid bump over `base`; undefined when it is. */
function versionBumpProblem(base: string, head: string): string | undefined {
  const baseVersion = parseVersion(base);
  if (!baseVersion) return `base version "${base}" is not X.Y.Z`;
  const headVersion = parseVersion(head);
  if (!headVersion) return `version "${head}" is not X.Y.Z`;
  if (compareVersions(headVersion, baseVersion) <= 0) {
    return `plugin/ changed but version ${head} is not greater than ${base}`;
  }
  return undefined;
}
