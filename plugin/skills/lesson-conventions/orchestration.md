# Orchestration

The shared procedure of the entry points `stunde-planen` and `stunde-ueberarbeiten`: the planning loop, the checkpoint, the OneNote gate, the board loop, escalation, failure handling, and the finish. Read it together with `SKILL.md` and `lesson-folder.md` of `lesson-conventions`. You run it in the main conversation; the agents run one level below you.

## Inputs

The entry point states these values before it tells you to follow this file:

- the plugin root: the absolute path of the plugin;
- the working folder: the absolute path of the teacher's working folder;
- the lesson folder: the absolute path of the lesson's folder in `Stunden/`, with its `stunde.md`;
- the `notebook` setting: the name of the OneNote notebook;
- the `plan_checkpoint` value: `true` or `false`.

The entry point also says where to start: a new lesson starts with the planning loop; a resumed or revised lesson starts at the step the entry point names, with the versions and round recorded in `## Stand` of `stunde.md`.

Read `lesson-folder.md` at `<plugin root>/skills/lesson-conventions/lesson-folder.md` before the first write to the lesson folder.

All paths in an assignment are absolute: the working folder or the lesson folder joined with the file name, with forward slashes.

## The state

`stunde.md` holds the state, in the format of `lesson-folder.md`. Keep it current, so that a new conversation can continue with `/unterricht:stunde-ueberarbeiten` at any point.

- After every agent run that ends with `DONE`, update `## Stand` and append one line to `## Verlauf` that names the file written, the loop and round, and, for a review, its verdict, for example `- 2026-10-07: review_v2.md geschrieben, Ergebnis REVISE (Planung, Runde 2 von 3).`
- `Planversion: N` means `planung_vN.md` is done. Its review counts as done only when `## Verlauf` records it with its verdict. The same holds for `Tafelbildversion: M` and `tafelbild-review_vM.md`.
- A versioned file with a higher number than `## Stand` records, or a review that `## Verlauf` does not record with its verdict, comes from an interrupted or failed agent run. It is never an input; the agent's next run, with the same `output` path, overwrites it (`lesson-folder.md`). A run once more after a protocol error therefore keeps the same `output`.
- Append a `## Verlauf` line as well when you save the teacher's feedback (naming the file, for example `- 2026-10-07: Rückmeldung als rueckmeldung_v3.md gespeichert.`), when the checkpoint passes, at an escalation answer, at a stop, and at the finish.

## Talking to the teacher

- Everything you say to the teacher is German. Use the wording quoted here where it is given.
- When you need the teacher's answer, ask in German and end your turn. The next message continues the procedure at that point.
- Read answers by meaning, not by exact spelling. `weiter`, `ja`, `passt`, or `ok` alone mean continue. An answer that asks for a change is feedback. When an answer is unclear, ask once more, briefly, and repeat the options.
- A write you propose happens only after a yes. On a no, ask what to change and propose again, or skip the step when the teacher says so.
- `Abbrechen`, or an answer that means it, at any question stops the procedure: set `Schritt: Abgebrochen`, append a `## Verlauf` line, keep every file and the page, and say `Abgebrochen. Alle Dateien bleiben im Ordner <Name des Stundenordners>. Mit /unterricht:stunde-ueberarbeiten kannst du diese Stunde später wieder aufnehmen.`

## Stopping

When this file says to stop:

1. Leave `Schritt` as it is, so that `/unterricht:stunde-ueberarbeiten` continues at this step. Keep every file and the page.
2. Append a `## Verlauf` line that names the reason.
3. Tell the teacher in German what happened, with the reason, and how to continue, for example `Ich habe angehalten: <Grund>. Die bisherigen Dateien bleiben im Ordner <Name des Stundenordners>. Wenn das Problem behoben ist, setze mit /unterricht:stunde-ueberarbeiten fort.`
4. End the procedure.

## Status lines

Before every agent run, print exactly one German status line in the form `<Planung | Tafelbild>, Runde <n> von 3: <was gerade passiert>.`, for example:

- `Planung, Runde 1 von 3: Der erste Entwurf wird geschrieben.`
- `Planung, Runde 2 von 3: Der Entwurf wird überarbeitet.`
- `Planung, Runde 2 von 3: Der Entwurf wird geprüft.`
- `Tafelbild, Runde 1 von 3: Das Tafelbild wird in OneNote angelegt.`
- `Tafelbild, Runde 2 von 3: Das Tafelbild wird überarbeitet.`
- `Tafelbild, Runde 2 von 3: Das Tafelbild wird geprüft.`

## Running an agent

