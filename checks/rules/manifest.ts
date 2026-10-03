import type { Finding, Repo, Rule } from "../repo.ts";
import { isNonEmptyString, isObject, readJson, type JsonObject } from "./json.ts";

const FILE = "plugin/.claude-plugin/plugin.json";
const RULE = "manifest";

/** Keys a `userConfig` option may use (`SPEC.md` Appendix A, F8). */
const OPTION_KEYS = new Set([
  "type",
  "title",
  "description",
  "default",
  "required",
  "options",
  "multiple",
  "sensitive",
  "min",
  "max",
]);

/** Keys every option needs; `default` is the Cowork rule. */
const REQUIRED_OPTION_KEYS = ["type", "title", "description", "default"];

/** The JSON type of `default` for each option `type`. */
const DEFAULT_TYPES: Record<string, string> = {
  string: "string",
  number: "number",
  boolean: "boolean",
  directory: "string",
  file: "string",
};

const OPTION_NAME = /^[A-Za-z0-9_]+$/;

const SEMVER = /^\d+\.\d+\.\d+$/;

/** Checks `plugin.json`: name, version, description, author, and every `userConfig` option. */
export const manifest: Rule = {
  name: RULE,
  run(repo: Repo): Finding[] {
    const json = readJson(repo, FILE);
    if (json.missing) return [{ file: FILE, rule: RULE, message: "plugin.json is missing" }];
    if (json.value === undefined) return [];
    return manifestProblems(json.value).map((message) => ({ file: FILE, rule: RULE, message }));
  },
};

/** Lists what is wrong with the parsed manifest. */
function manifestProblems(value: unknown): string[] {
  if (!isObject(value)) return ["must be a JSON object"];
  const problems: string[] = [];
  if (value.name !== "unterricht") problems.push('name must be "unterricht"');
  if (typeof value.version !== "string" || !SEMVER.test(value.version)) {
    problems.push("version must match x.y.z");
  }
  if (!isNonEmptyString(value.description)) problems.push("description must not be empty");
  if (!isObject(value.author) || !isNonEmptyString(value.author.name)) {
    problems.push("author.name must not be empty");
  }
  if (value.userConfig === undefined) return problems;
  if (!isObject(value.userConfig)) return [...problems, "userConfig must be an object"];
  for (const [name, option] of Object.entries(value.userConfig)) {
    problems.push(...optionProblems(name, option).map((problem) => `userConfig ${name}: ${problem}`));
  }
  return problems;
}

/** Lists what is wrong with one `userConfig` option. */
function optionProblems(name: string, option: unknown): string[] {
  const problems: string[] = [];
  if (!OPTION_NAME.test(name)) problems.push("key may use only letters, digits, and underscores");
  if (!isObject(option)) return [...problems, "must be an object"];
  for (const key of REQUIRED_OPTION_KEYS) {
    if (!(key in option)) problems.push(`${key} is missing`);
  }
  for (const key of Object.keys(option)) {
    if (!OPTION_KEYS.has(key)) problems.push(`${key} is not an allowed key`);
  }
  if ("type" in option) problems.push(...defaultProblems(option));
  return problems;
}

/** Checks that the option's `type` is known and its `default` has the matching JSON type. */
function defaultProblems(option: JsonObject): string[] {
  const expected = typeof option.type === "string" ? DEFAULT_TYPES[option.type] : undefined;
  if (expected === undefined) return [`type ${JSON.stringify(option.type)} is not a known type`];
  if ("default" in option && typeof option.default !== expected) {
    return [`default must be a ${expected} for type ${option.type}`];
  }
  return [];
}

/** Reads the option keys `plugin.json` declares; empty when it is missing or malformed. */
function declaredOptions(repo: Repo): Set<string> {
  const json = readJson(repo, FILE);
  if (json.missing || !isObject(json.value) || !isObject(json.value.userConfig)) return new Set();
  return new Set(Object.keys(json.value.userConfig));
}

const USER_CONFIG_REF = /\$\{user_config\.([^}]*)\}/g;

/** Reports every `${user_config.KEY}` under `plugin/` whose key `plugin.json` does not declare. */
export const userConfigRefs: Rule = {
  name: "user-config-refs",
  run(repo: Repo): Finding[] {
    const declared = declaredOptions(repo);
    const findings: Finding[] = [];
    for (const file of repo.listFiles()) {
      if (!file.startsWith("plugin/")) continue;
      for (const match of repo.readText(file).matchAll(USER_CONFIG_REF)) {
        const key = match[1];
        if (!declared.has(key)) {
          findings.push({
            file,
            rule: "user-config-refs",
            message: `\${user_config.${key}} names an option plugin.json does not declare`,
          });
        }
      }
    }
    return findings;
  },
};
