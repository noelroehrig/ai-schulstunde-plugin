import type { Finding, Repo, Rule } from "../repo.ts";

const RULE = "paths";

/** The vendored binary: absent during the build, and never read as text. */
const SERVER_EXE = "server/onenote-mcp.exe";

/** Files in which Claude Code substitutes `${...}`; a file read by path would show it raw. */
const SUBSTITUTED_FILE = /^plugin\/(\.mcp\.json|skills\/[^/]+\/SKILL\.md|agents\/[^/]+\.md)$/;

const PLUGIN_ROOT_REF = /\$\{CLAUDE_PLUGIN_ROOT\}\/([^\s"'`()<>[\]{},;]*)/g;

/** Sentence punctuation that may follow a reference in prose. */
const TRAILING_PUNCTUATION = /[.:!?]+$/;

const ABSOLUTE = /^([A-Za-z]:|\/)/;

/**
 * Checks paths in plugin files: JSON strings are relative with forward slashes,
 * `${CLAUDE_PLUGIN_ROOT}/...` references resolve, and `${` appears only where it is substituted.
 */
export const paths: Rule = {
  name: RULE,
  run(repo: Repo): Finding[] {
    const files = repo.listFiles();
    const findings: Finding[] = [];
    for (const file of files) {
      if (!file.startsWith("plugin/") || file === `plugin/${SERVER_EXE}`) continue;
      const text = repo.readText(file);
      const messages = [
        ...(file.endsWith(".json") ? jsonStringProblems(text) : []),
        ...referenceProblems(text, files),
        ...(SUBSTITUTED_FILE.test(file) ? [] : variableProblems(text)),
      ];
      for (const message of messages) findings.push({ file, rule: RULE, message });
    }
    return findings;
  },
};

/** Lists JSON string values with a backslash or an absolute path; none when the JSON does not parse. */
function jsonStringProblems(text: string): string[] {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return [];
  }
  const problems: string[] = [];
  for (const string of jsonStrings(value)) {
    if (string.includes("\\")) problems.push(`${JSON.stringify(string)} contains a backslash`);
    else if (ABSOLUTE.test(string)) problems.push(`${JSON.stringify(string)} is an absolute path`);
  }
  return problems;
}

/** Yields every string value (not key) in a parsed JSON value. */
function* jsonStrings(value: unknown): Generator<string> {
  if (typeof value === "string") yield value;
  else if (Array.isArray(value)) for (const item of value) yield* jsonStrings(item);
  else if (typeof value === "object" && value !== null) {
    for (const item of Object.values(value)) yield* jsonStrings(item);
  }
}

/** Lists `${CLAUDE_PLUGIN_ROOT}/<path>` references that point to nothing in `plugin/`. */
function referenceProblems(text: string, files: string[]): string[] {
  const problems: string[] = [];
  forEachLine(text, (line, number) => {
    for (const match of line.matchAll(PLUGIN_ROOT_REF)) {
      const path = match[1].replace(TRAILING_PUNCTUATION, "");
      if (path === SERVER_EXE || resolves(path, files)) continue;
      const kind = path.endsWith("/") || path === "" ? "directory" : "file";
      problems.push(`line ${number}: \${CLAUDE_PLUGIN_ROOT}/${path} names no existing ${kind}`);
    }
  });
  return problems;
}

/** True when `path` names a file in `plugin/`, or a non-empty directory when it ends in `/`. */
function resolves(path: string, files: string[]): boolean {
  const target = `plugin/${path}`;
  return path === "" || path.endsWith("/") ? files.some((file) => file.startsWith(target)) : files.includes(target);
}

/** Lists the lines with a `${`, which a file read by path would show unsubstituted. */
function variableProblems(text: string): string[] {
  const problems: string[] = [];
  forEachLine(text, (line, number) => {
    if (line.includes("${")) {
      problems.push(`line ${number}: \${ is substituted only in .mcp.json, SKILL.md, and agent files`);
    }
  });
  return problems;
}

/** Calls `visit` with each line and its 1-based number, for LF and CRLF text. */
function forEachLine(text: string, visit: (line: string, number: number) => void): void {
  text.split(/\r?\n/).forEach((line, index) => visit(line, index + 1));
}
