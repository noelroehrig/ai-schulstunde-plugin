import { test } from "node:test";
import assert from "node:assert/strict";
import { createMemoryRepo } from "../repo.ts";
import { paths } from "./paths.ts";

const MCP = "plugin/.mcp.json";
const AGENT = "plugin/agents/board-author.md";
const SKILL = "plugin/skills/stunde-planen/SKILL.md";
const BOARD = "plugin/skills/lesson-conventions/board.md";

const MCP_JSON = JSON.stringify({
  mcpServers: { onenote: { command: "${CLAUDE_PLUGIN_ROOT}/server/onenote-mcp.exe", env: { A: "${user_config.notebook}" } } },
});

/** Runs the rule on a repository holding the given files. */
function check(files: Record<string, string | Uint8Array>) {
  return paths.run(createMemoryRepo(files), "build");
}

/** Asserts exactly one paths finding on `file` whose message matches `pattern`. */
function assertOneFinding(files: Record<string, string>, file: string, pattern: RegExp): void {
  const findings = check(files);
  assert.equal(findings.length, 1, JSON.stringify(findings));
  assert.equal(findings[0].rule, "paths");
  assert.equal(findings[0].file, file);
  assert.match(findings[0].message, pattern);
}

test("paths passes on references to existing files and directories", () => {
  assert.deepEqual(
    check({
      [MCP]: MCP_JSON,
      [AGENT]: "Read `${CLAUDE_PLUGIN_ROOT}/skills/lesson-conventions/board.md`.\n",
      [SKILL]: "Copy ${CLAUDE_PLUGIN_ROOT}/templates/ into the folder. See ${CLAUDE_PLUGIN_ROOT}/skills/lesson-conventions/board.md.\r\n",
      [BOARD]: "# Board\n",
      "plugin/templates/kriterien.md": "# Meine Kriterien\n",
      "docs/x.md": "${CLAUDE_PLUGIN_ROOT}/missing.md and C:\\x",
    }),
    [],
  );
});

test("paths reports a backslash in a JSON string", () => {
  const files = { [MCP]: JSON.stringify({ a: ["ok", { b: "server\\onenote-mcp.exe" }] }) };
  assertOneFinding(files, MCP, /backslash/);
});

test("paths reports a drive letter in a JSON string", () => {
  assertOneFinding({ "plugin/.claude-plugin/plugin.json": JSON.stringify({ a: "C:/x" }) }, "plugin/.claude-plugin/plugin.json", /absolute/);
});

test("paths reports a leading slash in a JSON string", () => {
  const file = "plugin/skills/lesson-conventions/examples/board.json";
  assertOneFinding({ [file]: JSON.stringify({ a: "/usr/x" }) }, file, /absolute/);
});

test("paths leaves an unparseable JSON file to json-valid", () => {
  assert.deepEqual(check({ [MCP]: "{" }), []);
});

test("paths reports a reference to a missing file", () => {
  assertOneFinding({ [AGENT]: "Read ${CLAUDE_PLUGIN_ROOT}/skills/lesson-conventions/bord.md now.\n" }, AGENT, /bord\.md/);
});

test("paths reports a directory reference to a missing directory", () => {
  assertOneFinding({ [SKILL]: "Copy ${CLAUDE_PLUGIN_ROOT}/templates/ now.\n", "plugin/templates.md": "" }, SKILL, /templates\//);
});

test("paths reports a file reference that is a directory", () => {
  assertOneFinding({ [SKILL]: "Copy ${CLAUDE_PLUGIN_ROOT}/templates now.\n", "plugin/templates/a.md": "" }, SKILL, /templates/);
});

test("paths exempts the server exe even when it is absent", () => {
  assert.deepEqual(check({ [MCP]: MCP_JSON }), []);
});

test("paths reports a variable in a supporting file", () => {
  assertOneFinding({ [BOARD]: "Read\n${CLAUDE_PLUGIN_ROOT}/skills/lesson-conventions/board.md\n" }, BOARD, /line 2/);
});

test("paths reports a variable in a template", () => {
  const file = "plugin/templates/onenote.md";
  assertOneFinding({ [file]: "Notizbuch: ${user_config.notebook}\n" }, file, /\$\{/);
});

test("paths reports a variable in a nested agent file", () => {
  const file = "plugin/agents/old/board-author.md";
  assertOneFinding({ [file]: "${user_config.notebook}\n" }, file, /\$\{/);
});

test("paths does not read the server exe as text", () => {
  assert.deepEqual(check({ "plugin/server/onenote-mcp.exe": new TextEncoder().encode("${x}") }), []);
});
