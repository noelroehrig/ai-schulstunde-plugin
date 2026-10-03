import { test } from "node:test";
import assert from "node:assert/strict";
import { createMemoryRepo } from "../repo.ts";
import { jsonValid } from "./json.ts";

test("json-valid passes on valid JSON files", () => {
  const repo = createMemoryRepo({ "a.json": '{ "x": [1, 2] }\r\n', "b.md": "{ not json" });
  assert.deepEqual(jsonValid.run(repo, "build"), []);
});

test("json-valid reports a file that does not parse, with the parser's message", () => {
  const repo = createMemoryRepo({ "plugin/.mcp.json": '{ "x": }' });
  const findings = jsonValid.run(repo, "build");
  assert.equal(findings.length, 1);
  assert.equal(findings[0].rule, "json-valid");
  assert.equal(findings[0].file, "plugin/.mcp.json");
  let parserMessage = "";
  try {
    JSON.parse('{ "x": }');
  } catch (error) {
    parserMessage = (error as Error).message;
  }
  assert.ok(findings[0].message.includes(parserMessage));
});
