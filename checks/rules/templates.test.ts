import { test } from "node:test";
import assert from "node:assert/strict";
import { templateFiles } from "../fixtures.ts";
import { createMemoryRepo } from "../repo.ts";
import { templates } from "./templates.ts";

/** Runs the rule on a repository holding only the given files. */
function check(files: Record<string, string>) {
  return templates.run(createMemoryRepo(files), "build");
}

/** The template fixtures with one file replaced. */
function withFile(name: string, content: string): Record<string, string> {
  return { ...templateFiles(), [`plugin/templates/${name}`]: content };
}

/** Asserts exactly one templates finding on `name` whose message matches `pattern`. */
function assertOneFinding(files: Record<string, string>, name: string, pattern: RegExp): void {
  const findings = check(files);
  assert.equal(findings.length, 1, JSON.stringify(findings));
  assert.equal(findings[0].rule, "templates");
  assert.equal(findings[0].file, `plugin/templates/${name}`);
  assert.match(findings[0].message, pattern);
}

/** A template fixture's content. */
function template(name: string): string {
  return templateFiles()[`plugin/templates/${name}`];
}

test("templates passes on complete templates", () => {
  assert.deepEqual(check(templateFiles()), []);
});

test("templates accepts CRLF line endings", () => {
  const files = Object.fromEntries(
    Object.entries(templateFiles()).map(([path, content]) => [path, content.replace(/\n/g, "\r\n")]),
  );
  assert.deepEqual(check(files), []);
});

test("templates passes when no template exists yet", () => {
  assert.deepEqual(check({ "plugin/skills/lesson-conventions/SKILL.md": "# Skill\n" }), []);
});

test("templates reports a missing template once any template exists", () => {
  const files = templateFiles();
  delete files["plugin/templates/onenote.md"];
  assertOneFinding(files, "onenote.md", /template missing/);
});

test("templates reports a missing schulkontext heading", () => {
  const files = withFile("schulkontext.md", template("schulkontext.md").replace("## Phasenmodell\n", ""));
  assertOneFinding(files, "schulkontext.md", /heading "## Phasenmodell" missing/);
});

test("templates accepts a heading followed by an explanation", () => {
  const files = withFile("kriterien.md", template("kriterien.md").replace("### Soll\n", "### Soll (Hinweis)\n"));
  assert.deepEqual(check(files), []);
});

test("templates reports a missing kriterien heading", () => {
  const files = withFile("kriterien.md", template("kriterien.md").replace(/### Soll.*\n/g, ""));
  assertOneFinding(files, "kriterien.md", /heading "### Soll" missing/);
});

test("templates reports a missing onenote heading", () => {
  const files = withFile("onenote.md", template("onenote.md").replace("## Ansicht\n", ""));
  assertOneFinding(files, "onenote.md", /heading "## Ansicht" missing/);
});

test("templates reports a missing privacy sentence", () => {
  const files = withFile("CLAUDE.md", template("CLAUDE.md").replace("Hier stehen keine Namen", "Hier stehen keine Daten"));
  assertOneFinding(files, "CLAUDE.md", /privacy sentence missing/);
});

test("templates reports a filled-in Stundenlänge", () => {
  const files = withFile(
    "schulkontext.md",
    template("schulkontext.md").replace("Stundenlänge: [Minuten eintragen] Minuten", "Stundenlänge: 45 Minuten"),
  );
  assertOneFinding(files, "schulkontext.md", /line "Stundenlänge: \[Minuten eintragen\] Minuten" missing/);
});

test("templates reports a filled-in Abschnitt and Seitentitel", () => {
  const files = withFile(
    "onenote.md",
    template("onenote.md").replace("Abschnitt: [", "Abschnitt: 6b [").replace("Seitentitel: [", "Seitentitel: Stunde"),
  );
  const findings = check(files);
  assert.deepEqual(
    findings.map((finding) => finding.message),
    ['line starting with "Abschnitt: [" missing', 'line starting with "Seitentitel: [" missing'],
  );
});

test("templates reports a settings line whose value differs from the default", () => {
  const files = withFile(
    "einstellungen.md",
    template("einstellungen.md").replace("Modell für das Tafelbild: Sonnet", "Modell für das Tafelbild: Opus"),
  );
  assertOneFinding(files, "einstellungen.md", /line "Modell für das Tafelbild: Sonnet" missing/);
});

test("templates reports a missing einstellungen heading", () => {
  const files = withFile("einstellungen.md", template("einstellungen.md").replace("## Prüfpunkt\n", ""));
  assertOneFinding(files, "einstellungen.md", /heading "## Prüfpunkt" missing/);
});

test("templates reports a filled-in Notizbuch", () => {
  const files = withFile("onenote.md", template("onenote.md").replace("Notizbuch: [Name]", "Notizbuch: Mathe"));
  assertOneFinding(files, "onenote.md", /line starting with "Notizbuch: \[" missing/);
});

test("templates reports a missing time-sum criterion", () => {
  const files = withFile(
    "kriterien.md",
    template("kriterien.md").replace("Die Phasen ergeben zusammen genau die Stundenlänge.", "Die Zeit passt."),
  );
  assertOneFinding(files, "kriterien.md", /"Die Phasen ergeben zusammen genau die Stundenlänge\." missing/);
});
