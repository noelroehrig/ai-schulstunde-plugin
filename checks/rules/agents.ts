import { parseFrontmatter } from "../frontmatter.ts";
import { AGENT_TOOLS, isAgentName } from "../permissions.ts";
import type { Finding, Repo, Rule } from "../repo.ts";

const RULE = "agents";

/** The sentence every agent body contains verbatim (`SPEC.md` section 3). */
export const LANGUAGE_SENTENCE =
  "All instructions are in English. Everything you write (plans, reviews, OneNote content, messages to the user) must be in German.";

/** The sentence the two reviewer bodies also contain verbatim (`SPEC.md` section 3). */
export const REVIEWER_SENTENCE = "Exception: line 1 of every review is the verdict token, exactly as defined.";

const REVIEWERS = new Set(["plan-reviewer", "board-reviewer"]);

const AGENT_FILE = /^plugin\/agents\/([^/]+)\.md$/;

/** Checks each existing agent definition: frontmatter, tool list, and the mandated sentences. */
export const agents: Rule = {
  name: RULE,
  run(repo: Repo): Finding[] {
    const findings: Finding[] = [];
    for (const file of repo.listFiles()) {
      const match = AGENT_FILE.exec(file);
      if (match === null) continue;
      for (const message of agentProblems(match[1], repo.readText(file))) {
        findings.push({ file, rule: RULE, message });
      }
    }
    return findings;
  },
};

/** Lists what is wrong with the agent definition in `text`, stored as `<fileName>.md`. */
function agentProblems(fileName: string, text: string): string[] {
  const parsed = parseFrontmatter(text);
  if (!parsed.ok) return [parsed.error];
  const { fields, body } = parsed;
  const problems: string[] = [];
  const name = fields.get("name") ?? "";
  if (!isAgentName(name)) problems.push(`name "${name}" is not one of the four agents`);
  else if (fileName !== name) problems.push(`file name must be ${name}.md`);
  if ((fields.get("description") ?? "") === "") problems.push("description must not be empty");
  if (fields.get("model") !== "inherit") problems.push("model must be inherit");
  if (fields.get("omitClaudeMd") !== "true") problems.push("omitClaudeMd must be true");
  if (fields.get("skills") !== "lesson-conventions") problems.push("skills must be lesson-conventions");
  const tools = fields.get("tools");
  if (tools === undefined) problems.push("tools is missing");
  else if (isAgentName(name)) problems.push(...toolProblems(tools, AGENT_TOOLS[name]));
  if (!body.includes(LANGUAGE_SENTENCE)) problems.push("body lacks the mandated language sentence");
  if (REVIEWERS.has(name) && !body.includes(REVIEWER_SENTENCE)) {
    problems.push("body lacks the reviewer exception sentence");
  }
  return problems;
}

/** Compares a `tools` value with the agent's set from the permission table. */
function toolProblems(value: string, expected: readonly string[]): string[] {
  const actual = value.split(",").map((tool) => tool.trim()).filter((tool) => tool !== "");
  const problems: string[] = [];
  for (const tool of actual) {
    if (tool.includes("*")) problems.push(`wildcard ${tool} is not allowed`);
    else if (isServerLevel(tool)) problems.push(`server-level entry ${tool} is not allowed`);
    else if (!expected.includes(tool)) problems.push(`extra tool ${tool}`);
  }
  for (const tool of expected) {
    if (!actual.includes(tool)) problems.push(`missing tool ${tool}`);
  }
  return problems;
}

/** True for an MCP entry that names a server but no tool, which grants all of its tools. */
function isServerLevel(tool: string): boolean {
  return tool.startsWith("mcp__") && !tool.slice("mcp__".length).includes("__");
}
