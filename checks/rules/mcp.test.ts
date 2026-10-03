import { test } from "node:test";
import assert from "node:assert/strict";
import { createMemoryRepo } from "../repo.ts";
import { mcp } from "./mcp.ts";

const FILE = "plugin/.mcp.json";

/** A valid `onenote` server entry with `changes` merged in. */
function server(changes: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    command: "${CLAUDE_PLUGIN_ROOT}/server/onenote-mcp.exe",
    env: {
      ONENOTE_ALLOWED_NOTEBOOKS: "${user_config.notebook}",
      ONENOTE_DISABLE_RAW_XML: "1",
    },
    ...changes,
  };
}

/** Runs the rule on a repository holding only `.mcp.json` with the given servers. */
function check(servers: Record<string, unknown>) {
  return mcp.run(createMemoryRepo({ [FILE]: JSON.stringify({ mcpServers: servers }) }), "build");
}

/** Asserts exactly one mcp finding whose message matches `pattern`. */
function assertOneFinding(servers: Record<string, unknown>, pattern: RegExp): void {
  const findings = check(servers);
  assert.equal(findings.length, 1, JSON.stringify(findings));
  assert.equal(findings[0].rule, "mcp");
  assert.equal(findings[0].file, FILE);
  assert.match(findings[0].message, pattern);
}

test("mcp passes on the onenote server", () => {
  assert.deepEqual(check({ onenote: server() }), []);
});

test("mcp reports a missing .mcp.json", () => {
  const findings = mcp.run(createMemoryRepo({ "plugin/x.md": "" }), "build");
  assert.equal(findings.length, 1);
  assert.equal(findings[0].rule, "mcp");
  assert.equal(findings[0].file, FILE);
});

test("mcp reports a second server", () => {
  assertOneFinding({ onenote: server(), other: server() }, /exactly one server/);
});

test("mcp reports a server under another name", () => {
  assertOneFinding({ notes: server() }, /exactly one server/);
});

test("mcp reports a wrong command", () => {
  assertOneFinding({ onenote: server({ command: "server/onenote-mcp.exe" }) }, /command/);
});

test("mcp reports a wrong notebook variable", () => {
  const env = { ONENOTE_ALLOWED_NOTEBOOKS: "Unterricht", ONENOTE_DISABLE_RAW_XML: "1" };
  assertOneFinding({ onenote: server({ env }) }, /ONENOTE_ALLOWED_NOTEBOOKS/);
});

test("mcp reports raw XML not disabled", () => {
  const env = { ONENOTE_ALLOWED_NOTEBOOKS: "${user_config.notebook}", ONENOTE_DISABLE_RAW_XML: "0" };
  assertOneFinding({ onenote: server({ env }) }, /ONENOTE_DISABLE_RAW_XML/);
});

test("mcp reports an extra env variable", () => {
  const env = {
    ONENOTE_ALLOWED_NOTEBOOKS: "${user_config.notebook}",
    ONENOTE_DISABLE_RAW_XML: "1",
    DEBUG: "1",
  };
  assertOneFinding({ onenote: server({ env }) }, /DEBUG/);
});

test("mcp reports a missing env block", () => {
  assertOneFinding({ onenote: server({ env: undefined }) }, /env/);
});
