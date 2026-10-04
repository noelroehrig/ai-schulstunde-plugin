---
name: stunde-planen
description: Plant eine neue Unterrichtsstunde mit Prüfschleifen für den Plan und das Tafelbild und legt das Tafelbild in OneNote an.
argument-hint: <Thema, Klasse, Hinweise>
disable-model-invocation: true
---

# Plan a new lesson

The teacher asked for a new lesson. You plan it with both review loops and put the Tafelbild into OneNote. Everything you say to the teacher is German; use the wording quoted here where it is given.

Plugin root: ${CLAUDE_PLUGIN_ROOT}
OneNote notebook: ${user_config.notebook}
Plan checkpoint: ${user_config.plan_checkpoint}
Planning model: ${user_config.planning_model}
Board model: ${user_config.board_model}
Request: $ARGUMENTS

The working folder is the current working directory: use its absolute path, with forward slashes. Every file named below without a folder is in the working folder.

When you need the teacher's answer, ask in German and end your turn; the next message continues at that point. Read answers by meaning, not by exact spelling. When an answer is unclear, ask once more. `Abbrechen`, or an answer that means it, at any question before the lesson folder exists stops the procedure: write nothing and say `Abgebrochen. Ich habe nichts angelegt.`

## 1. Preflight, no writes

Write nothing in this step. Check, in this order.

1. `schulkontext.md`, `kriterien.md`, and `onenote.md` exist. When one is missing, stop with `Im Ordner <Arbeitsordner> fehlt <Datei>. Bitte richte den Ordner zuerst mit /unterricht:einrichten ein.`
2. `schulkontext.md` has a line `Stundenlänge: <Zahl> Minuten` under `## Zeitraster`, where the number may have a decimal comma. A missing line, a placeholder in square brackets such as `[Minuten eintragen]`, or anything else that is not a number is a failure: `In schulkontext.md, Zeile <n>, fehlt die Stundenlänge als Zahl: „<Zeile>“. Bitte trag die Minuten ein, zum Beispiel „Stundenlänge: 45 Minuten“.` Without such a line, name the line of `## Zeitraster`. Tell the teacher the failure and stop. Write nothing.

   Do not check `## Ablage` or `## Ansicht` of `onenote.md` here: the lesson is planned anyway. A `Seitentitel` that is missing, empty, or a placeholder in square brackets means the default scheme (step 2), and `Abschnitt` is checked only at the OneNote gate of `orchestration.md`.
3. The request: take `Thema`, `Klasse`, and `Hinweise` from the request above.
   - `Thema` is the topic of the lesson, `Klasse` the class, for example `6b`. `Hinweise` is everything else the teacher wrote, verbatim, the lesson date and a lesson length included, or `keine`.
   - When the request names the date of the lesson, keep it as the lesson date.
   - When the request sets another lesson length, for example `nur 45 Minuten`, it overrides the Stundenlänge of `schulkontext.md` for this lesson: `Quelle der Stundenlänge: Auftrag`. Otherwise the Stundenlänge comes from `schulkontext.md`: `Quelle der Stundenlänge: schulkontext.md`.
   - When `Thema` or `Klasse` is missing, ask for what is missing, for example `Zu welchem Thema und für welche Klasse soll ich die Stunde planen?`, and end your turn. Use the answer and continue with check 4.
4. The `notebook` setting (`OneNote notebook` above) is not blank and has no comma. Otherwise do not call any OneNote tool, say `Hinweis: Die Einstellung „OneNote-Notizbuch“ ist leer oder enthält ein Komma. Ich plane die Stunde trotzdem. Für das Tafelbild trag mit /config genau den Namen eines Notizbuchs ein.`, skip check 5, and continue.
5. When the plugin's OneNote tools are not available in this session, the OneNote server did not start: read OneNote server not running in `${CLAUDE_PLUGIN_ROOT}/skills/lesson-conventions/orchestration.md`, call no OneNote tool, say `Hinweis: ` and its message, then `Ich plane die Stunde trotzdem und prüfe vor dem Tafelbild noch einmal.`, and continue. Otherwise call `mcp__plugin_unterricht_onenote__ping`. When it reports `onenote_responsive: false`, or the call fails, say `Hinweis: OneNote reagiert gerade nicht. Ich plane die Stunde trotzdem und prüfe vor dem Tafelbild noch einmal. Bitte öffne bis dahin OneNote und schließe offene Dialoge.` and continue. Never stop here because of OneNote.

## 2. Lesson folder

Read `${CLAUDE_PLUGIN_ROOT}/skills/lesson-conventions/lesson-folder.md` and follow it.

1. Name the lesson folder as `lesson-folder.md` says, from the `Seitentitel` scheme of `onenote.md`, or from the default scheme `JJJJ-MM-TT Klasse Thema` when `Seitentitel` is missing, empty, or a placeholder in square brackets: the lesson date if the request names one, else today; `Klasse` and `Thema` from the request. Create `Stunden/` when it does not exist, then the lesson folder in it, taking the first free name.
2. Write `stunde.md` in the lesson folder, in exactly the format of `lesson-folder.md`:
   - `## Auftrag`: `Thema`, `Klasse`, `Hinweise`, `Stundenlänge`, and `Quelle der Stundenlänge` from step 1.
   - `## Stand`: `Schritt: Planung`, `Runde: 0 von 3`, `Planversion: keine`, `Freigegebener Plan: keiner`, `Tafelbildversion: keine`, `Prüfbericht: keiner`, `Rückmeldung: keine`.
   - `## OneNote`: `Abschnitt: offen`, `Seitentitel: offen`, `Seiten-ID: keine`, `Alte Seite: keine`.
   - `## Übernommene Mängel`: `- keine`.
   - `## Verlauf`: one line with today's date, for example `- 2026-10-07: Stunde angelegt.`
3. Tell the teacher in one German line where the lesson is, for example `Ich lege die Stunde in Stunden/<Name des Stundenordners> an.`

## 3. Orchestration

Read `${CLAUDE_PLUGIN_ROOT}/skills/lesson-conventions/orchestration.md` and follow it, deciding the first step as its Next step says (the author of round 1 of the planning loop), with these values:

- the plugin root: `Plugin root` above;
- the working folder: the absolute path of the working folder;
- the lesson folder: the absolute path of the lesson folder you created;
- the `notebook` setting: `OneNote notebook` above;
- the `plan_checkpoint` value: `Plan checkpoint` above;
- the `planning_model` value: `Planning model` above;
- the `board_model` value: `Board model` above.

From here on, `Abbrechen` and every stop work as `orchestration.md` says, and `stunde.md` holds the state.
