import type { Finding, Repo, Rule } from "../repo.ts";
import { isObject, readJson } from "./json.ts";
import { SERVER_EXE } from "./orchestration.ts";

const RULE = "docs";

const README = "README.md";
const CHANGELOG = "CHANGELOG.md";
const MANIFEST = "plugin/.claude-plugin/plugin.json";

/** The three entry points as the teacher types them. */
export const COMMANDS = ["/unterricht:einrichten", "/unterricht:stunde-planen", "/unterricht:stunde-ueberarbeiten"];

/** The repository the teacher adds as a marketplace in claude.ai. */
export const MARKETPLACE_REPO = "noelroehrig/ai-schulstunde-plugin";

/**
 * Checks that `README.md`, once it exists, names the three commands, the marketplace repository, and the server exe,
 * and that `CHANGELOG.md`, once it exists, has a heading for the `version` in `plugin.json`.
 */
export const docs: Rule = {
  name: RULE,
  run(repo: Repo): Finding[] {
    const files = repo.listFiles();
    const findings: Finding[] = [];
    if (files.includes(README)) {
      for (const message of readmeProblems(repo.readText(README))) findings.push({ file: README, rule: RULE, message });
    }
    const version = manifestVersion(repo);
    if (files.includes(CHANGELOG) && version !== undefined && !hasEntry(repo.readText(CHANGELOG), version)) {
      findings.push({ file: CHANGELOG, rule: RULE, message: `no entry "## ${version}" for the version in plugin.json` });
    }
    return findings;
  },
};

/** Lists every command, the marketplace repository, and the troubleshooting entry for the server when missing from the README. */
function readmeProblems(text: string): string[] {
  const problems = COMMANDS.filter((command) => !text.includes(command)).map((command) => `command "${command}" missing`);
  if (!text.includes(MARKETPLACE_REPO)) problems.push(`marketplace repository "${MARKETPLACE_REPO}" missing`);
  if (!text.includes(SERVER_EXE)) problems.push(`troubleshooting entry naming "${SERVER_EXE}" missing`);
  return problems;
}

/** The `version` of `plugin.json`; undefined when it is missing or malformed, which the manifest rule reports. */
function manifestVersion(repo: Repo): string | undefined {
  const json = readJson(repo, MANIFEST);
  if (json.missing || !isObject(json.value) || typeof json.value.version !== "string") return undefined;
  return json.value.version;
}

/** True when a level-2 heading starts with exactly `version`, followed by a space or the line end. */
function hasEntry(text: string, version: string): boolean {
  const escaped = version.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^## ${escaped}( |\\r?$)`, "m").test(text);
}
