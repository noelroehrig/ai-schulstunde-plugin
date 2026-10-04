import type { Finding, Repo, Rule } from "../repo.ts";

const RULE = "templates";

const TEMPLATE_DIR = "plugin/templates/";

/** The privacy sentence every template carries. */
export const PRIVACY_SENTENCE = "Hier stehen keine Namen oder anderen persönlichen Daten von Schülerinnen und Schülern.";

/** What each template must contain besides the privacy sentence. */
interface TemplateSpec {
  /** Heading lines; a heading may continue with an explanation, as in `### Muss (sonst wird überarbeitet)`. */
  headings: string[];
  /** Lines that must appear verbatim. */
  lines: string[];
  /** Line beginnings that must appear, so that the value stays a placeholder. */
  linePrefixes: string[];
  /** Text that must appear verbatim anywhere. */
  phrases: string[];
}

/** The templates `einrichten` copies into a working folder, with their required content. */
export const TEMPLATES: Record<string, TemplateSpec> = {
  "CLAUDE.md": { headings: [], lines: [], linePrefixes: [], phrases: [] },
  "schulkontext.md": {
    headings: [
      "## Schule",
      "## Zeitraster",
      "## Phasenmodell",
      "## Fächer und Klassen",
      "## Ausstattung im Unterricht",
      "## Was jede Planung beachten soll",
    ],
    lines: ["Stundenlänge: [Minuten eintragen] Minuten"],
    linePrefixes: [],
    phrases: [],
  },
  "kriterien.md": {
    headings: ["## Planung", "## Tafelbild", "### Muss", "### Soll"],
    lines: [],
    linePrefixes: [],
    phrases: ["Die Phasen ergeben zusammen genau die Stundenlänge."],
  },
  "onenote.md": {
    headings: ["## Ablage", "## Ansicht"],
    lines: [],
    linePrefixes: ["Abschnitt: [", "Seitentitel: ["],
    phrases: [],
  },
};

/**
 * Checks the working-folder templates: once any template exists, every one must exist and hold
 * its headings, its placeholder lines, and the privacy sentence. Absence of all of them is left
 * to the completeness rule.
 */
export const templates: Rule = {
  name: RULE,
  run(repo: Repo): Finding[] {
    const files = repo.listFiles();
    if (!files.some((file) => file.startsWith(TEMPLATE_DIR))) return [];
    const findings: Finding[] = [];
    for (const [name, spec] of Object.entries(TEMPLATES)) {
      const file = TEMPLATE_DIR + name;
      const messages = files.includes(file) ? templateProblems(repo.readText(file), spec) : ["template missing"];
      for (const message of messages) findings.push({ file, rule: RULE, message });
    }
    return findings;
  },
};

/** Lists every required item missing from a template. */
function templateProblems(text: string, spec: TemplateSpec): string[] {
  const lines = text.split(/\r?\n/).map((line) => line.trimEnd());
  const problems: string[] = [];
  for (const heading of spec.headings) {
    if (!lines.some((line) => line === heading || line.startsWith(`${heading} `))) {
      problems.push(`heading "${heading}" missing`);
    }
  }
  for (const required of spec.lines) {
    if (!lines.includes(required)) problems.push(`line "${required}" missing`);
  }
  for (const prefix of spec.linePrefixes) {
    if (!lines.some((line) => line.startsWith(prefix))) problems.push(`line starting with "${prefix}" missing`);
  }
  for (const phrase of spec.phrases) {
    if (!text.includes(phrase)) problems.push(`"${phrase}" missing`);
  }
  if (!text.includes(PRIVACY_SENTENCE)) problems.push("privacy sentence missing");
  return problems;
}
