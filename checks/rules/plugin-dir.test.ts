import { test } from "node:test";
import assert from "node:assert/strict";
import { createMemoryRepo } from "../repo.ts";
import { pluginDir } from "./plugin-dir.ts";

/** Runs the rule on a repository holding the given files, all empty. */
function check(paths: string[]) {
  return pluginDir.run(createMemoryRepo(Object.fromEntries(paths.map((path) => [path, ""]))), "build");
}

test("plugin-dir passes on the allowed entries", () => {
  assert.deepEqual(
    check([
      "plugin/.claude-plugin/plugin.json",
      "plugin/.mcp.json",
      "plugin/server/VERSION",
      "plugin/skills/einrichten/SKILL.md",
      "plugin/agents/lesson-planner.md",
      "plugin/templates/CLAUDE.md",
      "README.md",
      "checks/run.ts",
    ]),
    [],
  );
});

for (const entry of ["bin/tool", "commands/x.md", "hooks/hooks.json", "CLAUDE.md", "settings.json", ".lsp.json", "output-styles/x.md", "themes/x.json", "monitors/x.json"]) {
  test(`plugin-dir reports ${entry.split("/")[0]}`, () => {
    const findings = check(["plugin/.mcp.json", `plugin/${entry}`]);
    assert.equal(findings.length, 1, JSON.stringify(findings));
    assert.equal(findings[0].rule, "plugin-dir");
    assert.equal(findings[0].file, `plugin/${entry.split("/")[0]}`);
  });
}

test("plugin-dir reports each forbidden entry once", () => {
  const findings = check(["plugin/hooks/a.json", "plugin/hooks/b.json"]);
  assert.equal(findings.length, 1, JSON.stringify(findings));
  assert.equal(findings[0].rule, "plugin-dir");
  assert.equal(findings[0].file, "plugin/hooks");
});

test("plugin-dir reports a directory named like the MCP config", () => {
  const findings = check(["plugin/.mcp.json/x"]);
  assert.equal(findings.length, 1, JSON.stringify(findings));
  assert.equal(findings[0].rule, "plugin-dir");
  assert.equal(findings[0].file, "plugin/.mcp.json");
});

test("plugin-dir reports a file named like an allowed directory", () => {
  const findings = check(["plugin/skills"]);
  assert.equal(findings.length, 1, JSON.stringify(findings));
  assert.equal(findings[0].rule, "plugin-dir");
  assert.equal(findings[0].file, "plugin/skills");
});
