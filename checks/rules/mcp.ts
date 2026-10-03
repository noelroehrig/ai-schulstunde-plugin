import type { Finding, Repo, Rule } from "../repo.ts";
import { isObject, readJson } from "./json.ts";

const FILE = "plugin/.mcp.json";
const RULE = "mcp";

const COMMAND = "${CLAUDE_PLUGIN_ROOT}/server/onenote-mcp.exe";

/** The exact environment the server gets (`SPEC.md` section 11.1). */
const ENV: Record<string, string> = {
  ONENOTE_ALLOWED_NOTEBOOKS: "${user_config.notebook}",
  ONENOTE_DISABLE_RAW_XML: "1",
};

/**
 * Checks `.mcp.json`: one `onenote` server with the vendored command and the exact env.
 * The repo checks this because older `claude plugin validate` versions skip MCP entries.
 */
export const mcp: Rule = {
  name: RULE,
  run(repo: Repo): Finding[] {
    const json = readJson(repo, FILE);
    if (json.missing) return [{ file: FILE, rule: RULE, message: ".mcp.json is missing" }];
    if (json.value === undefined) return [];
    return mcpProblems(json.value).map((message) => ({ file: FILE, rule: RULE, message }));
  },
};

/** Lists what is wrong with the parsed `.mcp.json`. */
function mcpProblems(value: unknown): string[] {
  if (!isObject(value) || !isObject(value.mcpServers)) return ["mcpServers must be an object"];
  const names = Object.keys(value.mcpServers);
  if (names.length !== 1 || names[0] !== "onenote") {
    return [`must define exactly one server, "onenote", found: ${names.join(", ") || "none"}`];
  }
  const server = value.mcpServers.onenote;
  if (!isObject(server)) return ["server onenote must be an object"];
  const problems: string[] = [];
  if (server.command !== COMMAND) problems.push(`command must be "${COMMAND}"`);
  if (!isObject(server.env)) return [...problems, "env must be an object"];
  for (const [key, expected] of Object.entries(ENV)) {
    if (server.env[key] !== expected) problems.push(`env ${key} must be "${expected}"`);
  }
  for (const key of Object.keys(server.env)) {
    if (!(key in ENV)) problems.push(`env must not set ${key}`);
  }
  return problems;
}
