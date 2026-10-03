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

Write nothing in this step. Run the preflight of `stunde-planen`, in this order. Collect the failures of checks 2 and 3 before you answer.

1. `schulkontext.md`, `kriterien.md`, and `onenote.md` exist. When one is missing, stop with `Im Ordner <Arbeitsordner> fehlt <Datei>. Bitte richte den Ordner zuerst mit /unterricht:einrichten ein.`
2. `schulkontext.md` has a line `Stundenlänge: <Zahl> Minuten` under `## Zeitraster`, where the number may have a decimal comma. A missing line, a placeholder in square brackets such as `[Minuten eintragen]`, or anything else that is not a number is a failure: `In schulkontext.md, Zeile <n>, fehlt die Stundenlänge als Zahl: „<Zeile>“. Bitte trag die Minuten ein, zum Beispiel „Stundenlänge: 45 Minuten“.` Without such a line, name the line of `## Zeitraster`.
3. `onenote.md` has a filled `Abschnitt:` and a filled `Seitentitel:` under `## Ablage`. An empty value or a placeholder in square brackets is a failure: `In onenote.md, Zeile <n>, ist „<Abschnitt | Seitentitel>“ noch nicht ausgefüllt. Bitte trag den Wert ein oder führe /unterricht:einrichten aus.` Without such a line, name the line of `## Ablage`. The `## Ansicht` is optional; its placeholders are no failure.

   When checks 2 or 3 failed, tell the teacher every failure, each with its file and line, and stop. Write nothing.
4. The lesson: choose it as step 2 says.
5. The `notebook` setting (`OneNote notebook` above) is not blank and has no comma. Otherwise do not call any OneNote tool, say `Hinweis: Die Einstellung „OneNote-Notizbuch“ ist leer oder enthält ein Komma. Für das Tafelbild trag mit /config genau den Namen eines Notizbuchs ein.`, skip check 6, and continue.
6. Call `mcp__plugin_unterricht_onenote__ping`. When it reports `onenote_responsive: false`, or the call fails, say `Hinweis: OneNote reagiert gerade nicht. Ich mache trotzdem weiter und prüfe vor dem Tafelbild noch einmal. Bitte öffne bis dahin OneNote und schließe offene Dialoge.` and continue. Never stop here because of OneNote.

## 2. Choose the lesson

The lessons are the folders in `Stunden/` that hold a `stunde.md`. When there is none, stop with `In Stunden/ gibt es noch keine Stunde. Plane eine neue Stunde mit /unterricht:stunde-planen.`

1. The request above may name a lesson: a folder name, or a part of one that fits exactly one folder, for example `6b Bruchrechnung` or a date. Everything else in the request is the teacher's changes, verbatim, or none.
2. When the request names exactly one lesson, take it. Otherwise list the lessons, newest folder name first, each with its folder name, the `Schritt` of `## Stand`, and the date of the last line of `## Verlauf`, and ask which one; when the request fits several folders, list only those. For example:

   ```
   Diese Stunden habe ich in Stunden/ gefunden:
   1. 2026-10-07 6b Bruchrechnung: Fertig, zuletzt am 2026-10-07
   2. 2026-10-02 7a Dreiecke: Tafelbild, zuletzt am 2026-10-02

   Welche Stunde soll ich bearbeiten? Antworte mit der Nummer oder dem Namen.
   ```

   End your turn. When the answer also holds changes, keep them as the teacher's changes.
3. Read `stunde.md` of the chosen lesson and `${CLAUDE_PLUGIN_ROOT}/skills/lesson-conventions/lesson-folder.md`. When `stunde.md` does not have the format of `lesson-folder.md`, or `Schritt` is not one of its values, stop with `Die Datei stunde.md im Ordner <Name des Stundenordners> kann ich nicht lesen: <was fehlt>. Ich ändere nichts.`
4. Go by `Schritt`: `Planung`, `Prüfpunkt`, or `Tafelbild` resume (step 3); `Fertig` or `Abgebrochen` revise (step 4).

## 3. Resume

The run was interrupted. Continue at the recorded step, with the versions and the round of `## Stand`. Never start a fresh cap and never reset `Runde` or a version.

When the teacher's changes are not empty and `Schritt` is `Planung` or `Tafelbild`, say first `Diese Stunde ist noch nicht fertig. Ich setze sie dort fort, wo sie unterbrochen wurde. Deine Änderungen kannst du am Prüfpunkt nennen oder danach mit /unterricht:stunde-ueberarbeiten einbringen.`

Tell the teacher in one German line where you continue, for example `Ich setze die Stunde „<Name des Stundenordners>“ bei der Planung fort, Runde 2 von 3.`

