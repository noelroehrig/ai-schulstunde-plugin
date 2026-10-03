import { parseFrontmatter } from "../frontmatter.ts";
import type { Finding, Repo, Rule } from "../repo.ts";

const RULE = "skills";

/** The conventions skill, preloaded into every agent (`SPEC.md` section 5.5). */
export const CONVENTIONS_SKILL = "lesson-conventions";

/** The skills only the teacher starts (`SPEC.md` section 5.3). */
export const ENTRY_POINT_SKILLS = ["einrichten", "stunde-planen", "stunde-ueberarbeiten"];

/** The four skills of `SPEC.md` section 3.1. */
export const SKILLS = [...ENTRY_POINT_SKILLS, CONVENTIONS_SKILL];

const SKILL_FILE = /^plugin\/skills\/([^/]+)\/SKILL\.md$/;

/** Checks each existing `SKILL.md`: a known directory and the invocation fields for its kind. */
export const skills: Rule = {
  name: RULE,
  run(repo: Repo): Finding[] {
    const findings: Finding[] = [];
    for (const file of repo.listFiles()) {
      const match = SKILL_FILE.exec(file);
      if (match === null) continue;
      for (const message of skillProblems(match[1], repo.readText(file))) {
        findings.push({ file, rule: RULE, message });
      }
    }
    return findings;
  },
};

/** Lists what is wrong with the `SKILL.md` in `text` of the skill directory `name`. */
function skillProblems(name: string, text: string): string[] {
  if (!SKILLS.includes(name)) return [`skill directory "${name}" is not one of the four skills`];
  const parsed = parseFrontmatter(text);
  if (!parsed.ok) return [parsed.error];
  const { fields } = parsed;
  const problems: string[] = [];
  if (name === CONVENTIONS_SKILL) {
    if (fields.get("user-invocable") !== "false") problems.push("user-invocable must be false");
    // The key itself is forbidden, not only `true`: `true` blocks the preload into subagents (F16).
    if (fields.has("disable-model-invocation")) problems.push("must not set disable-model-invocation");
    return problems;
  }
  if (fields.get("disable-model-invocation") !== "true") problems.push("disable-model-invocation must be true");
  if ((fields.get("description") ?? "") === "") problems.push("description must not be empty");
  return problems;
}
