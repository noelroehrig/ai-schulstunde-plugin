import { test } from "node:test";
import assert from "node:assert/strict";
import { examplePlanFile } from "../fixtures.ts";
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
