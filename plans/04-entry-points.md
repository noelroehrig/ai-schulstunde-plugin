# Plan 04: orchestration and entry points

Writes the shared orchestration procedure and the three entry points `einrichten`,
`stunde-planen`, and `stunde-ueberarbeiten`, plus `README.md` and `CHANGELOG.md`. Read `SPEC.md`
sections 3, 5.3, 6, 8.1, 9, 10, 11.3, and 12 and all files in `plugin/skills/lesson-conventions/`
and `plugin/agents/` first. Plans 01 to 03 are done.

Common rules for every phase:

- Instruction text is English. Every question, status line, and message to the teacher is German
  and quoted in the instructions where this plan gives its exact wording.
- The entry-point skills have a German `description` and `argument-hint` (the teacher sees them in
  the `/` menu) and `disable-model-invocation: true`.
- `${CLAUDE_PLUGIN_ROOT}` and `${user_config.*}` appear only in the entry-point `SKILL.md` files.
  `orchestration.md` is read by path and contains no `${...}`; the entry point states the values it
  needs (plugin root, notebook setting, `plan_checkpoint`) before telling Claude to follow it.
- Agents are started with the Agent tool, `subagent_type` `unterricht:lesson-planner`,
  `unterricht:plan-reviewer`, `unterricht:board-author`, or `unterricht:board-reviewer`, and a
  prompt that is exactly the assignment of `lesson-conventions` with absolute paths.
- When the procedure needs the teacher's answer, Claude asks in German and ends its turn; the skill
  stays in the conversation, and `stunde.md` holds the state, so the next message continues the
  procedure and a new conversation can resume with `stunde-ueberarbeiten`.
- Every mechanical requirement gets its check first. `npm run verify` passes at the end of every
  phase.

## Phase 1: `orchestration.md`

Files: `plugin/skills/lesson-conventions/orchestration.md`,
`plugin/skills/lesson-conventions/lesson-folder.md` and the working-folder list in
`plugin/skills/lesson-conventions/SKILL.md` (the board guidance file of AC8),
`checks/rules/orchestration.ts`, and its test.

Acceptance criteria:

1. **Inputs it expects** from the entry point: the plugin root, the working folder, the lesson
   folder, the `notebook` setting, and the `plan_checkpoint` value.
2. **Running an agent:** the assignment (keys as in `lesson-conventions`), then waiting for the
   result line. `FAILED <reason>` stops the procedure with a German message that contains the
   reason and the resume hint (`/unterricht:stunde-ueberarbeiten`), except the board reviewer's
   read timeout (AC9). Any other final message is a
   protocol error: run the agent once more with a reminder of the result line, and stop with a
   German message on the second failure.
3. **Reading a verdict:** read line 1 of the review only (Read with `limit: 1`); strip a UTF-8 BOM,
   trailing spaces, and a trailing CR; `APPROVED` or `REVISE` decide; anything else is a protocol
   error handled like a bad result line. Never infer a verdict from the review text. Read the whole
   review only to escalate.
4. **Planning loop** exactly as `SPEC.md` section 6.2: round 1 to 3, versions as in
   `lesson-folder.md`, the inputs of each round. Planner: round 1 of a new lesson gets
   `schulkontext.md`, `kriterien.md`, `stunde.md`; every later round, and round 1 of a loop that
   starts after teacher input (checkpoint feedback or `Ich gebe Hinweise`), also gets the previous
   plan and its review, and after teacher input the `rueckmeldung_vN.md` that holds it. Reviewer:
   the same files plus the plan it judges. After every agent run, update `## Stand` and append to
   `## Verlauf` in `stunde.md`.
5. **Checkpoint** exactly as `SPEC.md` section 6.3, skipped when `plan_checkpoint` is `false`. The
   question is exactly `Passt der Plan so? Antworte mit „weiter“, oder schreib, was geändert werden soll.`
   Feedback is saved verbatim as `rueckmeldung_vN.md` under the heading
   `# Rückmeldung zu planung_v<N-1>.md` and starts a new planning loop with a fresh cap. After a
   planning loop that ended at its cap, the escalation replaces the checkpoint question.
6. **OneNote gate** (`SPEC.md` sections 6.1 and 11.3): the `notebook` setting is not blank and has
   no comma; `ping` reports `onenote_responsive: true`; `get_notebooks` contains a notebook with
   exactly that name; the section comes from `onenote.md` (`Abschnitt: Klasse` means the section
   named exactly like the class, any other value is the section name) and must exist; the page title
   follows `Seitentitel` (`JJJJ-MM-TT` is the lesson date or today, `Klasse` and `Thema` from
   `stunde.md`). A missing section: ask the teacher to create it in OneNote or name another, then
   check again.