1. Build the assignment in exactly the shape of `lesson-conventions`, with the keys `working_folder`, `lesson_folder`, `round`, `inputs`, `output`, and for the board agents `section_id`, `page_title`, `page_id`. The sections below give the inputs and the output of each run.
2. Print the status line.
3. Start the agent with the Agent tool. `subagent_type` is one of `unterricht:lesson-planner`, `unterricht:plan-reviewer`, `unterricht:board-author`, `unterricht:board-reviewer`. The prompt is exactly the assignment, nothing else.
4. Wait for the agent's final message and read it as the result line:
   - `DONE <path>`, where `<path>` is the `output` of the assignment: the run succeeded. The board author's line is `DONE <path> page_id=<id>`; take the page ID from it.
   - `FAILED <reason>`: stop as above, with a message that contains the reason and the resume hint, for example `Ich habe angehalten: <Grund>. Wenn das Problem behoben ist, setze mit /unterricht:stunde-ueberarbeiten fort.` The one exception is the read timeout of the board reviewer (see Failure handling).
   - Anything else is a protocol error, also a `DONE` with another path, or a board author's line without `page_id=`. Run the same agent once more with the same assignment, followed by one line: `Reminder: your final message must be exactly one line, DONE <output path> or FAILED <reason>, as lesson-conventions defines.` Use `DONE <output path> page_id=<id>` in the reminder for the board author. If the second final message is not a valid result line either, stop with `Ich habe angehalten, weil ein Arbeitsschritt kein gültiges Ergebnis gemeldet hat (<Agent>, Runde <n>). Bitte setze mit /unterricht:stunde-ueberarbeiten fort.`
5. Board author with an empty `page_id`, before you run it once more after a protocol error: if its `output` file exists and holds a `page_id`, the page was created. Record that ID as `Seiten-ID` in `stunde.md` and put it into the assignment of the second run, so that no second page is created.

## Reading a verdict

After a reviewer returns `DONE`:

1. Read line 1 of the review only: the Read tool with `limit: 1`.
2. Strip a UTF-8 BOM, trailing spaces, and a trailing CR.
3. `APPROVED` or `REVISE` decide. Any other value is a protocol error: handle it like a bad result line, running the reviewer once more with the same assignment and the reminder `Reminder: line 1 of the review must be exactly APPROVED or REVISE.`, and stop with the German message above on the second failure.

Never infer a verdict from the review text. Read the whole review only to escalate.

## Planning loop

The loop has a cap of 3 rounds. N is the plan version: `Planversion` plus 1, or 1 when there is none. N counts across the whole lesson and never restarts (`lesson-folder.md`).

A loop starts at round 1 in three cases: a new lesson, the teacher's feedback at the checkpoint, and `Ich gebe Hinweise` at the planning cap. In the last two cases the feedback is saved as `rueckmeldung_vN.md` before the loop starts (see Checkpoint), and this loop is a loop after teacher input.

Set `Schritt: Planung` and `Runde: <n> von 3` in `## Stand` at the start of every round. Then, for round n:

1. Run `unterricht:lesson-planner`:
   - `round`: `<n> of 3`.
   - `inputs`, in this order: `schulkontext.md`, `kriterien.md`, `stunde.md`; in every round after round 1, and in every round of a loop after teacher input, also `planung_v<N-1>.md` and `review_v<N-1>.md`; in every round of a loop after teacher input, also the `rueckmeldung_vK.md` that started this loop.
   - `output`: `planung_vN.md` in the lesson folder.
2. Update `## Stand` (`Planversion: N`) and `## Verlauf`.
3. Run `unterricht:plan-reviewer`:
   - `round`: `<n> of 3`.
   - `inputs`, in this order: `schulkontext.md`, `kriterien.md`, `stunde.md`, `planung_vN.md`, then the previous plan, the previous review, and the `rueckmeldung_vK.md` exactly as the planner got them in this round.
   - `output`: `review_vN.md` in the lesson folder.
4. Read the verdict of `review_vN.md`. Append it to `## Verlauf`.
5. `APPROVED`: leave the loop and go to the checkpoint.
6. `REVISE` in round 1 or 2: N becomes N plus 1, n becomes n plus 1, and the next round starts.
7. `REVISE` in round 3: escalate (see Escalation). The escalation replaces the checkpoint question.

## Checkpoint

When `plan_checkpoint` is `false`, skip the checkpoint: the plan is approved, go on as after `weiter`. Any other value, `true` included, runs it:

