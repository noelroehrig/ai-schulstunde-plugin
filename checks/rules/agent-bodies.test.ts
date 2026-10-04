import { test } from "node:test";
import assert from "node:assert/strict";
import { agentBody, agentFile } from "../fixtures.ts";
import { createMemoryRepo } from "../repo.ts";
import { agentBodies, BOARD_GUIDE, BODY_SECTIONS } from "./agent-bodies.ts";

/** Runs the rule on a repository holding only the given files. */
function check(files: Record<string, string>) {
  return agentBodies.run(createMemoryRepo(files), "build");
}

/** Asserts exactly one agent-bodies finding on `file` whose message matches `pattern`. */
function assertOneFinding(file: string, content: string, pattern: RegExp): void {
  const findings = check({ [file]: content });
  assert.equal(findings.length, 1, JSON.stringify(findings));
  assert.equal(findings[0].rule, "agent-bodies");
  assert.equal(findings[0].file, file);
  assert.match(findings[0].message, pattern);
}

const PLANNER = "plugin/agents/lesson-planner.md";
const AUTHOR = "plugin/agents/board-author.md";
const REVIEWER = "plugin/agents/board-reviewer.md";

test("agent-bodies passes on all four valid agents", () => {
  assert.deepEqual(
    check({
      [PLANNER]: agentFile("lesson-planner"),
      "plugin/agents/plan-reviewer.md": agentFile("plan-reviewer"),
      [AUTHOR]: agentFile("board-author"),
      [REVIEWER]: agentFile("board-reviewer"),
    }),
    [],
  );
});

test("agent-bodies passes when no agent exists yet", () => {
  assert.deepEqual(check({ "plugin/.mcp.json": "{}" }), []);
});

test("agent-bodies accepts CRLF line endings", () => {
  assert.deepEqual(check({ [AUTHOR]: agentFile("board-author").replaceAll("\n", "\r\n") }), []);
});

test("agent-bodies ignores files outside plugin/agents", () => {
  assert.deepEqual(check({ "plugin/skills/lesson-conventions/SKILL.md": "---\nname: x\n---\nNothing.\n" }), []);
});

test("the sections are in the order the plan requires", () => {
  assert.deepEqual(BODY_SECTIONS, ["Inputs", "Steps", "Output", "Stop", "Result line"]);
  assert.equal(BOARD_GUIDE, "${CLAUDE_PLUGIN_ROOT}/skills/lesson-conventions/board.md");
});

test("agent-bodies reports a file without frontmatter", () => {
  assertOneFinding(PLANNER, "## Inputs\n", /frontmatter/);
});

test("agent-bodies reports a missing section", () => {
  const body = agentBody("lesson-planner").replace("## Stop\n", "");
  assertOneFinding(PLANNER, agentFile("lesson-planner", {}, body), /section "Stop" missing/);
});

test("agent-bodies reports sections out of order", () => {
  const body = agentBody("lesson-planner")
    .replace("## Output\n", "## Swap\n")
    .replace("## Stop\n", "## Output\n")
    .replace("## Swap\n", "## Stop\n");
  assertOneFinding(PLANNER, agentFile("lesson-planner", {}, body), /order/);
});

test("agent-bodies does not count a section name inside a longer heading", () => {
  const body = agentBody("lesson-planner").replace("## Output\n", "## Output file\n");
  assertOneFinding(PLANNER, agentFile("lesson-planner", {}, body), /section "Output" missing/);
});

test("agent-bodies reports a body that never mentions schulkontext.md", () => {
  const body = agentBody("lesson-planner").replaceAll("`schulkontext.md`", "the context");
  assertOneFinding(PLANNER, agentFile("lesson-planner", {}, body), /schulkontext\.md/);
});

test("agent-bodies reports kriterien.md mentioned before schulkontext.md", () => {
  const body = agentBody("lesson-planner").replace("## Inputs\n", "## Inputs\nSee `kriterien.md`.\n");
  assertOneFinding(PLANNER, agentFile("lesson-planner", {}, body), /schulkontext\.md.*before.*kriterien\.md/);
});

test("agent-bodies reports another working-folder file mentioned before kriterien.md", () => {
  const body = agentBody("lesson-planner").replace("## Inputs\n", "## Inputs\nThe plan `planung_vN.md`.\n");
  assertOneFinding(PLANNER, agentFile("lesson-planner", {}, body), /planung_v.*before/);
});

test("agent-bodies reports material/ mentioned before kriterien.md", () => {
  const body = agentBody("lesson-planner").replace("## Inputs\n", "## Inputs\nFiles in `material/`.\n");
  assertOneFinding(PLANNER, agentFile("lesson-planner", {}, body), /material\/.*before/);
});

test("agent-bodies reports a body without DONE", () => {
  const body = agentBody("lesson-planner").replaceAll("DONE", "OK");
  assertOneFinding(PLANNER, agentFile("lesson-planner", {}, body), /DONE/);
});

test("agent-bodies reports a body without FAILED", () => {
  const body = agentBody("lesson-planner").replaceAll("FAILED", "ERROR");
  assertOneFinding(PLANNER, agentFile("lesson-planner", {}, body), /FAILED/);
});

test("agent-bodies reports a board agent without the board.md path", () => {
  const body = agentBody("board-reviewer").replace(BOARD_GUIDE, "board.md");
  assertOneFinding(REVIEWER, agentFile("board-reviewer", {}, body), /board\.md/);
});

test("agent-bodies does not require the board.md path from the planning agents", () => {
  assert.ok(!agentBody("lesson-planner").includes(BOARD_GUIDE));
  assert.deepEqual(check({ [PLANNER]: agentFile("lesson-planner") }), []);
});