7. **Board loop** exactly as `SPEC.md` section 6.4. Board versions count separately; the
   `page_id` from round 1's result line goes into `stunde.md` before the reviewer runs. Author:
   `schulkontext.md`, `kriterien.md`, `onenote.md`, and the approved plan; later rounds also the
   previous `tafelbild_vM.json` and `tafelbild-review_vM.md`, and after teacher guidance the
   `tafelbild-rueckmeldung_vM.md` that holds it. Reviewer: `schulkontext.md`, `kriterien.md`,
   `onenote.md`, the approved plan, the payload it judges, and the guidance file when there is one.
8. **Escalation** exactly as `SPEC.md` section 6.5: show the open Muss-Mängel of the last review in
   German and offer exactly `So übernehmen`, `Ich gebe Hinweise`, `Abbrechen`. Accepted Mängel go to
   `## Übernommene Mängel`. Guidance is saved verbatim like checkpoint feedback: in the planning
   loop as `rueckmeldung_vN.md`, in the board loop as `tafelbild-rueckmeldung_vM.md` under the
   heading `# Rückmeldung zu tafelbild_v<M-1>.json` (M is the board version it leads to). Then
   the loop starts again with a fresh cap. `lesson-folder.md` and the working-folder list in
   `SKILL.md` name the board guidance file and its version rule.
9. **Failure handling:** the rows of `SPEC.md` section 11.3 that concern the orchestrator. A
   `FAILED` result of the board reviewer whose reason contains the code `timeout` is the read
   timeout of section 11.3: tell the teacher that OneNote is busy or shows a dialog, `ping`, run the
   reviewer once more with the same assignment; a second failure stops the board loop, keeps the
   plan, and explains how to resume.
10. **Status lines:** one German line before every agent run, in the form
    `<Planung | Tafelbild>, Runde <n> von 3: <was gerade passiert>.`, for example
    `Planung, Runde 2 von 3: Der Entwurf wird überarbeitet.`
11. **Finish:** the German summary of `SPEC.md` section 6.1 step 7, and `Schritt: Fertig`.
12. Rule `orchestration`: `orchestration.md` contains the checkpoint question, the three
    escalation labels, the four `unterricht:` agent types, `APPROVED`, `REVISE`, `DONE`, `FAILED`,
    and `onenote_responsive`, each verbatim.

## Phase 2: `stunde-planen`

Files: `plugin/skills/stunde-planen/SKILL.md`, the entry-point part of
`checks/rules/orchestration.ts`, and its test.

Acceptance criteria:

1. Frontmatter: German `description` (plans a new lesson with both review loops and the board in
   OneNote), `argument-hint: <Thema, Klasse, Hinweise>`, `disable-model-invocation: true`.
2. The body states `Plugin root: ${CLAUDE_PLUGIN_ROOT}`, `OneNote notebook: ${user_config.notebook}`,
   `Plan checkpoint: ${user_config.plan_checkpoint}`, and `Request: $ARGUMENTS`.
3. **Preflight, no writes** (`SPEC.md` section 6.1): `schulkontext.md` and `kriterien.md` exist
   (otherwise tell the teacher to run `/unterricht:einrichten`); the Stundenlänge is a number, not
   the placeholder; `Abschnitt` and `Seitentitel` in `onenote.md` are filled; each failure names the
   file and line in German. Topic and class come from the request; ask for whatever is missing. A
   request like `nur 45 Minuten` overrides the Stundenlänge. `ping`: warn when
   `onenote_responsive` is false, and continue.
4. Creates the lesson folder and `stunde.md` as `lesson-folder.md` defines, then reads
   `${CLAUDE_PLUGIN_ROOT}/skills/lesson-conventions/orchestration.md` and follows it with the stated
   values.
5. Rule `orchestration` (entry-point part): the `SKILL.md` of `stunde-planen` and
   `stunde-ueberarbeiten` reference `${CLAUDE_PLUGIN_ROOT}/skills/lesson-conventions/orchestration.md`,
   `${user_config.notebook}`, and `${user_config.plan_checkpoint}`.

## Phase 3: `stunde-ueberarbeiten`

