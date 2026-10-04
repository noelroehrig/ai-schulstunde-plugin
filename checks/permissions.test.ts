import { test } from "node:test";
import assert from "node:assert/strict";
import { AGENT_TOOLS, isAgentName } from "./permissions.ts";

test("planner and plan reviewer have file tools only", () => {
  for (const agent of ["lesson-planner", "plan-reviewer"] as const) {
    assert.deepEqual(AGENT_TOOLS[agent], ["Read", "Glob", "Grep", "Write"]);
  }
});

test("board reviewer has the OneNote read tools by full name", () => {
  assert.deepEqual(AGENT_TOOLS["board-reviewer"], [
    "Read",
    "Glob",
    "Grep",
    "Write",
    "mcp__plugin_unterricht_onenote__get_notebooks",
    "mcp__plugin_unterricht_onenote__list_pages",
    "mcp__plugin_unterricht_onenote__get_page",
    "mcp__plugin_unterricht_onenote__ping",
  ]);
});

test("only the board author may write to OneNote", () => {
  const writers = Object.entries(AGENT_TOOLS)
    .filter(([, tools]) => tools.some((tool) => /__(create|replace)_page$/.test(tool)))
    .map(([agent]) => agent);
  assert.deepEqual(writers, ["board-author"]);
});

test("isAgentName knows exactly the four agents", () => {
  assert.ok(isAgentName("board-author"));
  assert.ok(!isAgentName("helper"));
});
