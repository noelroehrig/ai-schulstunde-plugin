import { test } from "node:test";
import assert from "node:assert/strict";
import { skillFile } from "../fixtures.ts";
import { createMemoryRepo } from "../repo.ts";
import { skills } from "./skills.ts";

/** Runs the rule on a repository holding only the given files. */
function check(files: Record<string, string>) {
  return skills.run(createMemoryRepo(files), "build");
}

/** Asserts exactly one skills finding on `file` whose message matches `pattern`. */
function assertOneFinding(file: string, content: string, pattern: RegExp): void {
  const findings = check({ [file]: content });
  assert.equal(findings.length, 1, JSON.stringify(findings));
  assert.equal(findings[0].rule, "skills");
  assert.equal(findings[0].file, file);
  assert.match(findings[0].message, pattern);
}

const PLANEN = "plugin/skills/stunde-planen/SKILL.md";
const CONVENTIONS = "plugin/skills/lesson-conventions/SKILL.md";

test("skills passes on all four valid skills", () => {
  const files: Record<string, string> = {};
  for (const name of ["einrichten", "stunde-planen", "stunde-ueberarbeiten", "lesson-conventions"]) {
    files[`plugin/skills/${name}/SKILL.md`] = skillFile(name);
  }
  assert.deepEqual(check(files), []);
});

test("skills passes when no skill exists yet", () => {
  assert.deepEqual(check({ "plugin/.mcp.json": "{}" }), []);
});

test("skills ignores supporting files", () => {
  assert.deepEqual(check({ "plugin/skills/lesson-conventions/board.md": "# Board\n" }), []);
});

test("skills reports an unknown skill directory", () => {
  assertOneFinding("plugin/skills/hilfe/SKILL.md", skillFile("hilfe"), /not one of the four skills/);
});

test("skills reports a SKILL.md without frontmatter", () => {
  assertOneFinding(PLANEN, "Instructions.\n", /frontmatter/);
});

test("skills reports an entry point the model may invoke", () => {
  assertOneFinding(PLANEN, skillFile("stunde-planen", { "disable-model-invocation": undefined }), /disable-model-invocation/);
});

test("skills reports an entry point without description", () => {
  assertOneFinding(PLANEN, skillFile("stunde-planen", { description: "" }), /description/);
});

test("skills reports a user-invocable conventions skill", () => {
  assertOneFinding(CONVENTIONS, skillFile("lesson-conventions", { "user-invocable": "true" }), /user-invocable/);
});

test("skills reports disable-model-invocation on the conventions skill", () => {
  const content = skillFile("lesson-conventions", { "disable-model-invocation": "false" });
  assertOneFinding(CONVENTIONS, content, /disable-model-invocation/);
});