- `Schritt: Planung`: the planning loop, as `Resuming a loop` of `orchestration.md` says.
- `Schritt: Prüfpunkt`: the checkpoint, from step 2, as `orchestration.md` says. When `Plan checkpoint` above is `false`, go on as after `weiter`. When the teacher's changes are not empty, they are the answer to the checkpoint question: do not ask it, and save them as its feedback.
- `Schritt: Tafelbild`: the OneNote gate for a resumed board loop, then the board loop as `Resuming a loop` says. It continues on the page recorded as `Seiten-ID` in `## OneNote` and never creates another one.

  When `Seiten-ID` is `keine` but `## OneNote` already records a `Seitentitel` other than `offen`, the board loop had started, and an interrupted `create_page` may have left an empty page. After the gate, before the first agent run, say `Möglicherweise ist bei der Unterbrechung im Abschnitt „<Abschnitt>“ eine leere Seite „<Seitentitel>“ entstanden. Falls du sie in OneNote findest, lösche sie bitte. Ich lege das Tafelbild auf einer neuen Seite an.` Then continue with an empty `page_id`: the board author never reuses a page that existed before its round.

## 4. Revise

The lesson is finished or was aborted. A page whose board loop has ended is never replaced, so the revision gets a new page next to the old one.

1. The changes: when the teacher's changes are empty, ask `Was soll ich an der Stunde „<Name des Stundenordners>“ ändern?` and end your turn. When the answer says there is nothing to change, stop with `Dann lasse ich die Stunde, wie sie ist.` and write nothing.
2. P is `Planversion` of `## Stand`.
   - When P is a number: save the teacher's changes verbatim, unchanged, as `rueckmeldung_v<P+1>.md` in the lesson folder, under the heading `# Rückmeldung zu planung_vP.md`. An existing `rueckmeldung_v<P+1>.md` comes from an interrupted revision; overwrite it.
   - When P is `keine`, there is no plan to revise: write no feedback file; in the write of step 3, append the changes verbatim to `Hinweise` in `## Auftrag`, replacing `keine`.
3. Update `stunde.md` in one write:
   - `## Auftrag`: when the changes set another lesson length, for example `nur 45 Minuten`, set `Stundenlänge` to it and `Quelle der Stundenlänge: Auftrag`.
   - `## Stand`: `Schritt: Planung`, `Runde: 1 von 3`, `Freigegebener Plan: keiner`; keep `Planversion` and `Tafelbildversion`, because versions never restart.
   - `## OneNote`: when `Seiten-ID` is not `keine`, set `Seitentitel: offen` and `Seiten-ID: keine`, and keep `Abschnitt`, so that the new page goes next to the old one. Otherwise there is no old page; keep `## OneNote` as it is.
   - `## Übernommene Mängel`: `- keine`, because the Mängel accepted before belong to the old files.
   - `## Verlauf`: when you saved a feedback file, `- <heute>: Rückmeldung als rueckmeldung_v<P+1>.md gespeichert.`; when there was an old page, `- <heute>: Überarbeitung begonnen. Alte Seite „<alter Seitentitel>“ im Abschnitt „<Abschnitt>“ (Seiten-ID <alte ID>) bleibt unverändert.`; otherwise `- <heute>: Überarbeitung begonnen.`
4. Tell the teacher in one German line, for example `Ich überarbeite die Stunde „<Name des Stundenordners>“ mit deinen Änderungen.`
5. Follow `orchestration.md`, as step 5 says, from a new planning loop at round 1 with a fresh cap of 3: with P a number, as a loop after teacher input with N = P plus 1, started by `rueckmeldung_v<P+1>.md`; with P `keine`, as a new lesson. Then the checkpoint, the OneNote gate, and a board loop on a new page, with M = `Tafelbildversion` plus 1. Never pass the old page ID to an agent.

## 5. Orchestration

Read `${CLAUDE_PLUGIN_ROOT}/skills/lesson-conventions/orchestration.md` and follow it from the step that step 3 or step 4 names, with these values:

- the plugin root: `Plugin root` above;
- the working folder: the absolute path of the working folder;
- the lesson folder: the absolute path of the chosen lesson folder;
- the `notebook` setting: `OneNote notebook` above;
- the `plan_checkpoint` value: `Plan checkpoint` above.

From here on, `Abbrechen` and every stop work as `orchestration.md` says, and `stunde.md` holds the state. Two additions apply to a revised lesson, also when it is resumed later:

- **Title of the new page.** At step 5 of the OneNote gate, when `Seitentitel` is `offen` and `## Verlauf` holds a line `Alte Seite „<Titel>“`, take the title of the last such line. The base title is that title without a trailing ` (überarbeitet)` or ` (überarbeitet <Zahl>)`. Call `mcp__plugin_unterricht_onenote__list_pages` on the target section and take the first title that no page there has, exactly: `<Basistitel> (überarbeitet)`, then `<Basistitel> (überarbeitet 2)`, `<Basistitel> (überarbeitet 3)`, and so on. A `list_pages` error is handled like a `get_notebooks` error in Failure handling. Step 6 of the gate records the title.
- **The old page.** After the finish message, when `## Verlauf` holds a line `Alte Seite „<Titel>“`, take the last such line and add `Die alte Seite „<Titel>“ im Abschnitt „<Abschnitt>“ habe ich nicht verändert. Bitte lösche sie in OneNote von Hand, wenn du sie nicht mehr brauchst.` with the exact title and section of that line.
