import { validateBoardPayload } from "../board-payload.ts";
import { parseVerlaufsplan, sumMinutes } from "../plan-table.ts";
import type { Finding, Repo, Rule } from "../repo.ts";
import { PLAN_HEADINGS, VERLAUFSPLAN_HEADER } from "./conventions.ts";
import { isObject, readJson, type JsonObject } from "./json.ts";

const RULE = "examples";

const PLAN_FILE = "plugin/skills/lesson-conventions/examples/plan.md";

const BOARD_FILE = "plugin/skills/lesson-conventions/examples/board.json";

/** The example Ansicht the example board is laid out for (`examples/NOTES.md`). */
const EXAMPLE_WIDTH = 1024;
const EXAMPLE_MIN_FONT_SIZE = 20;

/**
 * Checks the example plan against the plan format and its own time sum, and the example board
 * against the payload model and the example Ansicht. Each part runs once its file exists.
 */
export const examples: Rule = {
  name: RULE,
  run(repo: Repo): Finding[] {
    const findings: Finding[] = [];
    if (repo.listFiles().includes(PLAN_FILE)) {
      for (const message of planProblems(repo.readText(PLAN_FILE))) findings.push({ file: PLAN_FILE, rule: RULE, message });
    }
    const board = readJson(repo, BOARD_FILE);
    // A board that does not parse is reported by json-valid.
    if (!board.missing && board.value !== undefined) {
      for (const message of boardProblems(board.value)) findings.push({ file: BOARD_FILE, rule: RULE, message });
    }
    return findings;
  },
};

/** Lists payload errors, then every outline and font size that breaks the example Ansicht. */
function boardProblems(value: unknown): string[] {
  const errors = validateBoardPayload(value);
  if (errors.length > 0 || !isObject(value)) return errors;
  const problems: string[] = [];
  (value.outlines as JsonObject[]).forEach((outline, index) => {
    const path = `outlines[${index}]`;
    const position = outline.position as JsonObject | undefined;
    if (position === undefined || outline.width === undefined) {
      problems.push(`${path}: position and width are required for the example Ansicht`);
    } else {
      const x = position.x as number;
      const width = outline.width as number;
      if (x + width > EXAMPLE_WIDTH) {
        problems.push(`${path}: x + width = ${x} + ${width} = ${x + width}, more than ${EXAMPLE_WIDTH}`);
      }
    }
    (outline.items as JsonObject[]).forEach((item, itemIndex) => {
      problems.push(...fontSizeProblems(item, `${path}.items[${itemIndex}]`));
    });
  });
  return problems;
}

/**
 * Lists every piece of text in an outline item whose own `font_size` is missing or below the
 * example minimum: a paragraph with `text`, every run, every list item with `text`.
 */
function fontSizeProblems(item: JsonObject, path: string): string[] {
  if (item.type === "list") return listFontSizeProblems(item.items as JsonObject[], `${path}.items`);
  return contentFontSizeProblems(item, path);
}

/** Checks list items and their children, recursively. */
function listFontSizeProblems(entries: JsonObject[], path: string): string[] {
  return entries.flatMap((entry, index) => [
    ...contentFontSizeProblems(entry, `${path}[${index}]`),
    ...listFontSizeProblems((entry.children as JsonObject[] | undefined) ?? [], `${path}[${index}].children`),
  ]);
}

/** Checks the size of `text` on the element itself, or the size of each of its runs. */
function contentFontSizeProblems(element: JsonObject, path: string): string[] {
  if (element.segments === undefined) return sizeProblem(element, path);
  return (element.segments as JsonObject[]).flatMap((run, index) => sizeProblem(run, `${path}.segments[${index}]`));
}

/** One problem when `element` has no `font_size` or one below the example minimum. */
function sizeProblem(element: JsonObject, path: string): string[] {
  const size = element.font_size as number | undefined;
  if (size === undefined) return [`${path}: no explicit font_size`];
  if (size < EXAMPLE_MIN_FONT_SIZE) return [`${path}: font_size ${size} is less than ${EXAMPLE_MIN_FONT_SIZE}`];
  return [];
}

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
