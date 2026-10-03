import { test } from "node:test";
import assert from "node:assert/strict";
import { parseFrontmatter } from "./frontmatter.ts";

test("parseFrontmatter returns the fields and the body", () => {
  const result = parseFrontmatter("---\nname: a\ndescription:  Reads: files  \n---\nBody\nmore\n");
  assert.ok(result.ok);
  assert.deepEqual(Object.fromEntries(result.fields), { name: "a", description: "Reads: files" });
  assert.equal(result.body, "Body\nmore\n");
});

test("parseFrontmatter accepts CRLF line endings", () => {
  const result = parseFrontmatter("---\r\nname: a\r\n---\r\nBody\r\n");
  assert.ok(result.ok);
  assert.equal(result.fields.get("name"), "a");
  assert.equal(result.body, "Body\n");
});

test("parseFrontmatter reads a key without a value as empty", () => {
  const result = parseFrontmatter("---\ndescription:\n---\n");
  assert.ok(result.ok);
  assert.equal(result.fields.get("description"), "");
});

test("parseFrontmatter rejects a file without frontmatter", () => {
  const result = parseFrontmatter("# Title\n");
  assert.equal(result.ok, false);
});

test("parseFrontmatter rejects an unclosed block", () => {
  const result = parseFrontmatter("---\nname: a\n");
  assert.ok(!result.ok);
  assert.match(result.error, /closing/);
});

test("parseFrontmatter rejects a duplicate key", () => {
  const result = parseFrontmatter("---\nname: a\nname: b\n---\n");
  assert.ok(!result.ok);
  assert.match(result.error, /duplicate key name/);
});

test("parseFrontmatter rejects a line that is not key: value", () => {
  const result = parseFrontmatter("---\n- item\n---\n");
  assert.ok(!result.ok);
  assert.match(result.error, /line 2/);
});
