# Orchestration

The shared procedure of the entry points `stunde-planen` and `stunde-ueberarbeiten`: the settings, the notebook, the planning loop, the checkpoint, a OneNote server that is not running, the OneNote gate, the board loop, the board checkpoint, escalation, failure handling, and the finish. Read it together with `<plugin root>/skills/lesson-conventions/SKILL.md`, which defines the assignment shape and the conventions, and `lesson-folder.md` of `lesson-conventions`. You run it in the main conversation; the agents run one level below you.

## Inputs

The entry point states these values before it tells you to follow this file:

- the plugin root: the absolute path of the plugin;
- the working folder: the absolute path of the teacher's working folder;
- the lesson folder: the absolute path of the lesson's folder in `Stunden/`, with its `stunde.md`;
- the `plan_checkpoint` value: `true` or `false`;
- the `board_checkpoint` value: `true` or `false`;
- the `planning_model` value: the model setting of the planning agents;
- the `board_model` value: the model setting of the board agents.

The entry point read the last four from `einstellungen.md` and checked them in its preflight, as Settings says.

Once `stunde.md` holds the state the entry point wrote, decide the next step as Next step says, from `## Stand` of `stunde.md` only.

Read `lesson-folder.md` at `<plugin root>/skills/lesson-conventions/lesson-folder.md` before the first write to the lesson folder.

All paths in an assignment are absolute: the working folder or the lesson folder joined with the file name, with forward slashes.

## The state

`stunde.md` holds the whole state in `## Stand` and `## OneNote`, in the format and with the meaning of each line that `lesson-folder.md` gives. Keep it current, so that a new conversation can continue with `/unterricht:stunde-ueberarbeiten` at any point.

- Read state only from `## Stand` and `## OneNote`. Never read `## Verlauf` to decide a step: it is a log for the teacher, written but never read. Never decide a step from which files exist or which file is newest.
- Below, N is `Planversion` and M is `Tafelbildversion`, `keine` counting as 0. The recorded draft is `planung_vN.md` in the planning loop and `tafelbild_vM.json` in the board loop; its review is `review_vN.md` or `tafelbild-review_vM.md` with the same number.
- Change `## Stand` and `## OneNote` only by the writes of this table. Each write is a single edit of `stunde.md`, made only after its step completed. Then append one line to `## Verlauf` that says what happened, for example `- 2026-10-07: review_v2.md geschrieben, Ergebnis REVISE (Planung, Runde 2 von 3).`

| Event | Written together |
|---|---|
| Lesson created | all lines of `## Stand` and `## OneNote`; `Schritt: Planung`, `Runde: 0 von 3`, the rest `keine`, `keiner`, or `offen` |
| Author returned `DONE` in round n | `Runde: <n> von 3`, `Planversion` or `Tafelbildversion`; in board round 1 without a `page_id` also `Seiten-ID` |
| Planning verdict `APPROVED` read | `Prüfbericht`, `Freigegebener Plan`, `Schritt: Prüfpunkt` |
| Board verdict `APPROVED` read | `Prüfbericht`, and `Schritt: Tafelbild-Prüfpunkt`, or `Schritt: Fertig` when the `board_checkpoint` value is `false` |
| Verdict `REVISE` read | `Prüfbericht` only |
| Teacher feedback at the checkpoint, or `Ich gebe Hinweise` in the planning loop | the saved file as `Rückmeldung`, `Schritt: Planung`, `Runde: 0 von 3` |
| Teacher feedback at the board checkpoint | the saved file as `Rückmeldung`, `Schritt: Tafelbild`, `Runde: 0 von 3` |
| `Ich gebe Hinweise` in the board loop | the saved file as `Rückmeldung`, `Runde: 0 von 3` |
| `weiter` at the board checkpoint, or `Schritt: Tafelbild-Prüfpunkt` while the `board_checkpoint` value is `false` | `Schritt: Fertig` |
| `So übernehmen` | the accepted Mängel under `## Übernommene Mängel`, then in the planning loop as after `APPROVED`, in the board loop `Schritt: Fertig`; the OneNote gate or the finish follows directly, because escalation and checkpoint are one question |
| OneNote gate passed | `Schritt: Tafelbild`, `Runde: 0 von 3`, `Rückmeldung: keine`, `Abschnitt`, `Elternseite`, `Seitentitel`; `Seiten-ID: keine` when the gate found the recorded page gone |
| `Abbrechen` | `Schritt: Abgebrochen` |

- `Seiten-ID` gets an ID only from the `page_id=` of a board author's `DONE` line, never from a file or another source.
- Writing teacher input: save the teacher's words verbatim, unchanged, as `rueckmeldung_v<N+1>.md` under the heading `# Rückmeldung zu planung_vN.md`, or as `tafelbild-rueckmeldung_v<M+1>.md` under the heading `# Rückmeldung zu tafelbild_vM.json`. Then make the write of the table.
- A versioned file that `## Stand` does not record (as draft, `Prüfbericht`, `Rückmeldung`, or `Freigegebener Plan`) comes from an interrupted agent run: it is never an input, and the agent's next run writes the same path again. This is the only case in which a versioned file is overwritten.
- A `stunde.md` of plugin 0.3.0 lacks the lines `Anhänge` and `Elternseite`. A missing one counts as `keine`, as `lesson-folder.md` says, and is never a reason to stop.

