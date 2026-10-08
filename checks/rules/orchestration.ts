import { ONENOTE_TOOL_PREFIX } from "../permissions.ts";
import type { Finding, Repo, Rule } from "../repo.ts";
import { SETTINGS } from "./templates.ts";

const RULE = "orchestration";

const GUIDE_FILE = "plugin/skills/lesson-conventions/orchestration.md";

const LESSON_FOLDER_FILE = "plugin/skills/lesson-conventions/lesson-folder.md";

/** Labels of the state model that `lesson-folder.md` must show, each at the start of a line of the `stunde.md` format. */
export const STATE_LINES = ["Prüfbericht:", "Rückmeldung:", "Alte Seite:", "Elternseite:", "Anhänge:"];

/** The checkpoint question the teacher answers after the planning loop, verbatim. */
export const CHECKPOINT_QUESTION = "Passt der Plan so? Antworte mit „weiter“, oder schreib, was geändert werden soll.";

/** The checkpoint question the teacher answers after the board loop, verbatim. */
export const BOARD_CHECKPOINT_QUESTION =
  "Passt das Tafelbild so? Antworte mit „weiter“, oder schreib, was geändert werden soll.";

/** The three options offered when a loop reaches its cap, in order. */
export const ESCALATION_LABELS = ["So übernehmen", "Ich gebe Hinweise", "Abbrechen"];

/**
 * The rows of the guide's model table: each choice of the `planning_model` and `board_model` settings
 * and the Agent tool's `model` parameter it becomes. `wie die Sitzung` passes none.
 */
export const MODEL_TABLE_ROWS = [
  "| `Opus` | `opus` |",
  "| `Sonnet` | `sonnet` |",
  "| `Haiku` | `haiku` |",
  "| `wie die Sitzung` | none",
];

/** The `subagent_type` values the orchestrator starts agents with. */
export const AGENT_TYPES = [
  "unterricht:lesson-planner",
  "unterricht:plan-reviewer",
  "unterricht:board-author",
  "unterricht:board-reviewer",
];

/** Verdict tokens, result-line tokens, and the `ping` fields the orchestrator reads. */
export const ORCHESTRATION_TOKENS = ["APPROVED", "REVISE", "DONE", "FAILED", "onenote_responsive", "config_error"];

/** The file name of the OneNote server, which Windows may block because it is unsigned. */
export const SERVER_EXE = "onenote-mcp.exe";

/** The German message for a OneNote server that did not start, written once, in the guide. */
export const SERVER_NOT_RUNNING_MESSAGE =
  "Die OneNote-Verbindung des Plugins läuft nicht. In Cowork gibt es sie nicht: Öffne deinen Arbeitsordner im Tab „Code“. " +
  "Bist du schon im Tab „Code“, starte die Claude-App neu. Wenn das nicht hilft, prüfe, ob Windows Defender oder SmartScreen die Datei " +
  SERVER_EXE +
  " blockiert.";

/** The German stop message for a `FAILED` result whose reason contains `bad_request`: a plugin bug for the maintainer. */
export const BAD_REQUEST_MESSAGE =
  "Ich habe angehalten, weil das Plugin einen Fehler gemeldet hat: <Grund>. Das ist ein Fehler im Plugin. " +
  "Bitte leite diese Meldung an die Person weiter, die das Plugin betreut. Die bisherigen Dateien bleiben im Ordner " +
  "<Name des Stundenordners>. Wenn der Fehler behoben ist, setze mit /unterricht:stunde-ueberarbeiten fort.";

/** The path through which the guide names the conventions skill, which defines the assignment shape and the conventions. */
export const CONVENTIONS_REFERENCE = "<plugin root>/skills/lesson-conventions/SKILL.md";

/** The start of the guide's sentence that lists every OneNote tool the main session calls. */
export const MAIN_SESSION_TOOLS_SENTENCE = "The OneNote tools of the main session are";

/** The path through which an entry point refers to the guide. */
const GUIDE_REFERENCE = "${CLAUDE_PLUGIN_ROOT}/skills/lesson-conventions/orchestration.md";

/** The entry points that follow `orchestration.md`. */
const ENTRY_POINT_FILES = ["plugin/skills/stunde-planen/SKILL.md", "plugin/skills/stunde-ueberarbeiten/SKILL.md"];

/** What each entry point that follows the guide must reference: the guide's path and the settings it passes on. */
export const ENTRY_POINT_REFERENCES = [
  GUIDE_REFERENCE,
  "the `plan_checkpoint` value",
  "the `board_checkpoint` value",
  "the `planning_model` value",
  "the `board_model` value",
];

/** The label of each `einstellungen.md` line, as the guide's Settings table names it in a code span. */
export const SETTING_LABELS = Object.keys(SETTINGS).map((label) => `\`${label}\``);

/** The setup entry point, which offers the allow rules. */
const SETUP_FILE = "plugin/skills/einrichten/SKILL.md";

/** The allow rules `einrichten` offers for `.claude/settings.json`, in order. */
export const SETTINGS_ALLOW_RULES = [
  "Edit(/Stunden/**)",
  "Read(~/.claude/plugins/**)",
  ...["ping", "get_notebooks", "list_pages", "get_page", "create_page", "replace_page"].map(
    (tool) => ONENOTE_TOOL_PREFIX + tool,
  ),
];

