import { AGENTS } from "../permissions.ts";
import type { Finding, Mode, Repo, Rule } from "../repo.ts";
import { SKILLS } from "./skills.ts";

const RULE = "completeness";

/** The supporting files of the conventions skill, read by path. */
const CONVENTIONS_FILES = [
  "board.md",
  "lesson-folder.md",
  "orchestration.md",
  "examples/plan.md",
  "examples/board.json",
  "examples/NOTES.md",
];

/** The templates `einrichten` copies into a working folder. */
const TEMPLATES = ["CLAUDE.md", "schulkontext.md", "kriterien.md", "onenote.md", "einstellungen.md"];

/** Every file a release needs besides the manifests and the server, which their own rules check. */
export const REQUIRED_FILES = [
  ...AGENTS.map((agent) => `plugin/agents/${agent}.md`),
  ...SKILLS.map((skill) => `plugin/skills/${skill}/SKILL.md`),
  ...CONVENTIONS_FILES.map((file) => `plugin/skills/lesson-conventions/${file}`),
  ...TEMPLATES.map((file) => `plugin/templates/${file}`),
  "README.md",
  "CHANGELOG.md",
];

/** In release mode, reports each component of the marketplace and the plugin that does not exist. */
export const completeness: Rule = {
  name: RULE,
  run(repo: Repo, mode: Mode): Finding[] {
    if (mode !== "release") return [];
    const files = new Set(repo.listFiles());
    return REQUIRED_FILES.filter((file) => !files.has(file)).map((file) => ({
      file,
      rule: RULE,
      message: "missing component",
    }));
  },
};
