import { parseVerlaufsplan, sumMinutes } from "../plan-table.ts";
import type { Finding, Repo, Rule } from "../repo.ts";
import { PLAN_HEADINGS, VERLAUFSPLAN_HEADER } from "./conventions.ts";

const RULE = "examples";

const PLAN_FILE = "plugin/skills/lesson-conventions/examples/plan.md";

/** Checks the example plan, once it exists, against the plan format and its own time sum. */
export const examples: Rule = {
  name: RULE,
  run(repo: Repo): Finding[] {
    if (!repo.listFiles().includes(PLAN_FILE)) return [];
    return planProblems(repo.readText(PLAN_FILE)).map((message) => ({ file: PLAN_FILE, rule: RULE, message }));
  },
};

/** Lists missing plan structure and every time-sum mismatch of the example plan. */
function planProblems(text: string): string[] {
  const lines = text.split(/\r?\n/).map((line) => line.trimEnd());
  const problems: string[] = [];
  for (const heading of PLAN_HEADINGS) {
    if (!lines.includes(heading)) problems.push(`plan heading "${heading}" missing`);
  }
  if (!lines.includes(VERLAUFSPLAN_HEADER)) problems.push("Verlaufsplan table header missing");

  const plan = parseVerlaufsplan(text);
  if (!plan.ok) return [...problems, ...plan.errors];
  const durations = plan.rows.map((row) => row.minutes);
  const sum = sumMinutes(durations);
  if (sum !== plan.stundenlaenge) {
    const terms = durations.map(german).join(" + ");
    problems.push(`durations ${terms} = ${german(sum)}, Stundenlänge ${german(plan.stundenlaenge)}`);
  }
  if (plan.sumRow !== sum) problems.push(`sum row ${german(plan.sumRow)}, durations add up to ${german(sum)}`);
  return problems;
}

/** Formats minutes with a decimal comma, as the plan writes them. */
function german(minutes: number): string {
  return String(minutes).replace(".", ",");
}
