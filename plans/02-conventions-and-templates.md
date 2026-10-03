# Plan 02: conventions skill and templates

Builds the shared knowledge every agent and entry point relies on: the `lesson-conventions` skill
(`SKILL.md`, `lesson-folder.md`, `board.md`, examples) and the German templates that `einrichten`
copies into a teacher's working folder. Read `SPEC.md` sections 3, 5.5, 6.2, 7, 8, 9, and 10 and
Appendix B first. Plan 01 is done: the repo checks exist and `npm run verify` passes.

Common rules for every phase:

- Instruction text is English. Everything a teacher reads is German, with real umlauts and ß.
  Glossary terms (`SPEC.md` section 3) are used verbatim, in English text too.
- These files are read by path, so they contain no `${...}` (`SPEC.md` section 5.5; the `paths`
  rule enforces it).
- Nothing school- or teacher-specific outside content marked as an example. No student names
  anywhere, also not in examples.
- Every mechanical requirement below gets its check in `checks/` first (failing test, then the
  file). Checks follow the conventions of plan 01: pure rules over the repository interface, a pass
  and a fail test each.
- `npm run verify` passes at the end of every phase.

## Phase 1: `lesson-conventions/SKILL.md`

Files: `plugin/skills/lesson-conventions/SKILL.md`, `checks/rules/conventions.ts`, and its test.

Acceptance criteria:

1. Frontmatter: `name: lesson-conventions`, an English one-sentence `description` (shared
   conventions of the unterricht plugin, used by its agents and entry points), and
   `user-invocable: false`. No `disable-model-invocation`.
2. Sections with these English headings, in this order: `Language`, `Glossary`, `Working folder`,
   `Assignment and result line`, `Lesson plan format`, `Review format`, `Personal data`.
3. **Language:** the rule "who reads it decides the language" and what it means for an agent:
   instructions are English, everything it writes is German, English constants (`SPEC.md` section
   3.1) are written exactly, and line 1 of a review is the verdict token.
4. **Glossary:** a table with the columns `Begriff` and `Meaning`, listing exactly the 15 terms of
   `SPEC.md` section 3 in that order, with a short English meaning each. Rules: never translate a
   term, use it verbatim also inside English text; the phase names in the teacher's
   `## Phasenmodell` (in `schulkontext.md`) are used verbatim as well.
5. **Working folder:** the files of `SPEC.md` section 9 with their roles. Rules: read
   `schulkontext.md`, then `kriterien.md`, before anything else; write only the `output` named in
   the assignment; never change the teacher's own files; use only the paths the assignment lists,
   never "the latest" file.
6. **Assignment and result line:** the assignment an orchestrator sends, exactly in this shape:

   ```
   working_folder: <absolute path>
   lesson_folder: <absolute path>
   round: <n> of 3
   inputs:
   - <absolute path>
   output: <absolute path>
   ```

   Board agents also get `section_id:`, `page_title:`, and `page_id:` lines (`page_id:` empty when
   the page does not exist yet). The final message of every agent is exactly one line:
   `DONE <output path>` (the board author: `DONE <output path> page_id=<id>`) or
   `FAILED <reason in German>`, and nothing else.
7. **Lesson plan format:** the structure of `SPEC.md` section 7.1 as a code block, with placeholders
   instead of example values: title line `# <Stundenthema>`; header line
   `Klasse: <Klasse> · Fach: <Fach> · Datum: <Datum oder „offen“> · Stundenlänge: <Minuten> Minuten`;
   then exactly these headings in this order: `## Einordnung`, `## Lernziele`, `## Verlaufsplan`,
   `## Differenzierung`, `## Material`, `## Hausaufgabe`, `## Tafelbild (Inhalt)`,
   `## Besondere Regeln`. The Verlaufsplan table header is exactly
   `| Zeit (Min.) | Phase | Unterrichtsgeschehen | Sozialform | Material/Medien |`, and its last
   row holds only the bold sum in the first column. Rules: `Zeit` holds durations with a decimal
   comma; the durations add up exactly to the Stundenlänge; phase names come from the Phasenmodell;
   `## Tafelbild (Inhalt)` lists short items per phase; `## Besondere Regeln` covers each special
   rule of `schulkontext.md` or says `keine`; the Stundenlänge comes from `stunde.md`.
8. **Review format:** line 1 is exactly `APPROVED` or `REVISE`. Then exactly these headings:
   `## Muss-Mängel` (numbered), `## Soll-Hinweise`, `## Nachrechnung`. An empty section holds
   `- keine`. Verdict rule: `APPROVED` exactly when there are no Muss-Mängel. Under
   `## Nachrechnung`, every criterion that is a number gets one line with the computation, for
   example `7,5 + 25 + 12,5 = 45 (Stundenlänge 45): erfüllt`. A reviewer states for each Muss-Mangel
   of the previous review whether it is fixed, raises a new Muss-Mangel only for an actual violation
   of `kriterien.md` or `schulkontext.md`, and records a conflict between teacher feedback and
   `kriterien.md` as a Soll-Hinweis. The same format applies to board reviews.
