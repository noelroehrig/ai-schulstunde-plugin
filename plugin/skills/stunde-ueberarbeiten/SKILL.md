---
name: stunde-ueberarbeiten
description: Setzt eine unterbrochene Unterrichtsstunde fort oder überarbeitet eine fertige Stunde mit deinen Änderungen und legt dafür ein neues Tafelbild in OneNote an.
argument-hint: "[Stunde] [Änderungen]"
disable-model-invocation: true
---

# Resume or revise a lesson

The teacher wants to work on an existing lesson in `Stunden/`. You either resume an interrupted run at the step where it stopped, or revise a finished or aborted lesson with the teacher's changes: both loops again, from the latest plan, with the board on a new page. Everything you say to the teacher is German; use the wording quoted here where it is given.

Plugin root: ${CLAUDE_PLUGIN_ROOT}
OneNote notebook: ${user_config.notebook}
Plan checkpoint: ${user_config.plan_checkpoint}
Request: $ARGUMENTS

The working folder is the current working directory: use its absolute path, with forward slashes. Every file named below without a folder is in the working folder.

When you need the teacher's answer, ask in German and end your turn; the next message continues at that point. Read answers by meaning, not by exact spelling. When an answer is unclear, ask once more. `Abbrechen`, or an answer that means it, at any question before you write to the lesson folder stops the procedure: write nothing and say `Abgebrochen. Ich habe nichts geändert.`

## 1. Preflight, no writes

Write nothing in this step. The preflight of the working folder is the one of `stunde-planen`, kept in one place: read `${CLAUDE_PLUGIN_ROOT}/skills/stunde-planen/SKILL.md` and run checks 1 and 2 of its step 1 exactly as written there, with their German messages; when one fails, stop as it says. As there, `## Ablage` of `onenote.md` is not checked here. Its check 3 (the request) does not apply here. Its checks 4 and 5 are replaced by items 4 and 5 of step 2, which run once the lesson is chosen.

## 2. Choose the lesson

The lessons are the folders in `Stunden/` that hold a `stunde.md`. When there is none, stop with `In Stunden/ gibt es noch keine Stunde. Plane eine neue Stunde mit /unterricht:stunde-planen.`

1. The request above may name a lesson: a folder name, or a part of one that fits exactly one folder, for example `6b Bruchrechnung` or a date. Everything else in the request is the teacher's changes, verbatim, or none.
2. When the request names exactly one lesson, take it. Otherwise list the lessons, newest folder name first, each with its folder name and the `Schritt` of `## Stand`, and ask which one; when the request fits several folders, list only those. For example:

   ```
   Diese Stunden habe ich in Stunden/ gefunden:
   1. 2026-10-07 6b Bruchrechnung: Fertig
   2. 2026-10-02 7a Dreiecke: Tafelbild

   Welche Stunde soll ich bearbeiten? Antworte mit der Nummer oder dem Namen.
   ```

   End your turn. When the answer also holds changes, keep them as the teacher's changes.
3. Read `stunde.md` of the chosen lesson and `${CLAUDE_PLUGIN_ROOT}/skills/lesson-conventions/lesson-folder.md`. When `## Stand` or `## OneNote` of `stunde.md` lacks a line of the format of `lesson-folder.md`, or `Schritt` is not one of its values, stop with `Die Datei stunde.md im Ordner <Name des Stundenordners> kann ich nicht lesen: <was fehlt>. Ich ändere nichts.`
4. The `notebook` setting (`OneNote notebook` above) is not blank and has no comma. Otherwise do not call any OneNote tool, say `Hinweis: Die Einstellung „OneNote-Notizbuch“ ist leer oder enthält ein Komma. Für das Tafelbild trag mit /config genau den Namen eines Notizbuchs ein.`, skip item 5, and continue with item 6.
5. When the plugin's OneNote tools are not available in this session, the OneNote server did not start: read OneNote server not running in `${CLAUDE_PLUGIN_ROOT}/skills/lesson-conventions/orchestration.md`, call no OneNote tool, say `Hinweis: ` and its message, then `Ich mache trotzdem weiter und prüfe vor dem Tafelbild noch einmal.`, and continue. Otherwise call `mcp__plugin_unterricht_onenote__ping`. When it reports `onenote_responsive: false`, or the call fails, say `Hinweis: OneNote reagiert gerade nicht. Ich mache trotzdem weiter und prüfe vor dem Tafelbild noch einmal. Bitte öffne bis dahin OneNote und schließe offene Dialoge.` and continue. Never stop here because of OneNote.
6. Only after items 4 and 5, go by `Schritt`: `Planung`, `Prüfpunkt`, or `Tafelbild` resume (step 3); `Fertig` or `Abgebrochen` revise (step 4).

