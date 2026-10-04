/** The plugin's four agents. */
export const AGENTS = ["lesson-planner", "plan-reviewer", "board-author", "board-reviewer"] as const;

/** One of the four agent names. */
export type AgentName = (typeof AGENTS)[number];

/** True when `name` is one of the four agents. */
export function isAgentName(name: string): name is AgentName {
  return (AGENTS as readonly string[]).includes(name);
}

/** Prefix of a OneNote tool's full name (`mcp__plugin_<plugin>_<server>__<tool>`). */
export const ONENOTE_TOOL_PREFIX = "mcp__plugin_unterricht_onenote__";

/** Every agent reads the configuration first and hands off through files. */
const FILE_TOOLS = ["Read", "Glob", "Grep", "Write"];

/** The OneNote tools each agent may call, by short name: least privilege per agent. */
const ONENOTE_TOOLS: Record<AgentName, string[]> = {
  "lesson-planner": [],
  "plan-reviewer": [],
  "board-author": ["get_notebooks", "list_pages", "get_page", "create_page", "replace_page", "ping"],
  "board-reviewer": ["get_notebooks", "list_pages", "get_page", "ping"],
};

/** The exact `tools` list of `agent`, OneNote tools by full name. */
function toolsOf(agent: AgentName): readonly string[] {
  return [...FILE_TOOLS, ...ONENOTE_TOOLS[agent].map((tool) => ONENOTE_TOOL_PREFIX + tool)];
}

/** The exact `tools` list of each agent. */
export const AGENT_TOOLS: Record<AgentName, readonly string[]> = {
  "lesson-planner": toolsOf("lesson-planner"),
  "plan-reviewer": toolsOf("plan-reviewer"),
  "board-author": toolsOf("board-author"),
  "board-reviewer": toolsOf("board-reviewer"),
};
