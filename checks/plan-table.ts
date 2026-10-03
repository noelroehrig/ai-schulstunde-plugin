import { VERLAUFSPLAN_HEADER } from "./rules/conventions.ts";

/** One phase row of the Verlaufsplan table. */
export interface VerlaufsplanRow {
  /** 1-based line number in the plan. */
  line: number;
  minutes: number;
  phase: string;
}

/** The parsed Verlaufsplan, or every reason it could not be parsed. */
export type VerlaufsplanResult =
  | { ok: true; stundenlaenge: number; rows: VerlaufsplanRow[]; sumRow: number }
  | { ok: false; errors: string[] };

/** A number of minutes with an optional decimal comma and at most two decimals. */
const MINUTES = /^(\d+)(?:,(\d{1,2}))?$/;

const HEADER_LINE = /^Klasse:.*·\s*Stundenlänge:\s*(\S+)\s+Minuten\s*$/;

const BOLD_SUM = /^\*\*(.+)\*\*$/;

/**
 * Parses the Stundenlänge from the plan's header line and the rows of its Verlaufsplan table
 * (`SPEC.md` section 7.1). The last table row must hold only the bold sum, reported separately.
 */
export function parseVerlaufsplan(markdown: string): VerlaufsplanResult {
  const lines = markdown.split(/\r?\n/).map((line) => line.trim());
  const errors: string[] = [];

  const headerMatch = lines.map((line) => HEADER_LINE.exec(line)).find((match) => match !== null);
  let stundenlaenge: number | undefined;
  if (headerMatch === undefined) {
    errors.push("header line with Stundenlänge missing");
  } else {
    stundenlaenge = parseMinutes(headerMatch[1]);
    if (stundenlaenge === undefined) errors.push(`Stundenlänge "${headerMatch[1]}" is not a number with a decimal comma`);
  }

  const start = lines.indexOf(VERLAUFSPLAN_HEADER);
  if (start === -1) {
    errors.push("Verlaufsplan table missing");
    return { ok: false, errors };
  }
  // Skip the header and the separator row; the table ends at the first line that is not a row.
  let end = start + 2;
  while (end < lines.length && lines[end].startsWith("|")) end++;

  const rows: VerlaufsplanRow[] = [];
  let sumRow: number | undefined;
  let sumRowSeen = false;
  for (let index = start + 2; index < end; index++) {
    const cells = splitRow(lines[index]);
    const line = index + 1;
    const bold = BOLD_SUM.exec(cells[0]);
    if (bold !== null && cells.slice(1).every((cell) => cell === "")) {
      sumRowSeen = true;
      if (index !== end - 1) {
        errors.push(`line ${line}: the sum row must be the last row of the table`);
        continue;
      }
      sumRow = parseMinutes(bold[1]);
      if (sumRow === undefined) errors.push(`line ${line}: sum "${bold[1]}" is not a number with a decimal comma`);
      continue;
    }
    const minutes = parseMinutes(cells[0]);
    if (minutes === undefined) {
      errors.push(`line ${line}: duration "${cells[0]}" is not a number with a decimal comma`);
      continue;
    }
    rows.push({ line, minutes, phase: cells[1] ?? "" });
  }
  if (!sumRowSeen) {
    errors.push("sum row missing: the last row must hold only the bold sum");
  }

  if (errors.length > 0 || stundenlaenge === undefined || sumRow === undefined) return { ok: false, errors };
  return { ok: true, stundenlaenge, rows, sumRow };
}

/**
 * Adds minute values exactly. Every value has at most two decimals (`MINUTES`), so the sum is
 * computed in integer hundredths of a minute, never with floating-point addition.
 */
export function sumMinutes(values: number[]): number {
  return values.reduce((total, value) => total + Math.round(value * 100), 0) / 100;
}

/** Parses `7,5` or `45` into minutes; undefined for anything else, including `7.5`. */
function parseMinutes(text: string): number | undefined {
  const match = MINUTES.exec(text.trim());
  if (match === null) return undefined;
  const [, whole, fraction = ""] = match;
  return (Number(whole) * 100 + Number(fraction.padEnd(2, "0"))) / 100;
}

/** Returns the trimmed cells of a Markdown table row, without the outer pipes. */
function splitRow(line: string): string[] {
  return line
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}