## Next step

At a resume, and after every write, decide the next step from the lines of `## Stand` and `## OneNote` only, checking in this order:

1. `Schritt: Prüfpunkt`: ask the checkpoint question again (see Checkpoint), or go to the OneNote gate when `plan_checkpoint` is `false`. Right after `So übernehmen` in the planning loop, go to the OneNote gate directly: the escalation was the checkpoint question.
2. `Schritt: Tafelbild-Prüfpunkt`: ask the board checkpoint question again (see Board checkpoint), or, when `board_checkpoint` is `false`, write `Schritt: Fertig` and finish.
3. `Schritt` `Planung` or `Tafelbild` with `Runde: 0 von 3`: the author of round 1 runs.
4. `Prüfbericht` is not the review of the recorded draft: the reviewer of round `Runde` runs.
5. `Prüfbericht` is the review of the recorded draft: read its verdict again from line 1 (see Reading a verdict). `REVISE` with `Runde` below 3: the author of round `Runde + 1` runs. `REVISE` with `Runde: 3 von 3`: the escalation question is asked.
6. A resume never starts a fresh cap: `Runde` is never reset except by the writes of the table.
7. A board loop needs `Schritt: Tafelbild`, which exists only after the gate passed, so a stopped gate leaves `Prüfpunkt` and a resume runs the gate again. A resumed board loop resolves its OneNote IDs first, as OneNote gate says: `section_id` from the recorded `Abschnitt` name; if that section no longer exists, it stops with a German message instead of choosing another section. It keeps `Seitentitel` and `Seiten-ID`.
8. `Schritt` `Fertig` or `Abgebrochen`: the procedure ends here. The entry point decides about a revision.

The current loop is the planning loop while `Schritt` is `Planung`, the board loop while it is `Tafelbild`. Every round of the current loop gets the `Rückmeldung` file as an input when `Rückmeldung` is not `keine`.

## Talking to the teacher

- Everything you say to the teacher is German. Use the wording quoted here where it is given.
- When you need the teacher's answer, ask in German and end your turn. The next message continues the procedure at that point.
- Read answers by meaning, not by exact spelling. `weiter`, `ja`, `passt`, or `ok` alone mean continue. An answer that asks for a change is feedback. When an answer is unclear, ask once more, briefly, and repeat the options.
- A write you propose happens only after a yes. On a no, ask what to change and propose again, or skip the step when the teacher says so.
- `Abbrechen`, or an answer that means it, at any question stops the procedure: write `Schritt: Abgebrochen`, append a `## Verlauf` line, keep every file and the page, and say `Abgebrochen. Alle Dateien bleiben im Ordner <Name des Stundenordners>. Mit /unterricht:stunde-ueberarbeiten kannst du diese Stunde später wieder aufnehmen.`

## Stopping

When this file says to stop:

1. Change nothing in `## Stand` and `## OneNote`, so that `/unterricht:stunde-ueberarbeiten` continues at this step. Keep every file and the page.
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

## Settings

The teacher's settings are lines of `einstellungen.md` in the working folder:

| Line | Allowed values | Passed on as |
|---|---|---|
| `Plan vor dem Tafelbild prüfen:` | `ja`, `nein` | the `plan_checkpoint` value: `true` for `ja`, `false` for `nein` |
| `Tafelbild vor Abschluss prüfen:` | `ja`, `nein` | the `board_checkpoint` value: `true` for `ja`, `false` for `nein` |
| `Modell für Plan und Planprüfung:` | `Opus`, `Sonnet`, `Haiku`, `wie die Sitzung` | the `planning_model` value |
| `Modell für das Tafelbild:` | `Opus`, `Sonnet`, `Haiku`, `wie die Sitzung` | the `board_model` value |

The value is the text after the colon; letter case and surrounding spaces do not matter, and a model value is passed on as the table spells it. A setting is broken when its line is missing or its value is not allowed. Never assume a value for a broken setting. The preflight of each entry point checks all four before anything is written, and on a broken one stops with `Die Einstellung „<Bezeichnung>“ in einstellungen.md fehlt oder hat einen unbekannten Wert. Erlaubt ist <Werte>. Bitte trag einen erlaubten Wert ein, oder führe /unterricht:einrichten aus.` `<Bezeichnung>` is the line without its colon; `<Werte>` is `ja oder nein`, or `Opus, Sonnet, Haiku oder „wie die Sitzung“`.

## The notebook

