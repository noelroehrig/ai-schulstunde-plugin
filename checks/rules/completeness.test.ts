import { test } from "node:test";
import assert from "node:assert/strict";
import { completeRepoFiles } from "../fixtures.ts";
import { createMemoryRepo } from "../repo.ts";
import { completeness, REQUIRED_FILES } from "./completeness.ts";

test("completeness passes on a complete repository", () => {
  assert.deepEqual(completeness.run(createMemoryRepo(completeRepoFiles()), "release"), []);
});

test("completeness does nothing in build mode", () => {
  assert.deepEqual(completeness.run(createMemoryRepo({}), "build"), []);
});

test("completeness reports each missing component on its own", () => {
  const files = completeRepoFiles();
  delete files["plugin/agents/board-author.md"];
  delete files["plugin/skills/lesson-conventions/examples/NOTES.md"];
  delete files["CHANGELOG.md"];
  const findings = completeness.run(createMemoryRepo(files), "release");
  assert.deepEqual(
    findings.map((finding) => [finding.rule, finding.file]),
    [
      ["completeness", "plugin/agents/board-author.md"],
      ["completeness", "plugin/skills/lesson-conventions/examples/NOTES.md"],
      ["completeness", "CHANGELOG.md"],
    ],
  );
});

test("completeness lists every component of the marketplace and the plugin", () => {
  const findings = completeness.run(createMemoryRepo({}), "release");
  assert.equal(findings.length, 20);
  assert.deepEqual(
    findings.map((finding) => [finding.rule, finding.file]),
    REQUIRED_FILES.map((file) => ["completeness", file]),
  );
  assert.ok(REQUIRED_FILES.includes("plugin/templates/onenote.md"));
  assert.ok(REQUIRED_FILES.includes("plugin/skills/einrichten/SKILL.md"));
});
