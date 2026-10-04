import { test } from "node:test";
import assert from "node:assert/strict";
import { lessonFolderFile, orchestrationFile, skillFile } from "../fixtures.ts";
import { createMemoryRepo } from "../repo.ts";
import {
  AGENT_TYPES,
  BAD_REQUEST_MESSAGE,
  CHECKPOINT_QUESTION,
  CONVENTIONS_REFERENCE,
  ENTRY_POINT_REFERENCES,
  ESCALATION_LABELS,
  MAIN_SESSION_TOOLS_SENTENCE,
  MODEL_TABLE_ROWS,
  SERVER_EXE,
  SERVER_NOT_RUNNING_MESSAGE,
  SETTINGS_ALLOW_RULES,
  STATE_LINES,
  orchestration,
} from "./orchestration.ts";

const GUIDE = "plugin/skills/lesson-conventions/orchestration.md";

/** Runs the rule on a repository holding only the given files. */
function check(files: Record<string, string>) {
  return orchestration.run(createMemoryRepo(files), "build");
}

/** Asserts exactly one orchestration finding on the guide whose message matches `pattern`. */
function assertOneFinding(content: string, pattern: RegExp): void {
  const findings = check({ [GUIDE]: content });
  assert.equal(findings.length, 1, JSON.stringify(findings));
  assert.equal(findings[0].rule, "orchestration");
  assert.equal(findings[0].file, GUIDE);
  assert.match(findings[0].message, pattern);
}

test("orchestration passes on a complete orchestration.md", () => {
  assert.deepEqual(check({ [GUIDE]: orchestrationFile() }), []);
});

test("orchestration accepts CRLF line endings", () => {
  assert.deepEqual(check({ [GUIDE]: orchestrationFile().replace(/\n/g, "\r\n") }), []);
});

test("orchestration passes when orchestration.md does not exist yet", () => {
  assert.deepEqual(check({ "plugin/skills/lesson-conventions/board.md": "# Board\n" }), []);
});

test("orchestration reports a changed checkpoint question", () => {
  const text = orchestrationFile().replace(CHECKPOINT_QUESTION, CHECKPOINT_QUESTION.replace("„weiter“", "\"weiter\""));
  assertOneFinding(text, /checkpoint question/);
});

test("orchestration reports each missing escalation label", () => {
  for (const label of ESCALATION_LABELS) {
    assertOneFinding(orchestrationFile().split(label).join("Etwas"), new RegExp(`escalation label "${label}"`));
  }
});

test("orchestration reports each missing agent type", () => {
  for (const type of AGENT_TYPES) {
    assertOneFinding(orchestrationFile().split(type).join("ein Agent"), new RegExp(`agent type "${type}"`));
  }
});

test("orchestration reports a token that appears only inside a longer word", () => {
  assertOneFinding(orchestrationFile().replace(/\bREVISE\b/g, "REVISED"), /token "REVISE"/);
});

test("orchestration reports each missing token", () => {
  for (const token of ["APPROVED", "REVISE", "DONE", "FAILED", "onenote_responsive"]) {
    const text = orchestrationFile().replace(new RegExp(`\\b${token}\\b`, "g"), "x");
    assertOneFinding(text, new RegExp(`token "${token}"`));
  }
});

test("orchestration reports a missing or changed server-not-running message", () => {
  assertOneFinding(orchestrationFile().split(SERVER_NOT_RUNNING_MESSAGE).join("x"), /server-not-running message/);
  const changed = SERVER_NOT_RUNNING_MESSAGE.replace("SmartScreen", "Smartscreen");
  assertOneFinding(orchestrationFile().split(SERVER_NOT_RUNNING_MESSAGE).join(changed), /server-not-running message/);
});

test("SERVER_NOT_RUNNING_MESSAGE names the exe and the advice to restart and to check Windows", () => {
  assert.equal(
    SERVER_NOT_RUNNING_MESSAGE,
    "Die OneNote-Verbindung des Plugins läuft nicht. Starte die Claude-App neu. Wenn das nicht hilft, prüfe, ob Windows Defender oder SmartScreen die Datei onenote-mcp.exe blockiert.",
  );
  assert.ok(SERVER_NOT_RUNNING_MESSAGE.includes(SERVER_EXE));
});

test("orchestration reports each missing item separately", () => {
  const findings = check({ [GUIDE]: "# Orchestration\n" });
  assert.equal(findings.length, 1 + 3 + 4 + 5 + 4 + 1 + 1 + 1 + 1);
  assert.ok(findings.every((finding) => finding.rule === "orchestration" && finding.file === GUIDE));
});

const ENTRY_POINTS = ["stunde-planen", "stunde-ueberarbeiten"];

/** The path of the `SKILL.md` of the entry point `name`. */
function entryFile(name: string): string {
  return `plugin/skills/${name}/SKILL.md`;
}

