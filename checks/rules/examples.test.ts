import { test } from "node:test";
import assert from "node:assert/strict";
import { exampleBoardFile, examplePlanFile } from "../fixtures.ts";
import { createMemoryRepo } from "../repo.ts";
import { examples } from "./examples.ts";

const PLAN = "plugin/skills/lesson-conventions/examples/plan.md";

/** Runs the rule on a repository holding only the given files. */
function check(files: Record<string, string>) {
  return examples.run(createMemoryRepo(files), "build");
}

/** Asserts exactly one examples finding on the example plan whose message matches `pattern`. */
function assertOneFinding(content: string, pattern: RegExp): void {
  const findings = check({ [PLAN]: content });
  assert.equal(findings.length, 1, JSON.stringify(findings));
  assert.equal(findings[0].rule, "examples");
  assert.equal(findings[0].file, PLAN);
  assert.match(findings[0].message, pattern);
}

test("examples passes on a correct example plan", () => {
  assert.deepEqual(check({ [PLAN]: examplePlanFile() }), []);
});

test("examples accepts CRLF line endings", () => {
  assert.deepEqual(check({ [PLAN]: examplePlanFile().replace(/\n/g, "\r\n") }), []);
});

test("examples passes when the example plan does not exist yet", () => {
  assert.deepEqual(check({ "plugin/skills/lesson-conventions/SKILL.md": "# Skill\n" }), []);
});

test("examples reports a missing plan heading", () => {
  assertOneFinding(examplePlanFile().replace("## Hausaufgabe\n", ""), /plan heading "## Hausaufgabe"/);
});

test("examples reports a changed Verlaufsplan table header", () => {
  const findings = check({ [PLAN]: examplePlanFile().replace("| Zeit (Min.) |", "| Zeit |") });
  assert.ok(findings.length >= 1);
  assert.ok(findings.every((finding) => finding.rule === "examples" && finding.file === PLAN));
  assert.ok(findings.some((finding) => /Verlaufsplan table header/.test(finding.message)), JSON.stringify(findings));
});

test("examples reports durations that do not add up to the Stundenlänge", () => {
  const body = examplePlanFile().replace("| 25 | Erarbeitung", "| 20 | Erarbeitung").replace("**45**", "**40**");
  assertOneFinding(body, /7,5 \+ 20 \+ 12,5 = 40, Stundenlänge 45/);
});

test("examples reports a sum row that differs from the sum", () => {
  assertOneFinding(examplePlanFile().replace("**45**", "**50**"), /sum row 50, durations add up to 45/);
});

test("examples reports a Verlaufsplan that cannot be parsed", () => {
  assertOneFinding(examplePlanFile().replace("| 7,5 |", "| 7.5 |"), /duration "7\.5"/);
});

const BOARD = "plugin/skills/lesson-conventions/examples/board.json";

/** The example board fixture as an object, for tests that change one value. */
function board(): any {
  return JSON.parse(exampleBoardFile());
}

/** Asserts exactly one examples finding on the example board whose message matches `pattern`. */
function assertOneBoardFinding(value: unknown, pattern: RegExp): void {
  const findings = check({ [BOARD]: JSON.stringify(value) });
  assert.equal(findings.length, 1, JSON.stringify(findings));
  assert.equal(findings[0].rule, "examples");
  assert.equal(findings[0].file, BOARD);
  assert.match(findings[0].message, pattern);
}

test("examples passes on a correct example board", () => {
  assert.deepEqual(check({ [BOARD]: exampleBoardFile() }), []);
});

test("examples passes when the example board does not exist yet", () => {
  assert.deepEqual(check({ [PLAN]: examplePlanFile() }), []);
});

test("examples leaves an example board that does not parse to json-valid", () => {
  assert.deepEqual(check({ [BOARD]: "{" }), []);
});

test("examples reports an example board that fails validateBoardPayload", () => {
  const value = board();
  value.images = [];
  assertOneBoardFinding(value, /^images: .*non-goal/);
});

test("examples reports an outline wider than the example Ansicht", () => {
  const value = board();
  value.outlines[1].width = 1024 - value.outlines[1].position.x + 1;
  assertOneBoardFinding(value, /outlines\[1\]: x \+ width = \d+ \+ \d+ = 1025, more than 1024/);
});

test("examples reports an outline without position or width", () => {
  const value = board();
  delete value.outlines[0].width;
  assertOneBoardFinding(value, /outlines\[0\]: position and width are required/);
});

test("examples reports a font size below 20", () => {
  const value = board();
  value.outlines[0].items[0].font_size = 18;
  assertOneBoardFinding(value, /outlines\[0\]\.items\[0\]: font_size 18 is less than 20/);
});

test("examples reports text without an explicit font size", () => {
  const value = board();
  delete value.outlines[0].items[0].font_size;
  assertOneBoardFinding(value, /outlines\[0\]\.items\[0\]: no explicit font_size/);
});

test("examples checks the font size of runs and list items", () => {
  const value = board();
  value.outlines[0].items.push(
    { type: "paragraph", segments: [{ text: "a", font_size: 20 }, { text: "b", font_size: 12 }] },
    { type: "list", style: "bullet", items: [{ text: "c" }] },
  );
  const findings = check({ [BOARD]: JSON.stringify(value) });
  assert.deepEqual(
    findings.map((finding) => finding.message),
    [
      "outlines[0].items[1].segments[1]: font_size 12 is less than 20",
      "outlines[0].items[2].items[0]: no explicit font_size",
    ],
  );
});
