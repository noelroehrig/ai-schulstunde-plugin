import { test } from "node:test";
import assert from "node:assert/strict";
import { parseVerlaufsplan, sumMinutes } from "./plan-table.ts";

const HEADER = "| Zeit (Min.) | Phase | Unterrichtsgeschehen | Sozialform | Material/Medien |";

/** A small plan with the given header line and table rows below the Verlaufsplan header. */
function plan(rows: string[], headerLine = "Klasse: 6a · Fach: Mathematik · Datum: offen · Stundenlänge: 45 Minuten"): string {
  return ["# Thema", "", headerLine, "", "## Verlaufsplan", HEADER, "|---|---|---|---|---|", ...rows, "", "## Differenzierung", ""].join(
    "\n",
  );
}

const ROWS = [
  "| 7,5 | Einstieg | Frage | Plenum | Tafelbild |",
  "| 25 | Erarbeitung | Aufgaben | Partnerarbeit | Arbeitsblatt |",
  "| 12,5 | Sicherung | Vergleich | Plenum | Tafelbild |",
  "| **45** | | | | |",
];

test("parseVerlaufsplan returns the Stundenlänge, the rows, and the sum row", () => {
  const result = parseVerlaufsplan(plan(ROWS));
  assert.ok(result.ok, JSON.stringify(result));
  assert.equal(result.stundenlaenge, 45);
  assert.deepEqual(
    result.rows.map((row) => [row.minutes, row.phase]),
    [
      [7.5, "Einstieg"],
      [25, "Erarbeitung"],
      [12.5, "Sicherung"],
    ],
  );
  assert.equal(result.sumRow, 45);
});

test("parseVerlaufsplan accepts CRLF line endings", () => {
  const result = parseVerlaufsplan(plan(ROWS).replace(/\n/g, "\r\n"));
  assert.ok(result.ok, JSON.stringify(result));
  assert.equal(result.rows.length, 3);
});

test("parseVerlaufsplan reads a Stundenlänge with a decimal comma", () => {
  const result = parseVerlaufsplan(plan(ROWS, "Klasse: 6b · Fach: Mathematik · Stundenlänge: 67,5 Minuten"));
  assert.ok(result.ok, JSON.stringify(result));
  assert.equal(result.stundenlaenge, 67.5);
});

test("parseVerlaufsplan reports a missing header line", () => {
  const result = parseVerlaufsplan(plan(ROWS, "Klasse: 6a · Fach: Mathematik"));
  assert.ok(!result.ok);
  assert.ok(result.errors.some((error) => /header line/.test(error)), JSON.stringify(result.errors));
});

test("parseVerlaufsplan reports a missing table", () => {
  const result = parseVerlaufsplan(plan(ROWS).replace(HEADER, "| Zeit | Phase |"));
  assert.ok(!result.ok);
  assert.ok(result.errors.some((error) => /table/.test(error)), JSON.stringify(result.errors));
});

test("parseVerlaufsplan reports a non-numeric duration with its line", () => {
  const result = parseVerlaufsplan(plan(["| 7.5 | Einstieg | Frage | Plenum | Tafelbild |", "| **7,5** | | | | |"]));
  assert.ok(!result.ok);
  assert.deepEqual(result.errors, ['line 8: duration "7.5" is not a number with a decimal comma']);
});

test("parseVerlaufsplan reports a missing sum row", () => {
  const result = parseVerlaufsplan(plan(ROWS.slice(0, 3)));
  assert.ok(!result.ok);
  assert.ok(result.errors.some((error) => /sum row/.test(error)), JSON.stringify(result.errors));
});

test("parseVerlaufsplan reports a bold sum row that is not the last row", () => {
  const result = parseVerlaufsplan(plan([ROWS[3], ...ROWS.slice(0, 3)]));
  assert.ok(!result.ok);
  assert.ok(result.errors.some((error) => /sum row/.test(error)), JSON.stringify(result.errors));
});

test("sumMinutes adds exactly where floating-point addition would not", () => {
  assert.notEqual(0.1 + 0.2, 0.3);
  assert.equal(sumMinutes([0.1, 0.2]), 0.3);
  assert.equal(sumMinutes([7.5, 25, 12.5]), 45);
  assert.equal(sumMinutes([]), 0);
});