The notebook of the working folder is the value of the line `Notizbuch:` under `## Ablage` in `onenote.md`. It is not set when the line is missing, its value is empty, or it is still a placeholder in square brackets. It is broken when it contains a comma, because the server separates the approved notebooks by commas.

The server may use only the notebooks the teacher approved in Claude's user settings; `get_notebooks` lists only those. `ping` reports `config_error`: `null` when the approval is configured, a text when the server has no usable approval. A missing `config_error` field counts as `null`. Only `einrichten` writes the `Notizbuch:` line and the approval; every other procedure points the teacher to `/unterricht:einrichten`.

## Choosing the model

`unterricht:lesson-planner` and `unterricht:plan-reviewer` run on the `planning_model` value, `unterricht:board-author` and `unterricht:board-reviewer` on the `board_model` value. The value decides the Agent tool's `model` parameter:

| Setting | `model` parameter |
|---|---|
| `Opus` | `opus` |
| `Sonnet` | `sonnet` |
| `Haiku` | `haiku` |
| `wie die Sitzung` | none: the agent's `model: inherit` applies |

The entry point checked both values in its preflight (see Settings). Never choose a model yourself.

## Running an agent

1. Build the assignment in exactly the shape of `<plugin root>/skills/lesson-conventions/SKILL.md`, with the keys `working_folder`, `lesson_folder`, `round`, `inputs`, `output`, and for the board agents `section_id`, `page_title`, `page_id`, `parent_page_id`, `banner_page_id`, `symbol_page_id`, and `model_page_id`. The sections below give the inputs and the output of each run.
2. Print the status line.
3. Start the agent with the Agent tool. `subagent_type` is one of `unterricht:lesson-planner`, `unterricht:plan-reviewer`, `unterricht:board-author`, `unterricht:board-reviewer`. The prompt is exactly the assignment, nothing else. Set `model` as Choosing the model says; a run after a protocol error uses the same model.
4. Wait for the agent's final message and read it as the result line:
   - `DONE <path>`, where `<path>` is the `output` of the assignment: the run succeeded. The board author's line is `DONE <path> page_id=<id>`; take the page ID from it. Make the write of the table for this result.
   - `FAILED <reason>`: stop as above, with a message that contains the reason and the resume hint, for example `Ich habe angehalten: <Grund>. Wenn das Problem behoben ist, setze mit /unterricht:stunde-ueberarbeiten fort.` The two exceptions are a reason that contains `bad_request` and the read timeout of the board reviewer (see Failure handling).
   - Anything else is a protocol error, also a `DONE` with another path, or a board author's line without `page_id=`. Run the same agent once more with the same assignment, followed by one line: `Reminder: your final message must be exactly one line, DONE <output path> or FAILED <reason>, as lesson-conventions defines.` Use `DONE <output path> page_id=<id>` in the reminder for the board author. If the second final message is not a valid result line either, stop with `Ich habe angehalten, weil ein Arbeitsschritt kein gültiges Ergebnis gemeldet hat (<Agent>, Runde <n>). Bitte setze mit /unterricht:stunde-ueberarbeiten fort.`
5. Board author with an empty `page_id` (round 1 on a new page): after a protocol error, the second run gets exactly the same assignment, `page_id` empty included. Never take a page ID from the `output` file or from anywhere but a `DONE` line. The failed run may have created a page, so remember that an empty page with the title `<Seitentitel>` may exist, and say so at the board checkpoint, in the finish message, or in the stop message.

## Reading a verdict

After a reviewer returns `DONE`:

1. Read line 1 of the review only: the Read tool with `limit: 1`.
2. Strip a UTF-8 BOM, trailing spaces, and a trailing CR.
3. `APPROVED` or `REVISE` decide, and you make the write of the table for the verdict. Any other value is a protocol error: handle it like a bad result line, running the reviewer once more with the same assignment and the reminder `Reminder: line 1 of the review must be exactly APPROVED or REVISE.`, and stop with the German message above on the second failure.

Never infer a verdict from the review text. Read the whole review only to escalate.

## Planning loop

The loop has a cap of 3 rounds. It starts at round 1 with `Runde: 0 von 3`, written when the lesson was created or with the teacher's input. Next step decides which run comes next; this section says what each run gets.

The author of round n (n is `Runde` plus 1) writes draft N plus 1. Call it K below.

1. Run `unterricht:lesson-planner`:
   - `round`: `<n> of 3`.
   - `inputs`, in this order: `schulkontext.md`, `kriterien.md`, `stunde.md`; when `Anhänge` in `## Auftrag` of `stunde.md` is not `keine`, `material/anhaenge.md` of the lesson folder; when n is above 1 or `Rückmeldung` is not `keine`, also `planung_v<K-1>.md` and `review_v<K-1>.md`; when `Rückmeldung` is not `keine`, also that file.
   - `output`: `planung_vK.md` in the lesson folder.
2. On `DONE`, write `Runde: <n> von 3` and `Planversion: K`.

