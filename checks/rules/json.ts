import type { Finding, Repo, Rule } from "../repo.ts";

/** Reports every `.json` file that `JSON.parse` rejects. */
export const jsonValid: Rule = {
  name: "json-valid",
  run(repo: Repo): Finding[] {
    const findings: Finding[] = [];
    for (const file of repo.listFiles()) {
      if (!file.endsWith(".json")) continue;
      try {
        JSON.parse(repo.readText(file));
      } catch (error) {
        findings.push({ file, rule: "json-valid", message: (error as Error).message });
      }
    }
    return findings;
  },
};

/** A parsed JSON object. */
export type JsonObject = Record<string, unknown>;

/** True when `value` is a JSON object (not an array or null). */
export function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** True when `value` is a string with at least one non-whitespace character. */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

/**
 * Reads `file` as JSON for a rule that needs its content.
 * `missing` when the file does not exist; `undefined` value when it does not parse,
 * which json-valid already reports.
 */
export function readJson(repo: Repo, file: string): { missing: true } | { missing: false; value: unknown } {
  if (!repo.listFiles().includes(file)) return { missing: true };
  try {
    return { missing: false, value: JSON.parse(repo.readText(file)) };
  } catch {
    return { missing: false, value: undefined };
  }
}
