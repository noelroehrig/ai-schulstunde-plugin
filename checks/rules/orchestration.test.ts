import { test } from "node:test";
import assert from "node:assert/strict";
import { orchestrationFile, skillFile } from "../fixtures.ts";
import { createMemoryRepo } from "../repo.ts";
import { AGENT_TYPES, CHECKPOINT_QUESTION, ENTRY_POINT_REFERENCES, ESCALATION_LABELS, orchestration } from "./orchestration.ts";

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

test("orchestration reports each missing item separately", () => {
  const findings = check({ [GUIDE]: "# Orchestration\n" });
  assert.equal(findings.length, 1 + 3 + 4 + 5);
  assert.ok(findings.every((finding) => finding.rule === "orchestration" && finding.file === GUIDE));
});

const ENTRY_POINTS = ["stunde-planen", "stunde-ueberarbeiten"];

/** The path of the `SKILL.md` of the entry point `name`. */
function entryFile(name: string): string {
  return `plugin/skills/${name}/SKILL.md`;
}

test("orchestration passes on entry points that reference the guide and both settings", () => {
  const files = Object.fromEntries(ENTRY_POINTS.map((name) => [entryFile(name), skillFile(name)]));
  assert.deepEqual(check(files), []);
});

test("orchestration passes when the entry points do not exist yet", () => {
  assert.deepEqual(check({ [entryFile("einrichten")]: "Instructions.\n" }), []);
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
