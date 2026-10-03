import type { Finding, Repo, Rule } from "../repo.ts";

const RULE = "orchestration";

const GUIDE_FILE = "plugin/skills/lesson-conventions/orchestration.md";

/** The checkpoint question of `SPEC.md` section 6.3, verbatim. */
export const CHECKPOINT_QUESTION = "Passt der Plan so? Antworte mit „weiter“, oder schreib, was geändert werden soll.";

/** The three escalation options of `SPEC.md` section 6.5, in order. */
export const ESCALATION_LABELS = ["So übernehmen", "Ich gebe Hinweise", "Abbrechen"];

/** The `subagent_type` values the orchestrator starts agents with. */
export const AGENT_TYPES = [
  "unterricht:lesson-planner",
  "unterricht:plan-reviewer",
  "unterricht:board-author",
  "unterricht:board-reviewer",
];

/** Verdict tokens, result-line tokens, and the `ping` field the orchestrator reads. */
export const ORCHESTRATION_TOKENS = ["APPROVED", "REVISE", "DONE", "FAILED", "onenote_responsive"];

/** The entry points that follow `orchestration.md`. */
const ENTRY_POINT_FILES = ["plugin/skills/stunde-planen/SKILL.md", "plugin/skills/stunde-ueberarbeiten/SKILL.md"];

/** What each entry point that follows the guide must reference: the guide's path and the two settings it passes on. */
export const ENTRY_POINT_REFERENCES = [
  "${CLAUDE_PLUGIN_ROOT}/skills/lesson-conventions/orchestration.md",
  "${user_config.notebook}",
  "${user_config.plan_checkpoint}",
];

/**
 * Checks that `orchestration.md`, once it exists, states every constant the procedure relies on, and that
 * each existing entry point following it references the guide and the settings it needs.
 */
export const orchestration: Rule = {
  name: RULE,
  run(repo: Repo): Finding[] {
    const files = repo.listFiles();
    const findings: Finding[] = [];
    if (files.includes(GUIDE_FILE)) {
      for (const message of guideProblems(repo.readText(GUIDE_FILE))) findings.push({ file: GUIDE_FILE, rule: RULE, message });
    }
    for (const file of ENTRY_POINT_FILES) {
      if (!files.includes(file)) continue;
      for (const message of entryPointProblems(repo.readText(file))) findings.push({ file, rule: RULE, message });
    }
    return findings;
  },
};

/** Lists every reference missing from an entry point that follows the guide. */
function entryPointProblems(text: string): string[] {
  return ENTRY_POINT_REFERENCES.filter((reference) => !text.includes(reference)).map(
    (reference) => `reference "${reference}" missing`,
  );
}

/** Lists every constant missing from the orchestration guide. */
function guideProblems(text: string): string[] {
  const problems: string[] = [];
  if (!text.includes(CHECKPOINT_QUESTION)) problems.push("checkpoint question missing or changed");
  for (const label of ESCALATION_LABELS) {
    if (!text.includes(label)) problems.push(`escalation label "${label}" missing`);
  }
  for (const type of AGENT_TYPES) {
    if (!text.includes(type)) problems.push(`agent type "${type}" missing`);
  }
  for (const token of ORCHESTRATION_TOKENS) {
    if (!new RegExp(`\\b${token}\\b`).test(text)) problems.push(`token "${token}" missing`);
  }
  return problems;
}
