import type { Finding, Repo, Rule } from "../repo.ts";

const RULE = "workflows";

const DIR = ".github/workflows/";

/** A `uses:` key, as a step key, a list item, or a job key; group 2 is the rest of the line. */
const USES = /^\s*(-\s+)?uses:(.*)$/;

/** An action pinned to a full lowercase commit SHA, followed by its version as a comment. */
const PINNED = /^\s*[^\s@"'#]+@[0-9a-f]{40}\s+#\s*v\S*/;

/** A `run:` key; group 1 is its column, group 2 the value after the colon. */
const RUN = /^(\s*(?:-\s+)?)run:(.*)$/;

/** A block scalar indicator such as `|`, `>-`, or `|2`, optionally followed by a comment. */
const BLOCK_SCALAR = /^\s*[|>][-+0-9]*\s*(#.*)?$/;

const EXPRESSION = "${{";

/** Counts the leading spaces of `line`. */
function indent(line: string): number {
  return line.length - line.trimStart().length;
}

/** True for a line that holds no YAML content: blank or only a comment. */
function isEmpty(line: string): boolean {
  const trimmed = line.trim();
  return trimmed === "" || trimmed.startsWith("#");
}

/** Reports `uses:` values that are not pinned to a commit SHA with a version comment. */
function unpinnedUses(lines: string[]): string[] {
  const messages: string[] = [];
  lines.forEach((line, index) => {
    const match = USES.exec(line);
    if (match !== null && !PINNED.test(match[2])) {
      messages.push(`line ${index + 1}: uses must pin a 40-character lowercase commit SHA followed by "# v<version>"`);
    }
  });
  return messages;
}

/**
 * Reports `${{` inside `run:` values, single-line or block scalars. A block runs until the
 * first non-blank line indented no deeper than the `run` key.
 */
function expressionsInRun(lines: string[]): string[] {
  const messages: string[] = [];
  const report = (index: number): void => {
    messages.push(`line ${index + 1}: no \${{ inside run, pass the value through env`);
  };
  for (let index = 0; index < lines.length; index++) {
    const match = RUN.exec(lines[index]);
    if (match === null) continue;
    if (match[2].includes(EXPRESSION)) report(index);
    if (!BLOCK_SCALAR.test(match[2])) continue;
    const keyColumn = match[1].length;
    while (index + 1 < lines.length) {
      const next = lines[index + 1];
      if (next.trim() !== "" && indent(next) <= keyColumn) break;
      index++;
      if (next.includes(EXPRESSION)) report(index);
    }
  }
  return messages;
}

/** Finds the line index of the top-level key `key`, or -1. */
function topLevelKey(lines: string[], key: string): number {
  return lines.findIndex((line) => line.startsWith(`${key}:`));
}

/** Reports a missing `jobs:` or each job without `permissions` when the workflow sets none. */
function missingPermissions(lines: string[]): string[] {
  if (topLevelKey(lines, "permissions") !== -1) return [];
  const jobsIndex = topLevelKey(lines, "jobs");
  if (jobsIndex === -1) return ["no jobs found"];
  const messages: string[] = [];
  let jobIndent = -1;
  let job: { name: string; childIndent: number; permissions: boolean } | undefined;
  const finish = (): void => {
    if (job !== undefined && !job.permissions) {
      messages.push(`job "${job.name}" sets no permissions and the workflow sets none`);
    }
  };
  for (const line of lines.slice(jobsIndex + 1)) {
    if (isEmpty(line)) continue;
    const column = indent(line);
    if (column === 0) break;
    if (jobIndent === -1) jobIndent = column;
    if (column === jobIndent) {
      finish();
      job = { name: line.trim().replace(/:.*$/, ""), childIndent: -1, permissions: false };
    } else if (job !== undefined) {
      if (job.childIndent === -1) job.childIndent = column;
      if (column === job.childIndent && line.trimStart().startsWith("permissions:")) job.permissions = true;
    }
  }
  finish();
  return messages;
}

/**
 * Checks every workflow in `.github/workflows/` line by line (no YAML parser): actions pinned
 * to commit SHAs, no expressions inside `run`, and `permissions` on the workflow or every job.
 */
export const workflows: Rule = {
  name: RULE,
  run(repo: Repo): Finding[] {
    const findings: Finding[] = [];
    for (const file of repo.listFiles()) {
      if (!file.startsWith(DIR) || !/\.ya?ml$/.test(file)) continue;
      const lines = repo.readText(file).split(/\r?\n/);
      const messages = [...unpinnedUses(lines), ...expressionsInRun(lines), ...missingPermissions(lines)];
      for (const message of messages) findings.push({ file, rule: RULE, message });
    }
    return findings;
  },
};
