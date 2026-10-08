import { validateBoardFile } from "../board-payload.ts";
import { parseVerlaufsplan, sumMinutes } from "../plan-table.ts";
import type { Finding, Repo, Rule } from "../repo.ts";
import { PLAN_HEADINGS, VERLAUFSPLAN_HEADER } from "./conventions.ts";
import { isObject, readJson, type JsonObject } from "./json.ts";

const RULE = "examples";

const PLAN_FILE = "plugin/skills/lesson-conventions/examples/plan.md";

const BOARD_FILE = "plugin/skills/lesson-conventions/examples/board.json";

/** The example Ansicht and Seitenaufbau the example board is laid out for (`examples/NOTES.md`). */
const EXAMPLE_WIDTH = 1024;
const EXAMPLE_MIN_FONT_SIZE = 20;
const EXAMPLE_CONTENT_TOP = 71;
const EXAMPLE_NOTES_COLOR = "#7030A0";

/** The smallest x of the notes for the teacher: the Sichtbare Breite plus 24. */
const EXAMPLE_NOTES_X = EXAMPLE_WIDTH + 24;

/** A position as `validateBoardFile` guarantees it. */
interface Position {
  x: number;
  y: number;
}

/** A part of an outline item that carries text formatting: a paragraph, a list item, or a run. */
interface Formatted {
  element: JsonObject;
  path: string;
  /** True for a paragraph or list item with runs: the runs carry the text, so its own fields are optional. */
  optional: boolean;
}

/**
 * Checks the example plan against the plan format and its own time sum, and the example board
 * against the `tafelbild_vN.json` format and the example Ansicht. Each part runs once its file exists.
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

/** Lists file errors, then every outline, floating image, and piece of text that breaks the example Ansicht. */
function boardProblems(value: unknown): string[] {
  const errors = validateBoardFile(value);
  if (errors.length > 0 || !isObject(value)) return errors;
  const images = (value.images as JsonObject[] | undefined) ?? [];
  return [
    ...(value.outlines as JsonObject[]).flatMap((outline, index) => outlineProblems(outline, `outlines[${index}]`)),
    ...images.flatMap((image, index) => imageProblems(image, `images[${index}]`)),
  ];
}

/**
 * Lists the problems of one outline. An outline at `x` of at least `EXAMPLE_NOTES_X` holds the notes for the
 * teacher: it may extend beyond the visible width, and its text follows the notes rules instead of the minimum size.
 */
function outlineProblems(outline: JsonObject, path: string): string[] {
  const position = outline.position as Position | undefined;
  const width = outline.width as number | undefined;
  const notes = position !== undefined && position.x >= EXAMPLE_NOTES_X;
  const problems: string[] = [];
  if (position === undefined || width === undefined) {
    problems.push(`${path}: position and width are required for the example Ansicht`);
  } else if (!notes) {
    problems.push(...widthProblems(position, width, path));
  }
  if (position !== undefined) problems.push(...topProblems(position, path));
  const parts = (outline.items as JsonObject[]).flatMap((item, index) => formattedParts(item, `${path}.items[${index}]`));
  problems.push(...parts.flatMap(notes ? notesProblems : sizeProblems));
  return problems;
}

/** Lists the problems of a floating image: beyond the visible width, or above the content area. */
function imageProblems(image: JsonObject, path: string): string[] {
  const position = image.position as Position;
  return [...widthProblems(position, image.width as number, path), ...topProblems(position, path)];
}

/** One problem when an element extends beyond the example's visible width. */
function widthProblems(position: Position, width: number, path: string): string[] {
  const right = position.x + width;
  return right > EXAMPLE_WIDTH ? [`${path}: x + width = ${position.x} + ${width} = ${right}, more than ${EXAMPLE_WIDTH}`] : [];
}

/** One problem when an element starts above the example's content area. */
function topProblems(position: Position, path: string): string[] {
  return position.y < EXAMPLE_CONTENT_TOP ? [`${path}: y = ${position.y}, less than ${EXAMPLE_CONTENT_TOP} (Inhalt ab)`] : [];
}

/** Lists the formatted parts of an outline item: its paragraph, or its list items recursively, and their runs. */
function formattedParts(item: JsonObject, path: string): Formatted[] {
  if (item.type === "image_placeholder") return [];
  if (item.type === "list") return listParts(item.items as JsonObject[], `${path}.items`);
  return contentParts(item, path);
}

/** Lists the formatted parts of list items and their children, recursively. */
function listParts(entries: JsonObject[], path: string): Formatted[] {
  return entries.flatMap((entry, index) => [
    ...contentParts(entry, `${path}[${index}]`),
    ...listParts((entry.children as JsonObject[] | undefined) ?? [], `${path}[${index}].children`),
  ]);
}

/** Lists a paragraph or list item with `text`, or one with runs followed by its runs. */
function contentParts(element: JsonObject, path: string): Formatted[] {
  if (element.segments === undefined) return [{ element, path, optional: false }];
  const runs = (element.segments as JsonObject[]).map((run, index) => ({
    element: run,
    path: `${path}.segments[${index}]`,
    optional: false,
  }));
  return [{ element, path, optional: true }, ...runs];
}

/** One problem when a part has no `font_size` or one below the example minimum; an optional part only when it is set. */
function sizeProblems({ element, path, optional }: Formatted): string[] {
  const size = element.font_size as number | undefined;
  if (size === undefined) return optional ? [] : [`${path}: no explicit font_size`];
  if (size < EXAMPLE_MIN_FONT_SIZE) return [`${path}: font_size ${size} is less than ${EXAMPLE_MIN_FONT_SIZE}`];
  return [];
}

/** Problems of a part of the notes: no explicit `font_size`, or a `color` other than the Notizfarbe; an optional part only when set. */
function notesProblems({ element, path, optional }: Formatted): string[] {
  const problems: string[] = [];
  if (element.font_size === undefined && !optional) problems.push(`${path}: no explicit font_size`);
  if (element.color === undefined ? !optional : element.color !== EXAMPLE_NOTES_COLOR) {
    problems.push(`${path}: color must be ${EXAMPLE_NOTES_COLOR} in the notes for the teacher`);
  }
  return problems;
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
