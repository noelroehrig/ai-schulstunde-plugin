import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createFsRepo, type Finding, type Mode, type Repo, type Rule } from "./repo.ts";
import { noDashes } from "./rules/dashes.ts";
import { agentBodies } from "./rules/agent-bodies.ts";
import { agents } from "./rules/agents.ts";
import { completeness } from "./rules/completeness.ts";
import { conventions } from "./rules/conventions.ts";
import { examples } from "./rules/examples.ts";
import { jsonValid } from "./rules/json.ts";
import { manifest, userConfigRefs } from "./rules/manifest.ts";
import { marketplace } from "./rules/marketplace.ts";
import { mcp } from "./rules/mcp.ts";
import { paths } from "./rules/paths.ts";
import { pluginDir } from "./rules/plugin-dir.ts";
import { server } from "./rules/server.ts";
import { skills } from "./rules/skills.ts";
import { templates } from "./rules/templates.ts";

/** Every rule the CLI runs, in output order. */
export const RULES: Rule[] = [
  noDashes,
  jsonValid,
  marketplace,
  manifest,
  mcp,
  userConfigRefs,
  pluginDir,
  paths,
  agents,
  agentBodies,
  skills,
  conventions,
  examples,
  templates,
  server,
  completeness,
];

const USAGE = "usage: run.ts --mode build|release";

/** Reads the value of `--mode` from the arguments; undefined when missing or unknown. */
export function parseMode(args: string[]): Mode | undefined {
  const index = args.indexOf("--mode");
  const value = index === -1 ? undefined : args[index + 1];
  return value === "build" || value === "release" ? value : undefined;
}

/** Runs each rule against the repository and concatenates their findings. */
export function runRules(repo: Repo, mode: Mode, rules: Rule[]): Finding[] {
  return rules.flatMap((rule) => rule.run(repo, mode));
}

/** Formats a finding as `<file>: <rule>: <message>`. */
export function formatFinding(finding: Finding): string {
  return `${finding.file}: ${finding.rule}: ${finding.message}`;
}

/**
 * Checks the repository at `root` and writes the report through `out`.
 * Returns the exit code: 0 clean, 1 findings, 2 usage error.
 */
export function main(
  args: string[],
  root: string,
  out: (line: string) => void = console.log,
  err: (line: string) => void = console.error,
): number {
  const mode = parseMode(args);
  if (mode === undefined) {
    err(USAGE);
    return 2;
  }
  const repo = createFsRepo(root);
  for (const rule of RULES) {
    for (const notice of rule.notices?.(repo, mode) ?? []) out(`notice: ${notice}`);
  }
  const findings = runRules(repo, mode, RULES);
  for (const finding of findings) out(formatFinding(finding));
  out(`${findings.length} findings (${mode} mode)`);
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