The reviewer of round n (n is `Runde`) judges the recorded draft N.

3. Run `unterricht:plan-reviewer`:
   - `round`: `<n> of 3`.
   - `inputs`, in this order: `schulkontext.md`, `kriterien.md`, `stunde.md`, `material/anhaenge.md` when the planner got it, `planung_vN.md`, then `planung_v<N-1>.md`, `review_v<N-1>.md`, and the `Rückmeldung` file exactly as the planner got them in this round.
   - `output`: `review_vN.md` in the lesson folder.
4. Read the verdict of `review_vN.md` and make its write:
   - `APPROVED`: `Prüfbericht: review_vN.md`, `Freigegebener Plan: planung_vN.md`, `Schritt: Prüfpunkt`. Go to the checkpoint.
   - `REVISE`: `Prüfbericht: review_vN.md`. In round 1 or 2, the author of the next round runs. In round 3, escalate (see Escalation); the escalation replaces the checkpoint question.

## Checkpoint

It runs with `Schritt: Prüfpunkt`. When `plan_checkpoint` is `false`, skip it and go to the OneNote gate. Any other value, `true` included, runs it:

1. Read `Freigegebener Plan` and show the teacher a short German summary: Stundenthema, Lernziele, and the phases of the Verlaufsplan with their minutes. Name its path.
2. Ask exactly: `Passt der Plan so? Antworte mit „weiter“, oder schreib, was geändert werden soll.` End your turn.
3. Read the answer:
   - Continue (`weiter`, `ja`, `passt`, `ok`): append a `## Verlauf` line and go to the OneNote gate. `## Stand` stays as it is until the gate passed.
   - Feedback: save it as `rueckmeldung_v<N+1>.md` (see The state), then write `Rückmeldung: rueckmeldung_v<N+1>.md`, `Schritt: Planung`, `Runde: 0 von 3`. The planning loop starts at round 1 with a fresh cap of 3.
   - `Abbrechen`: abort as above.
   - Unclear: ask once more.

## OneNote server not running

The plugin's OneNote tools are `mcp__plugin_unterricht_onenote__*`. When they are not available in this session, the plugin's OneNote server did not start, for example because Windows blocked the unsigned `onenote-mcp.exe`, or the session runs in Cowork, which cannot use the server. Wherever a procedure would call `ping` first (the preflight of `stunde-planen` and `stunde-ueberarbeiten`, step 2 of the OneNote gate, the OneNote steps of `einrichten`), check this first: `mcp__plugin_unterricht_onenote__ping` is not among your tools, also not after a tool search when tools are loaded on demand. Then call no OneNote tool and treat it like `onenote_responsive: false`, with this German message instead of the one about OneNote not responding:

`Die OneNote-Verbindung des Plugins läuft nicht. In Cowork gibt es sie nicht: Öffne deinen Arbeitsordner im Tab „Code“. Bist du schon im Tab „Code“, starte die Claude-App neu. Wenn das nicht hilft, prüfe, ob Windows Defender oder SmartScreen die Datei onenote-mcp.exe blockiert.`

- Preflight of `stunde-planen` or `stunde-ueberarbeiten`: say `Hinweis: ` and the message, then the entry point's sentence that it continues anyway and checks again before the Tafelbild, and continue. Never stop there because of it.
- OneNote gate: do not ask the teacher to open OneNote and do not wait for an answer, because the server does not start within this conversation. Stop as Stopping says, with the message as the reason and the resume hint, for example `Ich habe angehalten: <Meldung> Der Plan bleibt im Ordner <Name des Stundenordners>. Wenn die Verbindung wieder läuft, mach das Tafelbild mit /unterricht:stunde-ueberarbeiten.`
- `einrichten`: say the message, skip the OneNote steps, and list them as missing in the summary.

## OneNote gate

The gate runs with `Schritt: Prüfpunkt`, before a board loop starts: after `weiter` at the checkpoint, when `plan_checkpoint` is `false`, or after `So übernehmen` in the planning loop. Check, in this order; nothing in `## Stand` or `## OneNote` changes before step 9. A resumed board loop, one that runs without a gate pass in this conversation (a resume with `Schritt: Tafelbild`, also after feedback at the board checkpoint of a resumed lesson), runs steps 1 to 5, and step 7 when `Seiten-ID` is `keine`, only to resolve its IDs, and writes nothing. A line of `onenote.md` that is missing, as in a folder set up with plugin 0.3.0, takes the value its step gives for a missing line and is never a reason to stop. The OneNote tools of the main session are `mcp__plugin_unterricht_onenote__ping`, `mcp__plugin_unterricht_onenote__get_notebooks`, and `mcp__plugin_unterricht_onenote__list_pages` (for the template pages, the page of an earlier board loop, the Elternseite, the running number, and the title of a revised page, as `stunde-ueberarbeiten` says).

