import type { Finding, Repo, Rule } from "../repo.ts";
import { isNonEmptyString, isObject, readJson } from "./json.ts";

const FILE = ".claude-plugin/marketplace.json";
const RULE = "marketplace";

/** Checks the marketplace: its name, its owner, and its single `unterricht` entry. */
export const marketplace: Rule = {
  name: RULE,
  run(repo: Repo): Finding[] {
    const json = readJson(repo, FILE);
    if (json.missing) return [{ file: FILE, rule: RULE, message: "marketplace file is missing" }];
    if (json.value === undefined) return [];
    return marketplaceProblems(json.value).map((message) => ({ file: FILE, rule: RULE, message }));
  },
};

/** Lists what is wrong with the parsed marketplace. */
function marketplaceProblems(value: unknown): string[] {
  if (!isObject(value)) return ["must be a JSON object"];
  const problems: string[] = [];
  if (value.name !== "schulstunde") problems.push('name must be "schulstunde"');
  if (!isObject(value.owner) || !isNonEmptyString(value.owner.name)) {
    problems.push("owner.name must not be empty");
  }
  const plugins = value.plugins;
  if (!Array.isArray(plugins) || plugins.length !== 1) {
    problems.push("must list exactly one plugin");
    return problems;
  }
  const entry = plugins[0];
  if (!isObject(entry)) return [...problems, "plugin entry must be an object"];
  if (entry.name !== "unterricht") problems.push('plugin entry name must be "unterricht"');
  if (entry.source !== "./plugin") problems.push('plugin entry source must be "./plugin"');
  // The manifest's version wins; a second one in the entry makes validate warn.
  if ("version" in entry) problems.push("plugin entry must not set version, plugin.json does");
  return problems;
}