/**
 * Checks that `orchestration.md`, once it exists, states every constant the procedure relies on, and that
 * each existing entry point following it references the guide and the settings it needs, and that
 * `einrichten`, once it exists, offers every allow rule and references the guide, that no entry point repeats
 * the server-not-running message, and that `lesson-folder.md`, once it exists, shows the state lines. The guide's
 * main-session sentence must name every OneNote tool it or an entry point calls.
 */
export const orchestration: Rule = {
  name: RULE,
  run(repo: Repo): Finding[] {
    const files = repo.listFiles();
    const findings: Finding[] = [];
    if (files.includes(GUIDE_FILE)) {
      const guide = repo.readText(GUIDE_FILE);
      const entryPoints = ENTRY_POINT_FILES.filter((file) => files.includes(file)).map((file) => repo.readText(file));
      for (const message of [...guideProblems(guide), ...mainSessionToolProblems(guide, entryPoints)]) {
        findings.push({ file: GUIDE_FILE, rule: RULE, message });
      }
    }
    for (const file of ENTRY_POINT_FILES) {
      if (!files.includes(file)) continue;
      for (const message of entryPointProblems(repo.readText(file))) findings.push({ file, rule: RULE, message });
    }
    for (const file of [...ENTRY_POINT_FILES, SETUP_FILE]) {
      if (files.includes(file) && repo.readText(file).includes(SERVER_EXE)) {
        findings.push({ file, rule: RULE, message: `names "${SERVER_EXE}": refer to the server-not-running message of the guide instead` });
      }
    }
    if (files.includes(LESSON_FOLDER_FILE)) {
      for (const message of lessonFolderProblems(repo.readText(LESSON_FOLDER_FILE))) {
        findings.push({ file: LESSON_FOLDER_FILE, rule: RULE, message });
      }
    }
    if (files.includes(SETUP_FILE)) {
      for (const message of setupProblems(repo.readText(SETUP_FILE))) findings.push({ file: SETUP_FILE, rule: RULE, message });
    }
    return findings;
  },
};

/** Lists every state line missing from `lesson-folder.md`. */
function lessonFolderProblems(text: string): string[] {
  const lines = text.split(/\r?\n/);
  return STATE_LINES.filter((label) => !lines.some((line) => line.startsWith(label))).map(
    (label) => `state line "${label}" missing`,
  );
}

/** Lists every allow rule missing from `einrichten`, and a missing reference to the guide. */
function setupProblems(text: string): string[] {
  // Rules are matched as JSON strings, so `get_page` inside `"..._get_pages"` does not count.
  const problems = SETTINGS_ALLOW_RULES.filter((rule) => !text.includes(`"${rule}"`)).map(
    (rule) => `allow rule "${rule}" missing`,
  );
  if (!text.includes(GUIDE_REFERENCE)) problems.push(`reference "${GUIDE_REFERENCE}" missing`);
  return problems;
}

/** Lists every reference missing from an entry point that follows the guide. */
function entryPointProblems(text: string): string[] {
  return ENTRY_POINT_REFERENCES.filter((reference) => !text.includes(reference)).map(
    (reference) => `reference "${reference}" missing`,
  );
}

/**
 * Lists every OneNote tool, by full name, that the guide or an entry point names but the guide's main-session sentence
 * leaves out, or the missing sentence itself.
 */
function mainSessionToolProblems(guide: string, entryPoints: string[]): string[] {
  const sentence = guide.split(/\r?\n/).find((line) => line.includes(MAIN_SESSION_TOOLS_SENTENCE));
  if (sentence === undefined) return [`sentence "${MAIN_SESSION_TOOLS_SENTENCE} ..." missing`];
  const pattern = new RegExp(`${ONENOTE_TOOL_PREFIX}[a-z_]+`, "g");
  const called = new Set([guide, ...entryPoints].flatMap((text) => text.match(pattern) ?? []));
  // A tool counts as named only as a whole code span, so `get_page` inside `get_pages` does not count.
  return [...called]
    .filter((tool) => !sentence.includes(`\`${tool}\``))
    .sort()
    .map((tool) => `"${tool}" missing from the sentence "${MAIN_SESSION_TOOLS_SENTENCE} ..."`);
}

/** Lists every constant missing from the orchestration guide. */
function guideProblems(text: string): string[] {
  const problems: string[] = [];
  if (!text.includes(CHECKPOINT_QUESTION)) problems.push("checkpoint question missing or changed");
  if (!text.includes(BOARD_CHECKPOINT_QUESTION)) problems.push("board checkpoint question missing or changed");
  if (!text.includes(SERVER_NOT_RUNNING_MESSAGE)) problems.push("server-not-running message missing or changed");
  if (!text.includes(BAD_REQUEST_MESSAGE)) problems.push("bad_request message missing or changed");
  if (!text.includes(CONVENTIONS_REFERENCE)) problems.push(`reference "${CONVENTIONS_REFERENCE}" missing`);
  for (const row of MODEL_TABLE_ROWS) {
    if (!text.includes(row)) problems.push(`model table row "${row}" missing`);
  }
  for (const label of SETTING_LABELS) {
    if (!text.includes(label)) problems.push(`settings line ${label} missing`);
  }
  for (const label of ESCALATION_LABELS) {
    if (!text.includes(label)) problems.push(`escalation label "${label}" missing`);
  }
  for (const type of AGENT_TYPES) {
    if (!text.includes(type)) problems.push(`agent type "${type}" missing`);
  }
  for (const token of ORCHESTRATION_TOKENS) {
    if (!new RegExp(`\\b${token}\\b`).test(text)) problems.push(`token "${token}" missing`);
  }
  return problems;
}
