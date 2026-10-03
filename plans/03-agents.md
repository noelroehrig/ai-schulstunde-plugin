# Plan 03: agents

Writes the four agents of `SPEC.md` section 5.4. Read `SPEC.md` sections 3, 5.4, 6, 8.3, 10, and
11.3 and all files in `plugin/skills/lesson-conventions/` first. Plans 01 and 02 are done.

Common rules for every phase:

- Frontmatter exactly as the `agents` rule of plan 01 requires and the example in `SPEC.md`
  section 10 shows: `name`, an English `description` that says when the orchestrator uses the
  agent, `tools` exactly from the permission table, `skills: lesson-conventions`, `model: inherit`,
  `omitClaudeMd: true`.
- The body is English. It starts with the mandated sentence of `SPEC.md` section 3; the two
  reviewers add the exception sentence right after it.
- The body has these sections in this order: `Inputs`, `Steps`, `Output`, `Stop`, `Result line`.
  Steps are numbered; step 1 reads `schulkontext.md`, step 2 reads `kriterien.md`.
- Agents follow `lesson-conventions` and refer to it; they do not restate its formats. The board
  agents read `${CLAUDE_PLUGIN_ROOT}/skills/lesson-conventions/board.md` (and the examples next to
  it) with the Read tool; that path is written in the agent body.
- An agent uses only the paths in its assignment, writes only its `output`, and ends with exactly
  one result line (`DONE ...` or `FAILED <German reason>`).
- Every mechanical requirement gets its check first. `npm run verify` passes at the end of every
  phase.

## Phase 1: planning agents

Files: `plugin/agents/lesson-planner.md`, `plugin/agents/plan-reviewer.md`,
`checks/rules/agent-bodies.ts`, and its test.

Acceptance criteria:

1. Rule `agent-bodies`, for each agent file that exists: the body contains the sections `Inputs`,
   `Steps`, `Output`, `Stop`, `Result line` in this order; `schulkontext.md` is mentioned before
   `kriterien.md`, and both before any other working-folder file name; the body contains `DONE` and
   `FAILED`; the body of `board-author` and `board-reviewer` contains
   `${CLAUDE_PLUGIN_ROOT}/skills/lesson-conventions/board.md`.
2. `lesson-planner`:
   - Reads `schulkontext.md`, `kriterien.md`, then `stunde.md` (Auftrag and Stundenlänge), then the
     other inputs of the assignment (previous plan, previous review, teacher feedback).
   - Uses `material/` only when the topic needs it (Glob, Grep, Read) and names the files used
     under `## Material`.
   - Writes the plan in the format of `lesson-conventions`. Phase names come from the Phasenmodell.
     Before writing, it adds up the durations itself; the sum must equal the Stundenlänge.
   - In a revision it fixes every Muss-Mangel of the previous review and every point of the teacher
     feedback, and keeps what was not criticized.
   - Stops with `FAILED <German reason>` and writes nothing when a listed input is missing or the
     Stundenlänge is not a number.
3. `plan-reviewer`:
   - Reads `schulkontext.md`, `kriterien.md`, `stunde.md`, the plan, the previous review, and the
     teacher feedback when listed.
   - Applies every Muss and Soll criterion of `kriterien.md`. A missing plan section, a Stundenlänge
     that differs from `stunde.md`, and an unaddressed point of the teacher feedback are
     Muss-Mängel. Every number criterion, the time sum included, gets its line under
     `## Nachrechnung`. `## Besondere Regeln` is checked against `schulkontext.md`.
   - Follows the review rules of `lesson-conventions` (previous Muss-Mängel, no oscillation,
     feedback conflicts as Soll-Hinweise).
   - Writes the review with the verdict token on line 1 and never changes the plan.

## Phase 2: board agents

Files: `plugin/agents/board-author.md`, `plugin/agents/board-reviewer.md`.

Acceptance criteria:

1. `board-author`:
   - Reads `schulkontext.md`, `kriterien.md`, `onenote.md` (Ansicht), the approved plan
     (`## Tafelbild (Inhalt)` and the phase order of `## Verlaufsplan`), the previous board review,
     the previous payload, and the teacher's guidance (`tafelbild-rueckmeldung_vM.md`) when listed,
     then `board.md` and the examples.
   - Builds the payload by the rules of `board.md`, checks `x + width`, font sizes, and colors
     against the Ansicht itself, fixes every Muss-Mangel of a previous board review, and addresses
     every point of the teacher's guidance. The self-check is a single pass: it corrects what it
     can without dropping, adding, or rewording an item of `## Tafelbild (Inhalt)`. A check that
     still does not hold is not looped on: the author writes the page anyway, the board reviewer
     reports it, and the board loop's cap and escalation decide (`SPEC.md` sections 6.4, 6.5).
   - With an empty `page_id`: `list_pages(section_id)` first, noting the IDs of the pages already
     titled `page_title`; then `create_page(section_id, page_title)`, then writes the payload to
     `output`, then `replace_page`. With a `page_id`: writes the payload, then `replace_page` on that
     page only. It never reads or writes any other page.
   - Error handling (`SPEC.md` section 11.3); the error code is found inside the text
     `Error executing tool <tool>: <code>: <message>`, and an error without a code counts as
     `bad_request`:
     - `timeout` on `create_page`: never retry blindly. `ping`, then `list_pages(section_id)`. A
       new page is one titled exactly `page_title` whose ID was not noted before the first
       `create_page`. Exactly one new page: use it. No new page: call `create_page` once more and,
       after another `timeout`, check the same way. More than one new page, or none after the
       second call: `FAILED` with a German reason that names the section and the title and asks the
       teacher to delete empty pages with that title before resuming. A page that existed before is
       never reused, because `replace_page` would delete the teacher's content on it.
     - At most two `create_page` calls per round, whatever the errors (a corrected call after a
       `bad_request` counts); when they are not enough, `FAILED` as above.
     - `timeout` or `backend_error` on `replace_page`: send the same payload once more; if that
       fails too, `FAILED` with a German reason that says the page may be empty.
     - `bad_request`: correct the call once; then `FAILED` with the error text.
   - Result line: `DONE <output path> page_id=<id>`.
2. `board-reviewer`:
   - Reads `schulkontext.md`, `kriterien.md`, `onenote.md`, the approved plan, the payload file, and
     the teacher's guidance when listed, then calls `get_page(page_id)` once. A tool error ends with
     `FAILED` and the error text, which contains the error code.
   - Checks as `board.md` and `SPEC.md` section 8.3 describe: on the read-back the structure (title,
     phase blocks in plan order, every item of `## Tafelbild (Inhalt)` present, nothing invented),
     German and glossary terms, brevity, `x + width` within the Breite (with its Nachrechnung), and
     that the text matches the payload; on the payload the font sizes, colors, and heading styles.
     A formatting difference between payload and read-back is never a finding (OneNote rewrites
     colors and moves paragraph formatting).
     The vertical estimate is reported as an estimate and is a Soll-Hinweis unless `kriterien.md`
     makes it a Muss-Kriterium.
   - Applies every Tafelbild criterion of `kriterien.md` and follows the review rules of
     `lesson-conventions`. An unaddressed point of the teacher's guidance is a Muss-Mangel; a
     conflict between the guidance and `kriterien.md` is a Soll-Hinweis.
   - Writes the review to `output` with the verdict token on line 1. It has no OneNote write tools
     and never changes the payload file.
3. With all four agents present, `npm run verify` passes, and the `agents` and `agent-bodies` rules
   report nothing.