test("orchestration passes on entry points that reference the guide and every setting they pass on", () => {
  const files = Object.fromEntries(ENTRY_POINTS.map((name) => [entryFile(name), skillFile(name)]));
  assert.deepEqual(check(files), []);
});

test("orchestration passes when the entry points do not exist yet", () => {
  assert.deepEqual(check({ "plugin/skills/lesson-conventions/SKILL.md": "Instructions.\n" }), []);
});

test("orchestration reports each missing entry-point reference", () => {
  for (const name of ENTRY_POINTS) {
    for (const reference of ENTRY_POINT_REFERENCES) {
      const findings = check({ [entryFile(name)]: skillFile(name).split(reference).join("x") });
      assert.equal(findings.length, 1, JSON.stringify(findings));
      assert.equal(findings[0].rule, "orchestration");
      assert.equal(findings[0].file, entryFile(name));
      assert.ok(findings[0].message.includes(reference), findings[0].message);
    }
  }
});

test("orchestration reports an entry point that repeats the server-not-running message instead of referring to it", () => {
  for (const name of [...ENTRY_POINTS, "einrichten"]) {
    const findings = check({ [entryFile(name)]: skillFile(name) + `Say \`${SERVER_NOT_RUNNING_MESSAGE}\`\n` });
    assert.equal(findings.length, 1, JSON.stringify(findings));
    assert.equal(findings[0].rule, "orchestration");
    assert.equal(findings[0].file, entryFile(name));
    assert.ok(findings[0].message.includes(SERVER_EXE), findings[0].message);
  }
});

test("SETTINGS_ALLOW_RULES are the lesson-folder edit, the plugin read, and the six OneNote tools", () => {
  assert.deepEqual(SETTINGS_ALLOW_RULES, [
    "Edit(/Stunden/**)",
    "Read(~/.claude/plugins/**)",
    "mcp__plugin_unterricht_onenote__ping",
    "mcp__plugin_unterricht_onenote__get_notebooks",
    "mcp__plugin_unterricht_onenote__list_pages",
    "mcp__plugin_unterricht_onenote__get_page",
    "mcp__plugin_unterricht_onenote__create_page",
    "mcp__plugin_unterricht_onenote__replace_page",
  ]);
});

test("orchestration passes on an einrichten that holds every allow rule", () => {
  assert.deepEqual(check({ [entryFile("einrichten")]: skillFile("einrichten") }), []);
});

test("orchestration reports each allow rule missing from einrichten", () => {
  for (const rule of SETTINGS_ALLOW_RULES) {
    // Replace whole quoted entries so that removing `ping` does not also hit a longer rule.
    const text = skillFile("einrichten").split(`"${rule}"`).join('"x"');
    const findings = check({ [entryFile("einrichten")]: text });
    assert.equal(findings.length, 1, JSON.stringify(findings));
    assert.equal(findings[0].rule, "orchestration");
    assert.equal(findings[0].file, entryFile("einrichten"));
    assert.ok(findings[0].message.includes(rule), findings[0].message);
  }
});

test("orchestration reports an einrichten that does not reference the guide", () => {
  const reference = "${CLAUDE_PLUGIN_ROOT}/skills/lesson-conventions/orchestration.md";
  const findings = check({ [entryFile("einrichten")]: skillFile("einrichten").split(reference).join("x") });
  assert.equal(findings.length, 1, JSON.stringify(findings));
  assert.equal(findings[0].file, entryFile("einrichten"));
  assert.ok(findings[0].message.includes(reference), findings[0].message);
});

test("orchestration does not count an allow rule that appears only inside a longer one", () => {
  const text = skillFile("einrichten").split('"mcp__plugin_unterricht_onenote__get_page"').join('"mcp__plugin_unterricht_onenote__get_pages"');
  const findings = check({ [entryFile("einrichten")]: text });
  assert.equal(findings.length, 1, JSON.stringify(findings));
  assert.ok(findings[0].message.includes("mcp__plugin_unterricht_onenote__get_page"), findings[0].message);
});

const LESSON_FOLDER = "plugin/skills/lesson-conventions/lesson-folder.md";

test("STATE_LINES are the state-model lines the rule requires in lesson-folder.md", () => {
  assert.deepEqual(STATE_LINES, ["Prüfbericht:", "Rückmeldung:", "Alte Seite:"]);
});

test("orchestration passes on a lesson-folder.md that holds every state line", () => {
  assert.deepEqual(check({ [LESSON_FOLDER]: lessonFolderFile() }), []);
  assert.deepEqual(check({ [LESSON_FOLDER]: lessonFolderFile().replace(/\n/g, "\r\n") }), []);
});

