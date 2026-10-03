import { test } from "node:test";
import assert from "node:assert/strict";
import { agentFile, LANGUAGE_SENTENCE, REVIEWER_SENTENCE } from "../fixtures.ts";
import { createMemoryRepo } from "../repo.ts";
import { agents } from "./agents.ts";

/** Runs the rule on a repository holding only the given agent files. */
function check(files: Record<string, string>) {
  return agents.run(createMemoryRepo(files), "build");
}

/** Asserts exactly one agents finding on `file` whose message matches `pattern`. */
function assertOneFinding(file: string, content: string, pattern: RegExp): void {
  const findings = check({ [file]: content });
  assert.equal(findings.length, 1, JSON.stringify(findings));
  assert.equal(findings[0].rule, "agents");
  assert.equal(findings[0].file, file);
  assert.match(findings[0].message, pattern);
}

const PLANNER = "plugin/agents/lesson-planner.md";
const AUTHOR = "plugin/agents/board-author.md";
const REVIEWER = "plugin/agents/board-reviewer.md";

test("agents passes on all four valid agents", () => {
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

test("agents passes when no agent exists yet", () => {
  assert.deepEqual(check({ "plugin/.mcp.json": "{}" }), []);
});

test("agents accepts CRLF line endings", () => {
  assert.deepEqual(check({ [REVIEWER]: agentFile("board-reviewer").replaceAll("\n", "\r\n") }), []);
});

test("the mandated sentences are verbatim from SPEC.md section 3", () => {
  assert.equal(
    LANGUAGE_SENTENCE,
    "All instructions are in English. Everything you write (plans, reviews, OneNote content, messages to the user) must be in German.",
  );
  assert.equal(REVIEWER_SENTENCE, "Exception: line 1 of every review is the verdict token, exactly as defined.");
});

test("agents reports a file without frontmatter", () => {
  assertOneFinding(PLANNER, LANGUAGE_SENTENCE, /frontmatter/);
});

test("agents reports a duplicate frontmatter key", () => {
  assertOneFinding(PLANNER, agentFile("lesson-planner").replace("model: inherit", "model: inherit\nmodel: x"), /duplicate/);
});

test("agents reports an unknown agent name", () => {
  assertOneFinding("plugin/agents/helper.md", agentFile("lesson-planner", { name: "helper" }), /not one of the four agents/);
});

test("agents reports a file name that does not match the name", () => {
  assertOneFinding("plugin/agents/planner.md", agentFile("lesson-planner"), /file name/);
});

test("agents reports an empty description", () => {
  assertOneFinding(PLANNER, agentFile("lesson-planner", { description: "" }), /description/);
});

test("agents reports a model other than inherit", () => {
  assertOneFinding(PLANNER, agentFile("lesson-planner", { model: "opus" }), /model/);
});

test("agents reports a missing omitClaudeMd", () => {
  assertOneFinding(PLANNER, agentFile("lesson-planner", { omitClaudeMd: undefined }), /omitClaudeMd/);
});

test("agents reports a wrong skills entry", () => {
  assertOneFinding(PLANNER, agentFile("lesson-planner", { skills: "other" }), /skills/);
});

test("agents reports a missing tools list", () => {
  assertOneFinding(PLANNER, agentFile("lesson-planner", { tools: undefined }), /tools/);
});

test("agents reports a missing tool", () => {
  assertOneFinding(PLANNER, agentFile("lesson-planner", { tools: "Read, Glob, Grep" }), /missing tool Write/);
});

test("agents reports an extra tool", () => {
  assertOneFinding(PLANNER, agentFile("lesson-planner", { tools: "Read, Glob, Grep, Write, Bash" }), /extra tool Bash/);
});

test("agents reports a OneNote tool for the planner", () => {
  const tools = "Read, Glob, Grep, Write, mcp__plugin_unterricht_onenote__get_page";
  assertOneFinding(PLANNER, agentFile("lesson-planner", { tools }), /extra tool mcp__plugin_unterricht_onenote__get_page/);
});

test("agents reports a write tool for the board reviewer", () => {
  const tools = agentFile("board-author").match(/^tools: (.*)$/m)?.[1];
  const findings = check({ [REVIEWER]: agentFile("board-reviewer", { tools }) });
  assert.equal(findings.length, 2, JSON.stringify(findings));
  assert.ok(findings.every((finding) => finding.rule === "agents" && finding.file === REVIEWER));
});

test("agents reports a wildcard", () => {
  assertOneFinding(PLANNER, agentFile("lesson-planner", { tools: "Read, Glob, Grep, Write, *" }), /wildcard/);
});

test("agents reports a server-level entry", () => {
  const tools = "Read, Glob, Grep, Write, mcp__plugin_unterricht_onenote";
  assertOneFinding(PLANNER, agentFile("lesson-planner", { tools }), /server-level/);
});

test("agents reports a server wildcard", () => {
  const tools = "Read, Glob, Grep, Write, mcp__plugin_unterricht_onenote__*";
  assertOneFinding(PLANNER, agentFile("lesson-planner", { tools }), /wildcard/);
});

test("agents reports a missing language sentence", () => {
  assertOneFinding(PLANNER, agentFile("lesson-planner", {}, "Write in German.\n"), /language sentence/);
});

test("agents reports a reviewer without the exception sentence", () => {
  assertOneFinding(REVIEWER, agentFile("board-reviewer", {}, `${LANGUAGE_SENTENCE}\n`), /exception sentence/);
});

test("agents does not require the exception sentence from the author", () => {
  assert.deepEqual(check({ [AUTHOR]: agentFile("board-author", {}, `${LANGUAGE_SENTENCE}\n`) }), []);
});
