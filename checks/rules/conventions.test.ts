import { test } from "node:test";
import assert from "node:assert/strict";
import { conventionsSkillBody, skillFile } from "../fixtures.ts";
import { createMemoryRepo } from "../repo.ts";
import { conventions } from "./conventions.ts";

const SKILL = "plugin/skills/lesson-conventions/SKILL.md";

/** Runs the rule on a repository holding only the given files. */
function check(files: Record<string, string>) {
  return conventions.run(createMemoryRepo(files), "build");
}

/** Asserts exactly one conventions finding on the skill whose message matches `pattern`. */
function assertOneFinding(content: string, pattern: RegExp): void {
  const findings = check({ [SKILL]: content });
  assert.equal(findings.length, 1, JSON.stringify(findings));
  assert.equal(findings[0].rule, "conventions");
  assert.equal(findings[0].file, SKILL);
  assert.match(findings[0].message, pattern);
}

test("conventions passes on a complete SKILL.md", () => {
  assert.deepEqual(check({ [SKILL]: skillFile("lesson-conventions") }), []);
});

test("conventions accepts CRLF line endings", () => {
  assert.deepEqual(check({ [SKILL]: skillFile("lesson-conventions").replace(/\n/g, "\r\n") }), []);
});

test("conventions passes when the skill does not exist yet", () => {
  assert.deepEqual(check({ "plugin/skills/lesson-conventions/board.md": "# Board\n" }), []);
});

test("conventions reports a glossary term missing from the table", () => {
  const body = conventionsSkillBody().replace("| Sozialform | ", "| Sozialformen | ");
  assertOneFinding(body, /glossary term "Sozialform"/);
});

test("conventions reports a glossary term that appears only outside the table", () => {
  const body = conventionsSkillBody().replace("| Plenum | ", "| Klassengespräch | ") + "\nPlenum\n";
  assertOneFinding(body, /glossary term "Plenum"/);
});

test("conventions reports a missing plan heading", () => {
  assertOneFinding(conventionsSkillBody().replace("## Hausaufgabe\n", ""), /plan heading "## Hausaufgabe"/);
});

test("conventions reports a changed Verlaufsplan table header", () => {
  const body = conventionsSkillBody().replace("| Zeit (Min.) |", "| Zeit |");
  assertOneFinding(body, /Verlaufsplan table header/);
});

test("conventions reports a missing review heading", () => {
  assertOneFinding(conventionsSkillBody().replace("## Nachrechnung\n", ""), /review heading "## Nachrechnung"/);
});

test("conventions reports a missing Frühere Muss-Mängel heading", () => {
  const body = conventionsSkillBody().replace("## Frühere Muss-Mängel\n", "## Frühere Mängel\n");
  assertOneFinding(body, /review heading "## Frühere Muss-Mängel"/);
});

test("conventions reports a missing assignment key", () => {
  assertOneFinding(conventionsSkillBody().replace("page_title:", "title:"), /assignment key "page_title"/);
});

test("conventions reports each missing key of the template pages and the Elternseite", () => {
  for (const key of ["parent_page_id", "banner_page_id", "symbol_page_id", "model_page_id"]) {
    assertOneFinding(conventionsSkillBody().replace(`${key}:`, "x:"), new RegExp(`assignment key "${key}"`));
  }
});

test("conventions does not count page_id inside a longer key", () => {
  assertOneFinding(conventionsSkillBody().replace(/^page_id:/m, "x:"), /assignment key "page_id"/);
});

test("conventions reports a missing token", () => {
  assertOneFinding(conventionsSkillBody().replace(/FAILED/g, "ERROR"), /token "FAILED"/);
});

test("conventions reports each missing item separately", () => {
  const findings = check({ [SKILL]: "---\nname: lesson-conventions\n---\n" });
  assert.equal(findings.length, 15 + 8 + 1 + 4 + 12 + 4);
  assert.ok(findings.every((finding) => finding.rule === "conventions" && finding.file === SKILL));
});