Files: `plugin/skills/stunde-ueberarbeiten/SKILL.md`.

Acceptance criteria:

1. Frontmatter: German `description` (continues an interrupted lesson or revises a finished one),
   `argument-hint: [Stunde] [Änderungen]`, `disable-model-invocation: true`. The body states the
   same values as `stunde-planen` and runs the same preflight.
2. Without a lesson in the arguments, it lists the lessons in `Stunden/` (folder name, `Schritt`,
   last `Verlauf` date) and asks which one.
3. **Resume** when `Schritt` is `Planung`, `Prüfpunkt`, or `Tafelbild`: continue at that step with
   the stored versions and round. An interrupted board loop continues on the page in `stunde.md`.
4. **Revise** when `Schritt` is `Fertig` or `Abgebrochen`: the teacher's changes (from the
   arguments, or asked for) become the next `rueckmeldung_vN.md`; then planning loop with a fresh
   cap, checkpoint, and a board loop on a **new** page. The finished page is never replaced
   (`SPEC.md` section 6.6). At the end, tell the teacher the title of the old page to delete in
   OneNote.
5. Follows `orchestration.md` like `stunde-planen`.

## Phase 4: `einrichten`

Files: `plugin/skills/einrichten/SKILL.md`.

Acceptance criteria:

1. Frontmatter: German `description` (sets up or checks the working folder), no `argument-hint`,
   `disable-model-invocation: true`. The body states `Plugin root: ${CLAUDE_PLUGIN_ROOT}` and
   `OneNote notebook: ${user_config.notebook}`.
2. Steps of `SPEC.md` section 5.3, in order:
   - Shows the current folder and asks for confirmation.
   - Copies each missing template from `${CLAUDE_PLUGIN_ROOT}/templates/` and creates `material/` and
     `Stunden/`. It never overwrites; it lists what already existed.
   - Asks for the values the templates need (school, Stundenlänge, Phasenmodell, special rules,
     classes, criteria) or takes them from pasted Claude project instructions, shows the resulting
     change, and writes it only after a yes.
   - OneNote: checks the `notebook` setting (blank or comma: explain in German how to change it),
     `ping`, `get_notebooks`, `list_pages` per section; drafts the Ablage of `onenote.md` from the
     sections and existing page titles; writes it after a yes.
   - Asks whether the board is shown on a fixed visible area. Only then: calibration. It asks which
     section to use, creates the page `Kalibrierung Ansicht` with `create_page` and fills it with
     `replace_page`: outlines with the labels `100`, `200`, ... at `x` = 100, 200, ... up to 2000 on
     the top row, and at `y` = 100, 200, ... up to 1500 down the left edge. The teacher reports the
     last fully visible label in each direction; Breite and Höhe go into `onenote.md` with the
     Mindestschriftgröße and colors the teacher names, after a yes. It reminds the teacher to delete
     the calibration page.
   - Offers the allow rules of `SPEC.md` section 10 for `.claude/settings.json`: shows them, merges
     them into an existing file without removing anything, and writes only after a yes.
   - Ends with a German summary of what is set up, what is missing, and the commands.
3. Running it again in a set-up folder changes nothing without a yes and reports the state, so it
   works as a health check.
4. Rule `orchestration` gains: the `SKILL.md` of `einrichten` contains every allow rule of
   `SPEC.md` section 10 verbatim.

## Phase 5: README and CHANGELOG

Files: `README.md`, `CHANGELOG.md`, `checks/rules/docs.ts`, and its test.

Acceptance criteria:

1. `README.md` is German and written for teachers: what the plugin does; prerequisites; installation
   as in `SPEC.md` section 12.1, adding the marketplace `noelroehrig/schulstunde-plugin` in
   claude.ai; the first steps; the three commands with one sentence each; how the two loops and the
   checkpoint work, briefly; where files go; the privacy note; troubleshooting (OneNote shows a
   dialog, the notebook name must match exactly, a missing section, permission prompts); updates
   (restart the app). A last line points developers to `SPEC.md`.
2. `CHANGELOG.md` is German: `# Änderungen`, then `## 0.1.0 (<build date>)` with a short list of
   what this version can do.
3. Rule `docs`: `README.md` contains the three commands and `noelroehrig/schulstunde-plugin`;
   `CHANGELOG.md` has an entry for the `version` in `plugin.json`.
4. `npm run verify` passes, and `npm run verify:release` fails with exactly one finding: the server
   is not vendored. Record that output in the commit message body.