1. Set `Schritt: Prüfpunkt` and append a `## Verlauf` line.
2. Read the approved `planung_vN.md` and show the teacher a short German summary: Stundenthema, Lernziele, and the phases of the Verlaufsplan with their minutes. Name the path of `planung_vN.md`.
3. Ask exactly: `Passt der Plan so? Antworte mit „weiter“, oder schreib, was geändert werden soll.` End your turn.
4. Read the answer:
   - Continue (`weiter`, `ja`, `passt`, `ok`): set `Freigegebener Plan: planung_vN.md`, append a `## Verlauf` line, and go to the OneNote gate.
   - Feedback: save the teacher's words verbatim, unchanged, as `rueckmeldung_v<N+1>.md` in the lesson folder, under the heading `# Rückmeldung zu planung_vN.md`. Append a `## Verlauf` line. Then start a new planning loop at round 1, with a fresh cap of 3 and N plus 1, as a loop after teacher input.
   - `Abbrechen`: abort as above.
   - Unclear: ask once more.

## OneNote gate

Before the board loop, check, in this order. When you come to the gate from the checkpoint or the planning escalation, the board loop starts fresh: first set `Schritt: Tafelbild`, `Runde: 1 von 3`, and `Freigegebener Plan`. When you resume a board loop (`Schritt` was already `Tafelbild`), change nothing in `## Stand`: the gate only rebuilds `section_id`, and the loop continues with the recorded round and versions (see Resuming a loop). The OneNote tools of the main session are `mcp__plugin_unterricht_onenote__ping` and `mcp__plugin_unterricht_onenote__get_notebooks`.

1. The `notebook` setting is not blank and has no comma. Otherwise stop before any OneNote call, with `Die Einstellung „OneNote-Notizbuch“ ist leer oder enthält ein Komma. Trag dort mit /config genau den Namen eines Notizbuchs ein. Setze dann mit /unterricht:stunde-ueberarbeiten fort.`
2. Call `ping`. When it reports `onenote_responsive: true`, go on. When it reports `onenote_responsive: false`, ask `OneNote reagiert gerade nicht. Bitte öffne OneNote und schließe alle offenen Dialoge. Antworte dann mit „weiter“.` and end your turn. After the answer, call `ping` once more; when it still reports `onenote_responsive: false`, stop and say that the plan is kept and that the board can be made later with `/unterricht:stunde-ueberarbeiten`.
3. Call `get_notebooks`. The notebook whose name is exactly the `notebook` setting, case-sensitive, must be in the list. Otherwise stop before writing, with `Das Notizbuch „<notebook>“ wurde in OneNote nicht gefunden. Der Name muss genau stimmen, auch bei Groß- und Kleinschreibung. Du kannst ihn mit /config in der Einstellung „OneNote-Notizbuch“ ändern. Ich lege nie ein Notizbuch an.`
4. The section: read `Abschnitt` under `## Ablage` in `onenote.md`. `Abschnitt: Klasse` means the section named exactly like the `Klasse` in `## Auftrag` of `stunde.md`; any other value is the section name itself. When `## OneNote` of `stunde.md` already records an `Abschnitt` other than `offen`, use that one. The section must be one of the notebook's sections in the `get_notebooks` answer, with exactly that name; note its ID as `section_id`. When it is missing, ask `Im Notizbuch „<notebook>“ gibt es keinen Abschnitt „<Abschnitt>“. Bitte lege ihn in OneNote an und antworte mit „weiter“, oder nenne einen anderen vorhandenen Abschnitt.` and end your turn. Then call `get_notebooks` again and check again, with the section the teacher named, if any. Never create a section, and never change `onenote.md`.
5. The page title: when `## OneNote` of `stunde.md` already records a `Seitentitel` other than `offen`, use it. Otherwise fill the `Seitentitel` scheme of `## Ablage` in `onenote.md`: `JJJJ-MM-TT` is the lesson date when `stunde.md` names one, else the date the lesson folder name starts with, else today; `Klasse` and `Thema` come from `## Auftrag` of `stunde.md`. Keep every other text of the scheme as it is.
6. When the board loop starts fresh, record `Abschnitt` and `Seitentitel` in `## OneNote` of `stunde.md` and append a `## Verlauf` line. On a resumed board loop, write nothing to `stunde.md` here.

A `get_notebooks` error is handled as Failure handling says.

## Board loop

The loop has a cap of 3 rounds. M is the board version: `Tafelbildversion` plus 1, or 1 when there is none. Board versions count separately from plan versions and never restart. `page_id` is the `Seiten-ID` of `stunde.md`, or empty when it is `keine`.