9. **Personal data:** no names or other personal data of students; describe groups instead, for
   example `leistungsstärkere Schülerinnen und Schüler`.
10. Rule `conventions`: when `SKILL.md` exists, it contains every glossary term inside the glossary
    table, the eight plan headings and the Verlaufsplan table header verbatim, the three review
    headings, the assignment keys (`working_folder`, `lesson_folder`, `round`, `inputs`, `output`,
    `section_id`, `page_title`, `page_id`), and the tokens `APPROVED`, `REVISE`, `DONE`, `FAILED`.
    Each missing item is a finding naming it.

## Phase 2: `lesson-folder.md` and the example plan

Files: `plugin/skills/lesson-conventions/lesson-folder.md`,
`plugin/skills/lesson-conventions/examples/plan.md`, `checks/plan-table.ts`,
`checks/rules/examples.ts`, and their tests.

Acceptance criteria:

1. `lesson-folder.md` (English, for the orchestrators) states the folder naming, the version
   numbering, and the file list of `SPEC.md` section 9, and the `stunde.md` format, exactly:

   ```markdown
   # Stunde: <Thema>

   ## Auftrag
   Thema: <Thema>
   Klasse: <Klasse>
   Hinweise: <Hinweise oder „keine“>
   Stundenlänge: <Minuten> Minuten
   Quelle der Stundenlänge: <„schulkontext.md“ oder „Auftrag“>

   ## Stand
   Schritt: <Planung | Prüfpunkt | Tafelbild | Fertig | Abgebrochen>
   Runde: <n> von 3
   Planversion: <N oder „keine“>
   Freigegebener Plan: <Dateiname oder „keiner“>
   Tafelbildversion: <M oder „keine“>

   ## OneNote
   Abschnitt: <Name oder „offen“>
   Seitentitel: <Titel oder „offen“>
   Seiten-ID: <ID oder „keine“>

   ## Übernommene Mängel
   - <Mangel oder „keine“>

   ## Verlauf
   - <JJJJ-MM-TT>: <ein Satz, was passiert ist>
   ```

   Rules: the labels are German because the teacher may open the file; the orchestrator updates
   `## Stand` after every step and appends one line to `## Verlauf`; a lesson folder name that
   already exists gets ` (2)`, ` (3)`, and so on.
2. `examples/plan.md` is a complete German lesson plan in the format of `SKILL.md`. The line under
   the title is `> Beispiel: Werte und Klasse sind ausgedacht.` Content: Mathematik, a sixth grade,
   topic `Brüche als Anteile`, Stundenlänge 45 Minuten, the phases Einstieg, Erarbeitung, Sicherung,
   at least one duration with a decimal comma, Differenzierung for groups without names,
   `## Besondere Regeln` with `keine`.
3. `parseVerlaufsplan(markdown)` returns the Stundenlänge from the header line and the table rows
   (minutes as numbers parsed with a decimal comma, phase names), with the bold sum row reported
   separately. It returns errors for a missing header line, a missing table, a non-numeric duration,
   or a missing sum row. Sums are computed exactly (for example in half-minute units), never with
   floating-point rounding.
4. Rule `examples` (plan part): `examples/plan.md` has all eight plan headings and the table header
   verbatim; its durations add up to its Stundenlänge; the bold sum row equals that sum.

## Phase 3: `board.md`, the payload validator, the example board

Files: `plugin/skills/lesson-conventions/board.md`, `plugin/skills/lesson-conventions/examples/board.json`,
`plugin/skills/lesson-conventions/examples/NOTES.md`, `checks/board-payload.ts`, the board part of
`checks/rules/examples.ts`, and their tests.

Acceptance criteria:

1. `validateBoardPayload(value)` returns the errors of a payload `{ page_id, title, outlines }`
   (`page_id` and `title` non-empty strings) against the server's model (`SPEC.md` Appendix B),
   restricted to what the plugin uses:
   - Outline: optional `position` `{ x, y, z? }` with `x >= 0`, `y >= 0`, integer `z`; optional
     `width > 0`; `items` a non-empty array.
   - Item `{ "type": "paragraph" }`: exactly one of `text` (string) or `segments` (array of runs);
     optional `style` in `normal`, `h1` to `h6`; optional booleans `bold`, `italic`, `underline`,
     `strikethrough`; optional `color` and `highlight` matching `^#(?:[0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$`;
     optional `font_size > 0`; optional `font_family` matching `^[A-Za-z0-9 ,.\-]+$`, at most 64
     characters.
   - Run: `text` (string) and the same optional formatting fields.
   - Item `{ "type": "list" }`: `style` `bullet` or `numbered`, `items` an array of
     `{ text | segments, children? }`, recursively.
   - Any other item type (including `image_placeholder` and `inline_image`), an `images` key, or an
     unknown key anywhere is an error, because images and tables are non-goals.
