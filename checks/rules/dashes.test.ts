import { test } from "node:test";
import assert from "node:assert/strict";
import { createMemoryRepo } from "../repo.ts";
import { noDashes } from "./dashes.ts";

const EM = "\u2014";
const EN = "\u2013";

test("no-dashes passes on text without em or en dashes", () => {
  const repo = createMemoryRepo({ "a.md": "plain - hyphen\n", "b.json": "{}" });
  assert.deepEqual(noDashes.run(repo, "build"), []);
});

test("no-dashes reports an em dash with file and line", () => {
  const repo = createMemoryRepo({ "docs/a.md": `first\nsecond ${EM} line\n` });
  const findings = noDashes.run(repo, "build");
  assert.equal(findings.length, 1);
  assert.equal(findings[0].rule, "no-dashes");
  assert.equal(findings[0].file, "docs/a.md");
  assert.match(findings[0].message, /line 2/);
});

test("no-dashes reports an en dash and counts CRLF lines correctly", () => {
  const repo = createMemoryRepo({ "x.ts": `a\r\nb\r\nc ${EN} d\r\n` });
  const findings = noDashes.run(repo, "build");
  assert.equal(findings.length, 1);
  assert.equal(findings[0].rule, "no-dashes");
  assert.equal(findings[0].file, "x.ts");
  assert.match(findings[0].message, /line 3/);
});

test("no-dashes checks every listed extension", () => {
  const files: Record<string, string> = {};
  for (const ext of ["md", "json", "ts", "yml", "yaml", "txt"]) files[`f.${ext}`] = EM;
  const findings = noDashes.run(createMemoryRepo(files), "build");
  assert.deepEqual(findings.map((f) => f.file), Object.keys(files).sort());
});

test("no-dashes ignores other file types", () => {
  const repo = createMemoryRepo({ "server.exe": EM, "notes.html": EM });
  assert.deepEqual(noDashes.run(repo, "build"), []);
});