test("orchestration reports each state line missing from lesson-folder.md", () => {
  for (const line of STATE_LINES) {
    const findings = check({ [LESSON_FOLDER]: lessonFolderFile().split(line).join("x") });
    assert.equal(findings.length, 1, JSON.stringify(findings));
    assert.equal(findings[0].rule, "orchestration");
    assert.equal(findings[0].file, LESSON_FOLDER);
    assert.ok(findings[0].message.includes(line), findings[0].message);
  }
});

test("orchestration does not count a state label that is not at the start of a line", () => {
  const text = lessonFolderFile().replace(/^Alte Seite:/m, "Die Alte Seite: steht hier");
  const findings = check({ [LESSON_FOLDER]: text });
  assert.equal(findings.length, 1, JSON.stringify(findings));
  assert.equal(findings[0].file, LESSON_FOLDER);
  assert.ok(findings[0].message.includes("Alte Seite:"), findings[0].message);
});

test("MODEL_TABLE_ROWS map every model choice to the Agent tool's model parameter", () => {
  assert.deepEqual(MODEL_TABLE_ROWS, [
    "| `Opus` | `opus` |",
    "| `Sonnet` | `sonnet` |",
    "| `Haiku` | `haiku` |",
    "| `wie die Sitzung` | none",
  ]);
});

test("orchestration reports each missing row of the model table", () => {
  for (const row of MODEL_TABLE_ROWS) {
    assertOneFinding(orchestrationFile().split(row).join("| x |"), new RegExp(`model table row.*${row.split("`")[1]}`));
  }
});

test("orchestration reports a model table row that maps to another model", () => {
  const changed = orchestrationFile().split("| `Sonnet` | `sonnet` |").join("| `Sonnet` | `opus` |");
  assertOneFinding(changed, /model table row.*Sonnet/);
});

test("orchestration reports a guide that does not name the conventions skill by its path", () => {
  assertOneFinding(orchestrationFile().split(CONVENTIONS_REFERENCE).join("`lesson-conventions`"), /lesson-conventions\/SKILL\.md/);
});

test("orchestration reports a guide without the sentence naming the OneNote tools of the main session", () => {
  const text = orchestrationFile()
    .split(/\r?\n/)
    .filter((line) => !line.includes(MAIN_SESSION_TOOLS_SENTENCE))
    .join("\n");
  assertOneFinding(text, /OneNote tools of the main session/);
});

test("orchestration reports a OneNote tool an entry point calls that the main-session sentence leaves out", () => {
  const listPages = "mcp__plugin_unterricht_onenote__list_pages";
  const entry = skillFile("stunde-ueberarbeiten") + `Call \`${listPages}\` on the target section.\n`;
  const sentence = orchestrationFile().split(/\r?\n/).find((line) => line.includes(MAIN_SESSION_TOOLS_SENTENCE)) ?? "";
  const guide = orchestrationFile().split(sentence).join(sentence.split(`, \`${listPages}\``).join(""));
  const findings = check({ [GUIDE]: guide, [entryFile("stunde-ueberarbeiten")]: entry });
  assert.equal(findings.length, 1, JSON.stringify(findings));
  assert.equal(findings[0].file, GUIDE);
  assert.ok(findings[0].message.includes(listPages), findings[0].message);
  assert.deepEqual(check({ [GUIDE]: orchestrationFile(), [entryFile("stunde-ueberarbeiten")]: entry }), []);
});

test("orchestration reports a OneNote tool the guide itself calls that the main-session sentence leaves out", () => {
  const getPage = "mcp__plugin_unterricht_onenote__get_page";
  const findings = check({ [GUIDE]: orchestrationFile() + `Call \`${getPage}\`.\n` });
  assert.equal(findings.length, 1, JSON.stringify(findings));
  assert.ok(findings[0].message.includes(getPage), findings[0].message);
});

test("BAD_REQUEST_MESSAGE shows the error and asks to forward it to the maintainer", () => {
  assert.equal(
    BAD_REQUEST_MESSAGE,
    "Ich habe angehalten, weil das Plugin einen Fehler gemeldet hat: <Grund>. Das ist ein Fehler im Plugin. Bitte leite diese Meldung an die Person weiter, die das Plugin betreut. Die bisherigen Dateien bleiben im Ordner <Name des Stundenordners>. Wenn der Fehler behoben ist, setze mit /unterricht:stunde-ueberarbeiten fort.",
  );
});

test("orchestration reports a missing or changed bad_request message", () => {
  assertOneFinding(orchestrationFile().split(BAD_REQUEST_MESSAGE).join("x"), /bad_request message/);
  const changed = BAD_REQUEST_MESSAGE.replace("weiter, die das Plugin betreut", "weiter");
  assertOneFinding(orchestrationFile().split(BAD_REQUEST_MESSAGE).join(changed), /bad_request message/);
});
