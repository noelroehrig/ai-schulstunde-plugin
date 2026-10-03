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

/** Checks that `orchestration.md`, once it exists, states every constant the procedure relies on. */
export const orchestration: Rule = {
  name: RULE,
  run(repo: Repo): Finding[] {
    if (!repo.listFiles().includes(GUIDE_FILE)) return [];
    return guideProblems(repo.readText(GUIDE_FILE)).map((message) => ({ file: GUIDE_FILE, rule: RULE, message }));
  },
};

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
