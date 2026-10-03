import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { AGENT_TOOLS, AGENTS, type AgentName } from "./permissions.ts";
import { LANGUAGE_SENTENCE, REVIEWER_SENTENCE } from "./rules/agents.ts";
import {
  ASSIGNMENT_KEYS,
  GLOSSARY_TERMS,
  PLAN_HEADINGS,
  REVIEW_HEADINGS,
  TOKENS,
  VERLAUFSPLAN_HEADER,
} from "./rules/conventions.ts";

/** Test fixtures: repository contents that satisfy the rules. Imported by tests only. */

export { LANGUAGE_SENTENCE, REVIEWER_SENTENCE };

/** An agent definition that satisfies the agents rule, with `fields` overriding frontmatter lines. */
export function agentFile(name: AgentName, fields: Record<string, string | undefined> = {}, body?: string): string {
  const defaults: Record<string, string> = {
    name,
    description: "Does one job.",
    tools: AGENT_TOOLS[name].join(", "),
    skills: "lesson-conventions",
    model: "inherit",
    omitClaudeMd: "true",
  };
  const reviewer = name === "plan-reviewer" || name === "board-reviewer";
  const text = body ?? `${LANGUAGE_SENTENCE}\n${reviewer ? REVIEWER_SENTENCE + "\n" : ""}`;
  return frontmatter({ ...defaults, ...fields }) + text;
}

/** A `SKILL.md` that satisfies the skills rule, with `fields` overriding frontmatter lines. */
export function skillFile(name: string, fields: Record<string, string | undefined> = {}): string {
  const defaults: Record<string, string> =
    name === "lesson-conventions"
      ? { name, description: "Shared conventions.", "user-invocable": "false" }
      : { name, description: "Startet etwas.", "disable-model-invocation": "true" };
  const body = name === "lesson-conventions" ? conventionsSkillBody() : "Instructions.\n";
  return frontmatter({ ...defaults, ...fields }) + body;
}

/** A conventions skill body holding every item the conventions rule requires. */
export function conventionsSkillBody(): string {
  return [
    "## Glossary",
    "| Begriff | Meaning |",
    "|---|---|",
    ...GLOSSARY_TERMS.map((term) => `| ${term} | Meaning. |`),
    "",
    ...ASSIGNMENT_KEYS.map((key) => `${key}: value`),
    "",
    ...PLAN_HEADINGS.flatMap((heading) =>
      heading === "## Verlaufsplan" ? [heading, VERLAUFSPLAN_HEADER] : [heading],
    ),
    ...REVIEW_HEADINGS,
    TOKENS.join(" "),
    "",
  ].join("\n");
}

/** Renders frontmatter lines, leaving out keys whose value is undefined. */
function frontmatter(fields: Record<string, string | undefined>): string {
  const lines = Object.entries(fields)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}: ${value}`);
  return `---\n${lines.join("\n")}\n---\n`;
}

/** A vendored server directory whose checksum matches the exe. */
export function serverFiles(exe = "fake exe"): Record<string, string> {
  const hash = createHash("sha256").update(exe).digest("hex");
  return {
    "plugin/server/onenote-mcp.exe": exe,
    "plugin/server/VERSION": "v1.0.1\n",
    "plugin/server/onenote-mcp.exe.sha256": `${hash}  onenote-mcp.exe\n`,
  };
}

/** Reads a file of this repository, for fixtures that reuse the real manifests. */
function repoFile(path: string): string {
  return readFileSync(fileURLToPath(new URL(`../${path}`, import.meta.url)), "utf8");
}

/** The repository's own manifests, so that fixtures satisfy the manifest rules. */
export function manifestFiles(): Record<string, string> {
  return Object.fromEntries(
    [".claude-plugin/marketplace.json", "plugin/.claude-plugin/plugin.json", "plugin/.mcp.json"].map(
      (path) => [path, repoFile(path)],
    ),
  );
}

/** A repository with every component of `SPEC.md` section 5.1 that passes every rule in release mode. */
export function completeRepoFiles(): Record<string, string> {
  const files: Record<string, string> = { ...manifestFiles(), ...serverFiles() };
  for (const agent of AGENTS) files[`plugin/agents/${agent}.md`] = agentFile(agent);
  for (const skill of ["einrichten", "stunde-planen", "stunde-ueberarbeiten", "lesson-conventions"]) {
    files[`plugin/skills/${skill}/SKILL.md`] = skillFile(skill);
  }
  for (const name of [
    "board.md",
    "lesson-folder.md",
    "orchestration.md",
    "examples/plan.md",
    "examples/NOTES.md",
  ]) {
    files[`plugin/skills/lesson-conventions/${name}`] = "Text.\n";
  }
  files["plugin/skills/lesson-conventions/examples/board.json"] = "{}";
  for (const name of ["CLAUDE.md", "schulkontext.md", "kriterien.md", "onenote.md"]) {
    files[`plugin/templates/${name}`] = "# [Titel]\n";
  }
  files["README.md"] = "# Anleitung\n";
  files["CHANGELOG.md"] = "# Änderungen\n";
  return files;
}