A fresh loop starts at round 1 after the OneNote gate; a resumed loop continues at the recorded round (see Resuming a loop). A loop also starts at round 1 after `Ich gebe Hinweise` at the board cap; in that case the guidance is saved as `tafelbild-rueckmeldung_vM.md` before the loop starts (see Escalation), and this loop is a loop after teacher guidance. It keeps the same page.

Set `Runde: <n> von 3` in `## Stand` at the start of every round. The board agents get `section_id`, `page_title` (the `Seitentitel`), and `page_id` in every assignment. Then, for round n:

1. Run `unterricht:board-author`:
   - `round`: `<n> of 3`.
   - `inputs`, in this order: `schulkontext.md`, `kriterien.md`, `onenote.md`, the approved plan (`Freigegebener Plan`); in every round after round 1, and in every round of a loop after teacher guidance, also `tafelbild_v<M-1>.json` and `tafelbild-review_v<M-1>.md`; in every round of a loop after teacher guidance, also the `tafelbild-rueckmeldung_vK.md` that started this loop.
   - `output`: `tafelbild_vM.json` in the lesson folder.
   - `page_id`: empty in the first round on a new page, else the recorded page ID.
2. When `page_id` was empty, write the `page_id` of the result line as `Seiten-ID` into `## OneNote` of `stunde.md` now, before the reviewer runs. When `page_id` was given and the result line names another ID, it is a protocol error.
3. Update `## Stand` (`Tafelbildversion: M`) and `## Verlauf`.
4. Run `unterricht:board-reviewer`:
   - `round`: `<n> of 3`.
   - `inputs`, in this order: `schulkontext.md`, `kriterien.md`, `onenote.md`, the approved plan, `tafelbild_vM.json`, and the `tafelbild-rueckmeldung_vK.md` when the author got one in this round.
   - `output`: `tafelbild-review_vM.md` in the lesson folder.
   - `page_id`: the recorded page ID.
5. Read the verdict of `tafelbild-review_vM.md`. Append it to `## Verlauf`.
6. `APPROVED`: leave the loop and finish.
7. `REVISE` in round 1 or 2: M becomes M plus 1, n becomes n plus 1, and the next round starts on the same page.
8. `REVISE` in round 3: escalate.

## Resuming a loop

When the entry point resumes a lesson with `Schritt: Planung` or `Schritt: Tafelbild`, never reset `Runde` and never start a fresh cap. Take the state from `## Stand`, `## Verlauf`, and the files of the lesson folder; which line of `## Verlauf` comes last does not matter, because stops and other steps append lines too. Below, V is `Planversion` (planning loop) or `Tafelbildversion` (board loop), `keine` counting as 0; the review is `review_vV.md` or `tafelbild-review_vV.md`; the guidance file of version K is `rueckmeldung_vK.md` or `tafelbild-rueckmeldung_vK.md`.

Decide where to continue, checking in this order:

1. The guidance file of version V plus 1 exists and `## Verlauf` records it as saved: the teacher's feedback or guidance was saved, and its loop has not written a version yet. Start the loop after teacher input at round 1 with version V plus 1, as after saving it, even when `## Verlauf` records the review of version V with its verdict.
2. V is 0: run the first agent of the loop in round 1 with version 1.
3. The review of version V is not recorded in `## Verlauf` with its verdict: run the reviewer on version V, in the round named in the `## Verlauf` line that records version V as written.
4. The review of version V is recorded with its verdict: apply the verdict as steps 5 to 7 of the planning loop or steps 6 to 8 of the board loop say, with the round named in that `## Verlauf` line.

Inputs of a resumed round: a round n that works on version W belongs to a loop after teacher input exactly when the guidance file of version W minus n plus 1 (the first version of that loop) exists and `## Verlauf` records it as saved. That file is the `rueckmeldung_vK.md` or `tafelbild-rueckmeldung_vK.md` of every round of the loop; pass it in every round of the loop, exactly as the planning loop and the board loop say. Otherwise the loop is not after teacher input. For example, a resumed round 2 that writes `planung_v4.md` gets `rueckmeldung_v3.md` when it was saved, besides `planung_v3.md` and `review_v3.md`.

`Schritt: Prüfpunkt` resumes at step 2 of the checkpoint.

## Escalation

At the cap of either loop:

