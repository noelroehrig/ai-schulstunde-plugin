import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { AGENT_TOOLS, AGENTS, type AgentName } from "./permissions.ts";
import { BOARD_GUIDE } from "./rules/agent-bodies.ts";
import { LANGUAGE_SENTENCE, REVIEWER_SENTENCE } from "./rules/agents.ts";
import { AGENT_TYPES, CHECKPOINT_QUESTION, ESCALATION_LABELS, ORCHESTRATION_TOKENS } from "./rules/orchestration.ts";
import { PRIVACY_SENTENCE } from "./rules/templates.ts";
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
  return frontmatter({ ...defaults, ...fields }) + (body ?? agentBody(name));
}

/** An agent body that satisfies the agents and agent-bodies rules. */
export function agentBody(name: AgentName): string {
  const reviewer = name === "plan-reviewer" || name === "board-reviewer";
  const board = name === "board-author" || name === "board-reviewer";
  return [
    LANGUAGE_SENTENCE,
    ...(reviewer ? [REVIEWER_SENTENCE] : []),
    "## Inputs",
    "## Steps",
    "1. Read `schulkontext.md`.",
    "2. Read `kriterien.md`.",
    ...(board ? [`3. Read \`${BOARD_GUIDE}\`.`] : []),
    "## Output",
    "## Stop",
    "## Result line",
    "`DONE <path>` or `FAILED <Grund>`.",
    "",
  ].join("\n");
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

/** An orchestration guide holding every constant the orchestration rule requires. */
export function orchestrationFile(): string {
  return [
    "# Orchestration",
    "",
    CHECKPOINT_QUESTION,
    ...ESCALATION_LABELS,
    ...AGENT_TYPES,
    ORCHESTRATION_TOKENS.join(" "),
    "",
  ].join("\n");
}

/** An example plan that satisfies the examples rule: every plan heading, durations adding up to 45. */
export function examplePlanFile(): string {
  return [
    "# Thema",
    "",
    "Klasse: 6a · Fach: Mathematik · Datum: offen · Stundenlänge: 45 Minuten",
    "",
    ...PLAN_HEADINGS.flatMap((heading) =>
      heading === "## Verlaufsplan"
        ? [
            heading,
            VERLAUFSPLAN_HEADER,
            "|---|---|---|---|---|",
            "| 7,5 | Einstieg | Frage | Plenum | Tafelbild |",
            "| 25 | Erarbeitung | Aufgaben | Partnerarbeit | Arbeitsblatt |",
            "| 12,5 | Sicherung | Vergleich | Plenum | Tafelbild |",
            "| **45** | | | | |",
            "",
          ]
        : [heading, "- keine", ""],
    ),
  ].join("\n");
}

/** An example board that satisfies the examples rule: inside 1024 pt, every font size at least 20. */
export function exampleBoardFile(): string {
  const text = (value: string, fields: Record<string, unknown> = {}) => ({ type: "paragraph", text: value, font_size: 20, ...fields });
  return JSON.stringify(
    {
      page_id: "beispiel",
      title: "Thema",
      outlines: [
        { position: { x: 48, y: 24 }, width: 928, items: [text("Thema", { style: "h1", font_size: 32, color: "#1F4E79" })] },
        {
          position: { x: 48, y: 90 },
          width: 928,
          items: [
            text("Block", { style: "h2", font_size: 24 }),
            { type: "paragraph", segments: [{ text: "wichtig", font_size: 20, color: "#C00000" }] },
            { type: "list", style: "bullet", items: [{ segments: [{ text: "Punkt", font_size: 20 }] }] },
          ],
        },
      ],
    },
    null,
    2,
  );
}

/** Templates that satisfy the templates rule: required headings, lines, and the privacy sentence. */
export function templateFiles(): Record<string, string> {
  const file = (lines: string[]) => [...lines, "", PRIVACY_SENTENCE, ""].join("\n");
  return {
    "plugin/templates/CLAUDE.md": file(["# Arbeitsordner"]),
    "plugin/templates/schulkontext.md": file([
      "# Schulkontext",
      "## Schule",
      "## Zeitraster",
      "Stundenlänge: [Minuten eintragen] Minuten",
      "## Phasenmodell",
      "## Fächer und Klassen",
      "## Ausstattung im Unterricht",
      "## Was jede Planung beachten soll",
    ]),
    "plugin/templates/kriterien.md": file([
      "# Meine Kriterien",
      "## Planung",
      "### Muss (sonst wird überarbeitet)",
      "- Die Phasen ergeben zusammen genau die Stundenlänge.",
      "### Soll",
      "## Tafelbild",
    ]),
    "plugin/templates/onenote.md": file([
      "# OneNote",
      "## Ablage",
      "Abschnitt: [Name]",
      "Seitentitel: [Schema]",
      "## Ansicht",
    ]),
  };
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
    "examples/NOTES.md",
  ]) {
    files[`plugin/skills/lesson-conventions/${name}`] = "Text.\n";
  }
  files["plugin/skills/lesson-conventions/orchestration.md"] = orchestrationFile();
  files["plugin/skills/lesson-conventions/examples/plan.md"] = examplePlanFile();
  files["plugin/skills/lesson-conventions/examples/board.json"] = exampleBoardFile();
  Object.assign(files, templateFiles());
  files["README.md"] = "# Anleitung\n";
  files["CHANGELOG.md"] = "# Änderungen\n";
  return files;
}