1. Read the notebook from `onenote.md` (see The notebook). When it is not set or broken, stop before any OneNote call, with `In onenote.md ist noch kein gültiges Notizbuch eingetragen. Führe /unterricht:einrichten aus und setze dann mit /unterricht:stunde-ueberarbeiten fort.`
2. When the OneNote tools are not available, stop as OneNote server not running says. Otherwise call `ping`. When it reports a `config_error` that is not `null`, stop with `Die Freigabe für OneNote ist noch nicht eingerichtet. Führe /unterricht:einrichten aus und setze dann mit /unterricht:stunde-ueberarbeiten fort.` When it reports `onenote_responsive: true`, go on. When it reports `onenote_responsive: false`, ask `OneNote reagiert gerade nicht. Bitte öffne OneNote und schließe alle offenen Dialoge. Antworte dann mit „weiter“.` and end your turn. After the answer, call `ping` once more; when it still reports `onenote_responsive: false`, stop and say that the plan is kept and that the board can be made later with `/unterricht:stunde-ueberarbeiten`.
3. Call `get_notebooks`. The notebook must be in the list, with exactly that name, case-sensitive. Otherwise stop before writing, with `Das Notizbuch „<notebook>“ ist für mich nicht freigegeben, oder OneNote kennt kein Notizbuch mit genau diesem Namen. Führe /unterricht:einrichten aus, um das zu prüfen, und setze dann mit /unterricht:stunde-ueberarbeiten fort. Ich lege nie ein Notizbuch an.`
4. The section. In a resumed board loop, and when `Seiten-ID` is not `keine` (see step 6), it is the recorded `Abschnitt` of `## OneNote`: when the notebook has no section with exactly that name, stop with `Der Abschnitt „<Abschnitt>“, in dem das Tafelbild dieser Stunde liegt, ist im Notizbuch „<notebook>“ nicht mehr zu finden. Ich wähle keinen anderen Abschnitt. Stell den Abschnitt in OneNote wieder her und setze dann mit /unterricht:stunde-ueberarbeiten fort.` Otherwise read `Abschnitt` under `## Ablage` in `onenote.md`. When the line is missing, its value is empty, or it is still a placeholder in square brackets, handle it like a missing section: ask `In onenote.md ist noch kein Abschnitt für die Tafelbilder eingetragen. Bitte lege einen Abschnitt im Notizbuch „<notebook>“ an und nenne ihn, oder nenne einen vorhandenen Abschnitt.` and end your turn, then check the section the teacher named as below, against a fresh `get_notebooks` answer. `Abschnitt: Klasse` means one section per class, for the `Klasse` in `## Auftrag` of `stunde.md`: the section that a line `- <Klasse>: <Abschnitt>` of the list `Abschnitte der Klassen` under `## Ablage` names for exactly that class, else the section named exactly like the `Klasse`. Split such a line at its first colon, both parts without surrounding spaces; a missing list, and a line that is still a placeholder in square brackets, name no class. Any other value is the section name itself. The section must be one of the notebook's sections in the `get_notebooks` answer, with exactly that name; note its ID as `section_id`. When it is missing, ask `Im Notizbuch „<notebook>“ gibt es keinen Abschnitt „<Abschnitt>“. Bitte lege ihn in OneNote an und antworte mit „weiter“, oder nenne einen anderen vorhandenen Abschnitt.` and end your turn. After the teacher's answer to either question, call `get_notebooks` again before you check, because the teacher may just have created the section in OneNote: check the notebook as in step 3 and the section against that fresh answer only, with the section the teacher named, if any. A `timeout` on this call is handled like on every own read (Failure handling). Never create a section, and never change `onenote.md`.
5. The template pages. A line `Banner-Seite`, `Symbol-Seite`, or `Vorbild-Seite` under `## Vorlagen` in `onenote.md` is set when its value is neither empty nor a placeholder in square brackets; a missing line is not set. Each ID of a line that is not set stays empty. For each set line:
   - Split its value `<Abschnitt> / <Seitentitel>` at the first `/`, both parts without surrounding spaces. A value without `/` stops with `In onenote.md steht die Vorlagenseite „<Wert>“ nicht in der Form „Abschnitt / Seitentitel“. Prüfe die Vorlagen mit /unterricht:einrichten und setze dann mit /unterricht:stunde-ueberarbeiten fort.`
   - Find the section with exactly that name in the latest `get_notebooks` answer, call `list_pages` on it, and take the one page titled exactly `<Seitentitel>`. Note its ID as `banner_page_id`, `symbol_page_id`, or `model_page_id`. When the section is missing, or it has no page or more than one page with that title, stop with `Die Vorlagenseite „<Seitentitel>“ im Abschnitt „<Abschnitt>“ finde ich nicht, oder es gibt sie mehrmals. Prüfe die Vorlagen mit /unterricht:einrichten und setze dann mit /unterricht:stunde-ueberarbeiten fort.`

   With a Banner-Seite, every phase of `## Phasenmodell` in `schulkontext.md` needs a line `- <Phase>: <Beschriftung>` or `- <Phase>: keins` under `Banner je Phase`, with the phase name exactly as there; a line that is still a placeholder in square brackets counts as none. For the first phase without a line, stop with `In onenote.md fehlt unter „Banner je Phase“ die Phase „<Phase>“. Führe /unterricht:einrichten aus und setze dann mit /unterricht:stunde-ueberarbeiten fort.` Never guess a banner.
