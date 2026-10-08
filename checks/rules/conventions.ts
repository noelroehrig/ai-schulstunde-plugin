import type { Finding, Repo, Rule } from "../repo.ts";

const RULE = "conventions";

const SKILL_FILE = "plugin/skills/lesson-conventions/SKILL.md";

/** The German glossary terms that are never translated, in order. */
export const GLOSSARY_TERMS = [
  "Tafelbild",
  "Einstieg",
  "Erarbeitung",
  "Sicherung",
  "Lernziel",
  "Differenzierung",
  "Stundenthema",
  "Verlaufsplan",
  "Sozialform",
  "Einzelarbeit",
  "Partnerarbeit",
  "Gruppenarbeit",
  "Plenum",
  "Hausaufgabe",
  "Material",
];

/** The headings of a lesson plan, in order. */
export const PLAN_HEADINGS = [
  "## Einordnung",
  "## Lernziele",
  "## Verlaufsplan",
  "## Differenzierung",
  "## Material",
  "## Hausaufgabe",
  "## Tafelbild (Inhalt)",
  "## Besondere Regeln",
];

export const VERLAUFSPLAN_HEADER = "| Zeit (Min.) | Phase | Unterrichtsgeschehen | Sozialform | Material/Medien |";

/** The headings of a review, below the verdict line, in order. */
export const REVIEW_HEADINGS = [
  "## Muss-Mängel",
  "## Soll-Hinweise",
  "## Nachrechnung",
  "## Frühere Muss-Mängel",
];

/** The keys of an assignment from the orchestrator to an agent. */
export const ASSIGNMENT_KEYS = [
  "working_folder",
  "lesson_folder",
  "round",
  "inputs",
  "output",
  "section_id",
  "page_title",
  "page_id",
  "parent_page_id",
  "banner_page_id",
  "symbol_page_id",
  "model_page_id",
];

/** Verdict tokens and result-line tokens. */
export const TOKENS = ["APPROVED", "REVISE", "DONE", "FAILED"];

/** Checks that the conventions `SKILL.md`, once it exists, states every shared contract item. */
export const conventions: Rule = {
  name: RULE,
  run(repo: Repo): Finding[] {
    if (!repo.listFiles().includes(SKILL_FILE)) return [];
    return conventionsProblems(repo.readText(SKILL_FILE)).map((message) => ({
      file: SKILL_FILE,
      rule: RULE,
      message,
    }));
  },
};

/** Lists every contract item missing from the skill text. */
function conventionsProblems(text: string): string[] {
  const lines = text.split(/\r?\n/).map((line) => line.trimEnd());
  const problems: string[] = [];
  const tableTerms = glossaryTableTerms(lines);
  for (const term of GLOSSARY_TERMS) {
    if (!tableTerms.has(term)) problems.push(`glossary term "${term}" missing from the glossary table`);
  }
  for (const heading of PLAN_HEADINGS) {
    if (!lines.includes(heading)) problems.push(`plan heading "${heading}" missing`);
  }
  if (!lines.includes(VERLAUFSPLAN_HEADER)) problems.push("Verlaufsplan table header missing");
  for (const heading of REVIEW_HEADINGS) {
    if (!lines.includes(heading)) problems.push(`review heading "${heading}" missing`);
  }
  for (const key of ASSIGNMENT_KEYS) {
    if (!new RegExp(`\\b${key}:`).test(text)) problems.push(`assignment key "${key}" missing`);
  }
  for (const token of TOKENS) {
    if (!new RegExp(`\\b${token}\\b`).test(text)) problems.push(`token "${token}" missing`);
  }
  return problems;
}

/** Returns the first-column cells of the table rows in the `## Glossary` section. */
function glossaryTableTerms(lines: string[]): Set<string> {
  const start = lines.indexOf("## Glossary");
  const terms = new Set<string>();
  if (start === -1) return terms;
  for (const line of lines.slice(start + 1)) {
    if (line.startsWith("## ")) break;
    if (!line.startsWith("|")) continue;
    terms.add(line.split("|")[1].trim());
  }
  return terms;
}