2. `board.md` (English, German strings quoted) contains:
   - **Payload format:** the field list above, with one small JSON example.
   - **Writing a page:** round 1 calls `create_page` with `section_id` and `page_title` (it sets only
     the title), then `replace_page` with the content; later rounds call `replace_page` on the
     assignment's `page_id`. `replace_page` deletes everything on the page except the title, so it is
     only ever called on the page this board loop created.
   - **`tafelbild_vN.json`:** exactly the arguments passed to `replace_page` (`page_id`, `title`,
     `outlines`), written to the assignment's `output` immediately before the call.
   - **Visible area:** the Ansicht in `onenote.md` counts as configured only when
     `Sichtbare Breite`, `Sichtbare Höhe`, and `Mindestschriftgröße` are numbers. Then every outline
     has `position` and `width`, `x + width` is at most the Breite, every paragraph and run has an
     explicit `font_size` of at least the Mindestschriftgröße, and colors come only from its
     `Farben` list. Without a configured Ansicht, positions and widths may be omitted, and the
     default sizes are 32 pt for the Stundenthema, 24 pt for block headings, and 20 pt for text.
   - **Height estimate** (the server cannot report heights): line height is 1.3 times the font
     size; a paragraph takes `ceil(characters * 0.5 * font_size / width)` lines, at least 1; a
     block's height is the sum of its line heights; the next outline starts 24 pt below the
     estimated end of the previous one. Author and reviewer use the same estimate, and the reviewer
     calls it an estimate.
   - **Layout:** the Stundenthema first, as `h1` with an explicit size; one outline per phase block
     in plan order; keywords and short phrases from `## Tafelbild (Inhalt)`, not sentences; glossary
     terms verbatim; few colors with one meaning each; no tables, no images.
   - **Review:** what the board reviewer checks on the read-back and what on the payload
     (`SPEC.md` section 8.3), with the Nachrechnung for `x + width`. OneNote rewrites colors and
     moves paragraph formatting, so a formatting difference between payload and read-back is never
     a finding.
3. `examples/board.json` is a payload for the `## Tafelbild (Inhalt)` of `examples/plan.md`, laid out
   for the example Ansicht `Sichtbare Breite: 1024 pt`, `Sichtbare Höhe: 768 pt`,
   `Mindestschriftgröße: 20 pt`, colors `#1F4E79` (headings) and `#C00000` (important), with
   `page_id` `beispiel`.
4. `examples/NOTES.md` (English) explains why both examples are good: phases and times, keywords,
   the example Ansicht, and the layout arithmetic (each `x + width`, the estimated heights).
5. Rule `examples` (board part): `examples/board.json` passes `validateBoardPayload`, every outline
   satisfies `x + width <= 1024`, and every `font_size` is at least 20.

## Phase 4: templates

Files: `plugin/templates/CLAUDE.md`, `plugin/templates/schulkontext.md`,
`plugin/templates/kriterien.md`, `plugin/templates/onenote.md`, `checks/rules/templates.ts`, and
its test.

Acceptance criteria:

1. `schulkontext.md` and `kriterien.md` are the templates of `SPEC.md` section 9.1.
2. `onenote.md` is exactly:

   ```markdown
   # OneNote

   Das Notizbuch steht in den Plugin-Einstellungen („OneNote-Notizbuch“).

   ## Ablage
   Abschnitt: [Name eines Abschnitts, oder „Klasse“ für einen Abschnitt pro Klasse mit dem Namen der Klasse]
   Seitentitel: [Schema, zum Beispiel „JJJJ-MM-TT Klasse Thema“]

   ## Ansicht
   Nur ausfüllen, wenn das Tafelbild auf einer festen sichtbaren Fläche gezeigt wird, zum Beispiel auf einem gespiegelten Tablet.
   Sichtbare Breite: [Punkte] pt
   Sichtbare Höhe: [Punkte] pt
   Mindestschriftgröße: [Punkte] pt
   Farben:
   - [#RRGGBB: Bedeutung]
   ```

3. `CLAUDE.md` is a short German pointer: what the folder is, one line per file
   (`schulkontext.md`, `kriterien.md`, `onenote.md`, `material/`, `Stunden/`), and the commands
   `/unterricht:stunde-planen`, `/unterricht:stunde-ueberarbeiten`, `/unterricht:einrichten`.
4. Every template contains the sentence
   `Hier stehen keine Namen oder anderen persönlichen Daten von Schülerinnen und Schülern.`
5. Placeholders are text in square brackets. No template contains a lesson length, a class, a
   school, or any other real value.
6. Rule `templates`: each template exists with its required headings (`schulkontext.md`:
   `## Schule`, `## Zeitraster`, `## Phasenmodell`, `## Fächer und Klassen`,
   `## Ausstattung im Unterricht`, `## Was jede Planung beachten soll`; `kriterien.md`:
   `## Planung`, `## Tafelbild`, `### Muss`, `### Soll`; `onenote.md`: `## Ablage`, `## Ansicht`),
   the privacy sentence, and the lines `Stundenlänge: [Minuten eintragen] Minuten`, `Abschnitt: [`,
   and `Seitentitel: [`; `kriterien.md` contains
   `Die Phasen ergeben zusammen genau die Stundenlänge.` verbatim.