6. The page of an earlier board loop. When `Seiten-ID` in `## OneNote` is not `keine`, the teacher chose to revise that page (`bisherige Seite` in `stunde-ueberarbeiten`): keep the recorded `Elternseite`, `Seitentitel`, and `Seiten-ID`, in the section of step 4. Call `list_pages(section_id)`. When a page there has that ID, skip steps 7 and 8: `parent_page_id` stays empty, because the page exists already. When none has, say `Die bisherige Seite „<Seitentitel>“ gibt es im Abschnitt „<Abschnitt>“ nicht mehr. Ich lege das Tafelbild auf einer neuen Seite an.` and go on with step 7 as for a new page; step 9 then writes `Seiten-ID: keine`.
7. The Elternseite of a new page. It is the recorded `Elternseite` of `## OneNote` when that is not `offen` (a missing line counts as `keine`), else the value of `Elternseite` under `## Ablage` in `onenote.md`, where a missing line, an empty value, or a placeholder in square brackets counts as `keine`.
   - `keine`: the page lies directly in the section, and `parent_page_id` stays empty.
   - `fragen`: ask `Unter welcher Seite im Abschnitt „<Abschnitt>“ soll das Tafelbild als Unterseite liegen? Nenne ihren Titel, oder antworte mit „keine“.` and end your turn. The answer is the Elternseite, a title or `keine`.
   - A title: call `list_pages(section_id)`. Exactly one page must have exactly that title; note its ID as `parent_page_id`. Otherwise name the problem, `Im Abschnitt „<Abschnitt>“ gibt es keine Seite „<Titel>“.` or `Im Abschnitt „<Abschnitt>“ gibt es mehrere Seiten „<Titel>“.`, ask the question of `fragen`, end your turn, and check the answer the same way, against a fresh `list_pages` answer. A resumed board loop writes nothing, so it stops instead of asking: `Die Elternseite „<Titel>“ dieser Stunde finde ich im Abschnitt „<Abschnitt>“ nicht genau einmal. Ich wähle keine andere Seite. Sorg in OneNote dafür, dass es dort genau eine Seite mit diesem Titel gibt, und setze dann mit /unterricht:stunde-ueberarbeiten fort.`
8. The title of a new page, unless the entry point gives another rule for it: fill the `Seitentitel` scheme of `## Ablage` in `onenote.md`. When the line is missing, its value is empty, or it is still a placeholder in square brackets, use the default scheme `JJJJ-MM-TT Klasse Thema`, as the lesson folder did. `JJJJ-MM-TT` is the lesson date when `stunde.md` names one, else the date the lesson folder name starts with, else today; `Klasse` and `Thema` come from `## Auftrag` of `stunde.md`. `NN` is the running number among the pages the new page will stand next to. The `list_pages(section_id)` answer is in section order, with the `level` of each page. With an Elternseite, take its subpages one level below it: the pages that follow it with its `level` plus 1, up to the next page at its own level or lower. Without one, take the pages with `level` 1. Of these, take the titles that start with digits followed by a space. `NN` is the highest of their numbers plus 1, with at least two digits, or `01` when there is none. Keep every other text of the scheme as it is.
9. The gate passed: write `Schritt: Tafelbild`, `Runde: 0 von 3`, `Rückmeldung: keine`, `Abschnitt: <section name>`, `Elternseite: <Titel oder keine>`, and `Seitentitel: <page title>`; when step 6 found the recorded page gone, also `Seiten-ID: keine`. The board loop starts at round 1 with a fresh cap of 3.

A `get_notebooks` or `list_pages` error is handled as Failure handling says.

## Board loop

The loop has a cap of 3 rounds. It starts at round 1 with `Runde: 0 von 3`, written when the gate passed, with the teacher's guidance at the cap, or with the teacher's feedback at the board checkpoint. Next step decides which run comes next; this section says what each run gets. Every run keeps the same page. The board agents get, in every assignment, `section_id` (see OneNote gate), `page_title` (the `Seitentitel`), `page_id` (the `Seiten-ID`, or empty when it is `keine`), and `parent_page_id`, `banner_page_id`, `symbol_page_id`, and `model_page_id` as the gate resolved them, each empty when not set.

The author of round n (n is `Runde` plus 1) writes board version M plus 1. Call it K below.