## 3. Resume

The run was interrupted. Continue only as Next step of `orchestration.md` says, from the lines of `## Stand` and `## OneNote`: never from `## Verlauf`, and never from which files exist in the lesson folder. Never start a fresh cap and never reset `Runde` or a version, except by a write of the table of `orchestration.md`.

When the teacher's changes are not empty, never drop them without a word:

- `Schritt: Prüfpunkt`: the changes are always the checkpoint feedback, also when `Plan checkpoint` above is `false` (see below).
- `Schritt: Planung` while `Plan checkpoint` above is not `false`: say first `Diese Stunde ist noch nicht fertig. Ich setze die Planung dort fort, wo sie unterbrochen wurde. Deine Änderungen kannst du gleich am Prüfpunkt nennen.`
- `Schritt: Planung` while `Plan checkpoint` above is `false`, and `Schritt: Tafelbild`: say first `Diese Stunde ist noch nicht fertig. Ich setze sie dort fort, wo sie unterbrochen wurde, und übernehme deine Änderungen jetzt nicht. Wenn die Stunde fertig ist, kannst du sie mit /unterricht:stunde-ueberarbeiten einbringen.`

Tell the teacher in one German line where you continue, for example `Ich setze die Stunde „<Name des Stundenordners>“ bei der Planung fort, Runde 2 von 3.`

- `Schritt: Prüfpunkt` with changes that are not empty: they are the answer to the checkpoint question, whatever `Plan checkpoint` says. Do not ask it: save them as teacher input, as `rueckmeldung_v<N+1>.md` with N the `Planversion`, exactly as `The state` of `orchestration.md` says, and make the write of the table for teacher feedback at the checkpoint (`Rückmeldung`, `Schritt: Planung`, `Runde: 0 von 3`). Then go on as Next step says.
- Every other case: go on as Next step says. With `Schritt: Prüfpunkt`, that is the checkpoint question again, or the OneNote gate when `Plan checkpoint` is `false`. With `Schritt: Tafelbild`, the gate resolves `section_id` from the recorded `Abschnitt` first, as `orchestration.md` says for a resumed board loop, and the board loop keeps `Seitentitel` and `Seiten-ID`.

  With `Schritt: Tafelbild` and `Seiten-ID: keine`, an interrupted board author of round 1 may have left an empty page. After the gate, before the first agent run, say `Möglicherweise ist bei der Unterbrechung im Abschnitt „<Abschnitt>“ eine leere Seite „<Seitentitel>“ entstanden. Falls du sie in OneNote findest, lösche sie bitte. Ich lege das Tafelbild auf einer neuen Seite an.` The board author then runs with an empty `page_id`.

## 4. Revise

The lesson is finished or was aborted. A page whose board loop has ended is never replaced, so the revision gets a new page. A revision never reads or writes the old page.