1. Read the last review fully: `review_vN.md` in the planning loop, `tafelbild-review_vM.md` in the board loop.
2. Show the teacher, in German, the open Muss-Mängel from its `## Muss-Mängel`, and offer the three options, for example:

   ```
   Nach 3 Runden sind in <planung_vN.md | tafelbild_vM.json> noch diese Muss-Mängel offen:
   1. <Mangel>

   Wie möchtest du weitermachen?
   - „So übernehmen“: Ich übernehme den Stand so und notiere die Mängel in stunde.md.
   - „Ich gebe Hinweise“: Schreib dazu, was geändert werden soll. Dann starte ich neu mit bis zu 3 Runden.
   - „Abbrechen“: Ich höre auf. Alle Dateien bleiben, wie sie sind.
   ```

   End your turn. In the planning loop this is the only question: it replaces the checkpoint question.
3. Read the answer:
   - `So übernehmen`: write the open Muss-Mängel under `## Übernommene Mängel` of `stunde.md`, each with the file it belongs to, replacing `- keine`. Append a `## Verlauf` line. In the planning loop, set `Freigegebener Plan: planung_vN.md` and go to the OneNote gate; the checkpoint is not asked. In the board loop, finish.
   - `Ich gebe Hinweise`, or an answer that asks for changes: when the answer holds no guidance yet, ask for it. Save the teacher's guidance verbatim, unchanged, in the lesson folder: in the planning loop as `rueckmeldung_v<N+1>.md` under the heading `# Rückmeldung zu planung_vN.md`; in the board loop as `tafelbild-rueckmeldung_v<M+1>.md` under the heading `# Rückmeldung zu tafelbild_vM.json` (the number is the board version the guidance leads to). Append a `## Verlauf` line. Then the loop starts again at round 1 with a fresh cap of 3, N or M plus 1, as a loop after teacher input or teacher guidance.
   - `Abbrechen`: abort as above. Files and page stay as they are.
   - Unclear: ask once more.

## Failure handling

The rows of `SPEC.md` section 11.3 that concern you. An error of a OneNote tool arrives as `Error executing tool <tool>: <code>: <message>`: find the code inside the text. An error without a code counts as `bad_request`. Every stop here keeps the plan and the files.

- `onenote_responsive: false` before the board loop: as in step 2 of the OneNote gate.
- `timeout` on your own read (`get_notebooks`): say `OneNote ist gerade beschäftigt oder zeigt einen Dialog. Ich versuche es gleich noch einmal.`, call `ping`, and call the tool once more. On a second failure, stop the board loop, keep the plan, and explain how to resume with `/unterricht:stunde-ueberarbeiten`.
- `FAILED` from `unterricht:board-reviewer` whose reason contains the code `timeout`: the read timeout. Say `OneNote ist gerade beschäftigt oder zeigt einen Dialog. Bitte schließe offene Dialoge in OneNote. Ich versuche es gleich noch einmal.`, call `ping`, and run the reviewer once more with the same assignment, with its status line. When the second run returns `FAILED` again, stop the board loop, keep the plan, and explain how to resume with `/unterricht:stunde-ueberarbeiten`.
- `FAILED` from `unterricht:board-author` (a `create_page` or `replace_page` failure, or any other): stop as Running an agent says. The reason already tells the teacher what to check.
- A `backend_error` saying that OneNote is not registered or not installed: stop with `Für das Tafelbild brauche ich die OneNote-Desktop-App für Windows. Bitte installiere sie, melde dich an und setze dann mit /unterricht:stunde-ueberarbeiten fort.`
- Any other `backend_error` on your own call: stop the board loop, show the error text, keep the plan, and explain how to resume.
- `bad_request` on your own call: a plugin bug. Stop, show the error text, and ask the teacher to forward it to the maintainer of the plugin.
- `notebook` blank or with a comma: step 1 of the OneNote gate.
- Configured notebook not found: step 3 of the OneNote gate.
- Target section missing: step 4 of the OneNote gate.

## Finish

1. Set `Schritt: Fertig` and append a `## Verlauf` line.
2. Tell the teacher, in German:
   - the path of the final plan (`Freigegebener Plan`);
   - where the page is: notebook, Abschnitt, and Seitentitel;
   - the Mängel accepted at a cap, from `## Übernommene Mängel`, or that there are none;
   - the reminder to open the page once on the device used in class before the lesson, so that OneNote has synced it.

   For example:

   ```
   Fertig. Der Plan liegt in <Pfad zu planung_vN.md>.
   Das Tafelbild steht in OneNote: Notizbuch „<notebook>“, Abschnitt „<Abschnitt>“, Seite „<Seitentitel>“.
   Übernommene Mängel: <Liste oder „keine“>.
   Bitte öffne die Seite vor der Stunde einmal auf dem Gerät, mit dem du sie zeigst, damit OneNote sie dort synchronisiert hat.
   ```