1. Run `unterricht:board-author`:
   - `round`: `<n> of 3`.
   - `inputs`, in this order: `schulkontext.md`, `kriterien.md`, `onenote.md`, the `Freigegebener Plan`, `material/anhaenge.md` of the lesson folder when `Anhänge` in `## Auftrag` of `stunde.md` is not `keine`; when n is above 1 or `Rückmeldung` is not `keine`, also `tafelbild_v<K-1>.json` and `tafelbild-review_v<K-1>.md`; when `Rückmeldung` is not `keine`, also that file.
   - `output`: `tafelbild_vK.json` in the lesson folder.
2. On `DONE`, write `Runde: <n> von 3` and `Tafelbildversion: K`; when `page_id` was empty, also `Seiten-ID` from the `page_id=` of the result line. When `page_id` was given and the result line names another ID, it is a protocol error.

The reviewer of round n (n is `Runde`) judges the recorded board version M.

3. Run `unterricht:board-reviewer`:
   - `round`: `<n> of 3`.
   - `inputs`, in this order: `schulkontext.md`, `kriterien.md`, `onenote.md`, the `Freigegebener Plan`, `material/anhaenge.md` when the author got it, `tafelbild_vM.json`, and the `Rückmeldung` file when it is not `keine`.
   - `output`: `tafelbild-review_vM.md` in the lesson folder.
4. Read the verdict of `tafelbild-review_vM.md` and make its write:
   - `APPROVED`: `Prüfbericht: tafelbild-review_vM.md`, and `Schritt: Tafelbild-Prüfpunkt`, or `Schritt: Fertig` when the `board_checkpoint` value is `false`. Go to the board checkpoint, or finish.
   - `REVISE`: `Prüfbericht: tafelbild-review_vM.md`. In round 1 or 2, the author of the next round runs. In round 3, escalate; the escalation replaces the board checkpoint.

## Board checkpoint

It runs with `Schritt: Tafelbild-Prüfpunkt`, so that the teacher sees the page before the lesson is finished and changes go into the board loop instead of a revision of the whole lesson. When `board_checkpoint` is `false`, write `Schritt: Fertig` and finish. Any other value, `true` included, runs it:

1. Name the page: notebook, Abschnitt, Seitentitel, and the Elternseite when it is not `keine`, for example `Notizbuch „<notebook>“, Abschnitt „<Abschnitt>“, Seite „<Seitentitel>“ unter „<Elternseite>“.` When a board author of round 1 had a protocol error in this conversation (see Running an agent), add the line about the empty page of Finish.
2. Ask exactly: `Das Tafelbild steht in OneNote. Sieh es dir bitte an, aber tippe noch nichts auf der Seite ein: Wenn du etwas ändern möchtest, ersetze ich ihren Inhalt. Passt das Tafelbild so? Antworte mit „weiter“, oder schreib, was geändert werden soll.` End your turn.
3. Read the answer:
   - Continue (`weiter`, `ja`, `passt`, `ok`): write `Schritt: Fertig` and finish.
   - Feedback: save it as `tafelbild-rueckmeldung_v<M+1>.md` (see The state), then write `Rückmeldung: tafelbild-rueckmeldung_v<M+1>.md`, `Schritt: Tafelbild`, `Runde: 0 von 3`. The board loop starts at round 1 with a fresh cap of 3, on the same page: `Seiten-ID` stays.
   - `Abbrechen`: abort as above.
   - Unclear: ask once more.

## Escalation

At the cap of either loop:

1. Read the `Prüfbericht` fully: `review_vN.md` in the planning loop, `tafelbild-review_vM.md` in the board loop.
2. Show the teacher, in German, the open Muss-Mängel from its `## Muss-Mängel`, and offer the three options, for example:

   ```
   Nach 3 Runden sind in <planung_vN.md | tafelbild_vM.json> noch diese Muss-Mängel offen:
   1. <Mangel>

   Wie möchtest du weitermachen?
   - „So übernehmen“: Ich übernehme den Stand so und notiere die Mängel in stunde.md.
   - „Ich gebe Hinweise“: Schreib dazu, was geändert werden soll. Dann starte ich neu mit bis zu 3 Runden.
   - „Abbrechen“: Ich höre auf. Alle Dateien bleiben, wie sie sind.
   ```

   End your turn. This is the only question: in the planning loop it replaces the checkpoint question, in the board loop the board checkpoint.
3. Read the answer:
   - `So übernehmen`: write the open Muss-Mängel under `## Übernommene Mängel` of `stunde.md`, each with the file it belongs to, replacing `- keine`. Then make the write as after `APPROVED`: in the planning loop `Freigegebener Plan: planung_vN.md` and `Schritt: Prüfpunkt`, and go directly to the OneNote gate, because escalation and checkpoint are one question; in the board loop `Schritt: Fertig`, and finish, because escalation and board checkpoint are one question.
   - `Ich gebe Hinweise`, or an answer that asks for changes: when the answer holds no guidance yet, ask for it. Save the guidance (see The state): in the planning loop as `rueckmeldung_v<N+1>.md`, then write it as `Rückmeldung`, `Schritt: Planung`, `Runde: 0 von 3`; in the board loop as `tafelbild-rueckmeldung_v<M+1>.md`, then write it as `Rückmeldung` and `Runde: 0 von 3`. The loop starts again at round 1 with a fresh cap of 3.
   - `Abbrechen`: abort as above. Files and page stay as they are.
   - Unclear: ask once more.

