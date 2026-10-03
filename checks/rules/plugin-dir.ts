import type { Finding, Repo, Rule } from "../repo.ts";

const RULE = "plugin-dir";

/** The only directories at the top of `plugin/` (`SPEC.md` section 5.1). */
const ALLOWED_DIRS = new Set([".claude-plugin", "server", "skills", "agents", "templates"]);

/** The only file at the top of `plugin/`. */
const ALLOWED_FILE = ".mcp.json";

/**
 * Reports every top-level entry of `plugin/` outside the allowed set, once per entry.
 * Components such as `bin/`, `commands/`, hooks, or a `CLAUDE.md` break Cowork or are never loaded.
 */
export const pluginDir: Rule = {
  name: RULE,
  run(repo: Repo): Finding[] {
    const reported = new Set<string>();
    const findings: Finding[] = [];
    for (const file of repo.listFiles()) {
      if (!file.startsWith("plugin/")) continue;
      const [entry, ...rest] = file.slice("plugin/".length).split("/");
      const isDir = rest.length > 0;
      const allowed = isDir ? ALLOWED_DIRS.has(entry) : entry === ALLOWED_FILE;
      if (allowed || reported.has(entry)) continue;
      reported.add(entry);
      findings.push({
        file: `plugin/${entry}`,
        rule: RULE,
        message: `${isDir ? "directory" : "file"} ${entry} is not allowed at the top of the plugin directory`,
      });
    }
    return findings;
  },
};