1. The changes: when the teacher's changes are empty, ask `Was soll ich an der Stunde „<Name des Stundenordners>“ ändern?` and end your turn. When the answer says there is nothing to change, stop with `Dann lasse ich die Stunde, wie sie ist.` and write nothing.
2. N is `Planversion` of `## Stand`.
   - When N is a number: save the teacher's changes as teacher input, verbatim, as `rueckmeldung_v<N+1>.md` in the lesson folder, under the heading `# Rückmeldung zu planung_vN.md`. When that file exists but `## Stand` does not record it, it comes from an interrupted revision; overwrite it.
   - When N is `keine`, there is no plan to revise and no feedback file: in the write of item 3, append the changes verbatim to `Hinweise` in `## Auftrag`, replacing `keine`, and write `Rückmeldung: keine`.
3. Update `stunde.md` in one write:
   - `## Auftrag`: when the changes set another lesson length, for example `nur 45 Minuten`, set `Stundenlänge` to it and `Quelle der Stundenlänge: Auftrag`.
   - `## Stand`: `Schritt: Planung`, `Runde: 0 von 3`, `Freigegebener Plan: keiner`, and `Rückmeldung: rueckmeldung_v<N+1>.md` when you saved it. Keep `Planversion`, `Tafelbildversion`, and `Prüfbericht`, because versions never restart.
   - `## OneNote`: `Alte Seite`: when `Alte Seite` is already set (not `keine`) and `Seiten-ID` is `keine`, no new page exists yet since the last revision: keep it. Otherwise, when `Seitentitel` is not `offen`, set `Alte Seite` to the current `Seitentitel`; else keep it. Then `Seitentitel: offen` and `Seiten-ID: keine`. Keep `Abschnitt`.
   - `## Übernommene Mängel`: `- keine`, because the Mängel accepted before belong to the old files.

   Then append one line to `## Verlauf`, for example `- <heute>: Überarbeitung begonnen, Rückmeldung als rueckmeldung_v<N+1>.md gespeichert.`
4. Tell the teacher in one German line, for example `Ich überarbeite die Stunde „<Name des Stundenordners>“ mit deinen Änderungen.`
5. Follow `orchestration.md`, as step 5 says, from Next step: `Runde: 0 von 3` starts a new planning loop at round 1 with a fresh cap of 3, with the `Rückmeldung` file as an input of every round. Then the checkpoint, the OneNote gate, and a board loop on a new page, with M = `Tafelbildversion` plus 1. Never pass the ID of the old page to an agent.

## 5. Orchestration

Read `${CLAUDE_PLUGIN_ROOT}/skills/lesson-conventions/orchestration.md` and follow it from the step that step 3 or step 4 names, with these values:

- the plugin root: `Plugin root` above;
- the working folder: the absolute path of the working folder;
- the lesson folder: the absolute path of the chosen lesson folder;
- the `notebook` setting: `OneNote notebook` above;
- the `plan_checkpoint` value: `Plan checkpoint` above.

From here on, `Abbrechen` and every stop work as `orchestration.md` says, and `stunde.md` holds the state. Two additions apply whenever `Alte Seite` in `## OneNote` is not `keine`, also when the lesson is resumed later. Both read only `## OneNote`, never `## Verlauf`.

- **Title of the new page.** At step 5 of the OneNote gate, derive the title from `Alte Seite` instead of the `Seitentitel` scheme. The base title is `Alte Seite` without a trailing ` (überarbeitet)` or ` (überarbeitet <Zahl>)`. Call `mcp__plugin_unterricht_onenote__list_pages` on the target section and take the first title that no page there has, exactly: `<Basistitel> (überarbeitet)`, then `<Basistitel> (überarbeitet 2)`, `<Basistitel> (überarbeitet 3)`, and so on. A `list_pages` error is handled like a `get_notebooks` error in Failure handling. Step 6 of the gate records the title as `Seitentitel`.
- **The old page.** After the finish message, add `Die alte Seite „<Alte Seite>“ habe ich nicht verändert. Bitte lösche sie in OneNote von Hand, wenn du sie nicht mehr brauchst.` with the exact title of `Alte Seite`.