## Failure handling

The OneNote failures that concern you. An error of a OneNote tool arrives as `Error executing tool <tool>: <code>: <message>`: find the code inside the text. An error without a code counts as `bad_request`. Every stop here keeps the plan and the files.

- The plugin's OneNote tools are not available: as OneNote server not running says.
- `onenote_responsive: false` before the board loop: as in step 2 of the OneNote gate.
- `timeout` on your own read (`get_notebooks` or `list_pages`): say `OneNote ist gerade beschäftigt oder zeigt einen Dialog. Ich versuche es gleich noch einmal.`, call `ping`, and call the tool once more. On a second failure, stop the board loop, keep the plan, and explain how to resume with `/unterricht:stunde-ueberarbeiten`.
- `FAILED` from `unterricht:board-reviewer` whose reason contains the code `timeout`: the read timeout. Say `OneNote ist gerade beschäftigt oder zeigt einen Dialog. Bitte schließe offene Dialoge in OneNote. Ich versuche es gleich noch einmal.`, call `ping`, and run the reviewer once more with the same assignment, with its status line. When the second run returns `FAILED` again, stop the board loop, keep the plan, and explain how to resume with `/unterricht:stunde-ueberarbeiten`.
- `FAILED` from any agent whose reason contains the code `bad_request`: a plugin bug. This rule takes precedence over every other rule for a `FAILED` result, the board author's included. Stop as Stopping says, with this message instead of the one of Running an agent: `Ich habe angehalten, weil das Plugin einen Fehler gemeldet hat: <Grund>. Das ist ein Fehler im Plugin. Bitte leite diese Meldung an die Person weiter, die das Plugin betreut. Die bisherigen Dateien bleiben im Ordner <Name des Stundenordners>. Wenn der Fehler behoben ist, setze mit /unterricht:stunde-ueberarbeiten fort.` `<Grund>` is the reason of the result line, verbatim, with the error text.
- `FAILED` from `unterricht:board-author` whose reason does not contain `bad_request` (a `create_page` or `replace_page` failure, or any other): stop as Running an agent says. The reason already tells the teacher what to check.
- A `backend_error` saying that OneNote is not registered or not installed: stop with `Für das Tafelbild brauche ich die OneNote-Desktop-App für Windows. Bitte installiere sie, melde dich an und setze dann mit /unterricht:stunde-ueberarbeiten fort.`
- Any other `backend_error` on your own call: stop the board loop, show the error text, keep the plan, and explain how to resume.
- `bad_request` on your own call: a plugin bug. Stop, show the error text, and ask the teacher to forward it to the maintainer of the plugin.
- Notebook not set or broken in `onenote.md`: step 1 of the OneNote gate.
- `config_error` reported by `ping`: step 2 of the OneNote gate.
- Notebook not approved or not found: step 3 of the OneNote gate.
- Target section missing: step 4 of the OneNote gate.
- A template page that is not found exactly once, a template line without `/`, or a phase without a line under `Banner je Phase`: step 5 of the OneNote gate.
- An Elternseite that a resumed board loop does not find exactly once: step 7 of the OneNote gate.

## Finish

It runs after the write of `Schritt: Fertig`.

1. Append a `## Verlauf` line.
2. Tell the teacher, in German:
   - the path of the final plan (`Freigegebener Plan`);
   - where the page is: notebook, Abschnitt, Seitentitel, and the Elternseite when it is not `keine`;
   - the Mängel accepted at a cap, from `## Übernommene Mängel`, or that there are none;
   - when a board author of round 1 had a protocol error in this conversation (see Running an agent), that an empty page with the same title may exist from the failed run and can be deleted;
   - the reminder to open the page once on the device used in class before the lesson, so that OneNote has synced it.

   For example:

   ```
   Fertig. Der Plan liegt in <Pfad zu planung_vN.md>.
   Das Tafelbild steht in OneNote: Notizbuch „<notebook>“, Abschnitt „<Abschnitt>“, Seite „<Seitentitel>“ unter „<Elternseite>“.
   Übernommene Mängel: <Liste oder „keine“>.
   Falls im Abschnitt eine leere Seite „<Seitentitel>“ liegt, stammt sie von einem abgebrochenen Versuch. Du kannst sie löschen.
   Bitte öffne die Seite vor der Stunde einmal auf dem Gerät, mit dem du sie zeigst, damit OneNote sie dort synchronisiert hat.
   ```

   Write ` unter „<Elternseite>“` only with an Elternseite, and the line about the empty page only in the case named above.
