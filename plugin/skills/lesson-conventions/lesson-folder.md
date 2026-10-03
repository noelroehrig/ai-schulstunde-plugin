# Lesson folder

How the orchestrators create and keep a lesson folder. Read together with `SKILL.md` of `lesson-conventions`.

## Folder naming

Every lesson gets one folder in `Stunden/` of the working folder.

- Name it with the `Seitentitel` scheme from `## Ablage` in `onenote.md`, so that folder and OneNote page match.
- Without a scheme, use `JJJJ-MM-TT Klasse Thema`: the lesson date if known, else today. Example: `2026-10-07 6b Bruchrechnung`.
- Remove characters that are invalid in Windows file names (`< > : " / \ | ? *`). Keep umlauts and ß.
- If a folder with that name already exists, append ` (2)`, ` (3)`, and so on: the first free one. Never reuse or write into an existing lesson folder of another lesson.

## Files and version numbers

| File | Written by | Content |
|---|---|---|
| `stunde.md` | orchestrator | Request, overrides, status, OneNote location (format below). |
| `planung_vN.md` | `lesson-planner` | Plan draft N. |
| `review_vN.md` | `plan-reviewer` | Review of `planung_vN.md`. |
| `rueckmeldung_vN.md` | orchestrator | The teacher's feedback at the checkpoint, guidance at the planning cap, or changes for a revision, that led to `planung_vN.md`. |
| `tafelbild_vN.json` | `board-author` | The exact `replace_page` payload of board round N. |
| `tafelbild-review_vN.md` | `board-reviewer` | Review of board round N. |
| `tafelbild-rueckmeldung_vN.md` | orchestrator | The teacher's guidance at the board cap that led to `tafelbild_vN.json`. |

Rules:

- `## Stand` of `stunde.md` records which versions exist. Version numbers never restart: a draft gets the number after the recorded `Planversion` or `Tafelbildversion`, or 1 when it is `keine`. Plan versions and board versions count separately.
- `review_vN.md` always judges `planung_vN.md`, and `tafelbild-review_vM.md` always judges `tafelbild_vM.json`.
- Teacher input gets the number of the draft it leads to: `rueckmeldung_v<Planversion + 1>.md`, `tafelbild-rueckmeldung_v<Tafelbildversion + 1>.md`. Feedback on `planung_v2.md` is saved as `rueckmeldung_v3.md`, then `planung_v3.md` is written.
- The orchestrator saves the teacher's words verbatim, under the heading `# Rückmeldung zu planung_v<N-1>.md` or `# Rückmeldung zu tafelbild_v<M-1>.json`.
- Earlier versions stay as they are. Because a new draft always gets the number after the recorded version, no file of an earlier version is written again.
- A versioned file that `## Stand` does not record (as draft, `Prüfbericht`, `Rückmeldung`, or `Freigegebener Plan`) comes from an interrupted agent run: it is never an input, and the agent's next run writes the same path again. This is the only case in which a versioned file is overwritten.
- Pass every path explicitly in the assignment. Agents never pick "the latest" file.

## `stunde.md`

Write `stunde.md` when the lesson folder is created, in exactly this format:

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
Prüfbericht: <Dateiname oder „keiner“>
Rückmeldung: <Dateiname oder „keine“>

## OneNote
Abschnitt: <Name oder „offen“>
Seitentitel: <Titel oder „offen“>
Seiten-ID: <ID oder „keine“>
Alte Seite: <Titel oder „keine“>

## Übernommene Mängel
- <Mangel oder „keine“>

## Verlauf
- <JJJJ-MM-TT>: <ein Satz, was passiert ist>
```

`## Stand` and `## OneNote` hold the whole state of the lesson. The procedure reads state only from these two sections, never from `## Verlauf` and never from which files exist or which is newest.

The lines of `## Stand`:

- `Schritt`: the step the lesson is in. `Planung` is the planning loop, `Prüfpunkt` the checkpoint (and the OneNote gate after it), `Tafelbild` the board loop, which exists only after the OneNote gate passed. `Fertig` and `Abgebrochen` end the procedure.
- `Runde`: the round of the recorded draft in the current loop, `0` when the current loop has no draft yet. The current loop is the planning loop while `Schritt` is `Planung`, the board loop while it is `Tafelbild`.
- `Planversion`: the number N of the last plan draft whose planner returned `DONE`, or `keine`. In the planning loop, the recorded draft is `planung_v<Planversion>.md`; its review is `review_v<Planversion>.md`.
- `Freigegebener Plan`: the plan of the last `APPROVED` verdict or `So übernehmen` in the planning loop, written together with `Schritt: Prüfpunkt`; `keiner` before that, and again from the start of a revision until then. The checkpoint shows it to the teacher, and the board loop works from it.
- `Tafelbildversion`: the number M of the last board version whose board author returned `DONE`, or `keine`. In the board loop, the recorded draft is `tafelbild_v<Tafelbildversion>.json`; its review is `tafelbild-review_v<Tafelbildversion>.md`.
- `Prüfbericht`: the last review whose verdict was read, or `keiner`.
- `Rückmeldung`: the teacher input that started the current loop (`rueckmeldung_vN.md` or `tafelbild-rueckmeldung_vM.md`), an input of every round of that loop; `keine` when the loop started without teacher input.

The lines of `## OneNote`:

- `Abschnitt`: the name of the OneNote section of the page, `offen` until the OneNote gate passed.
- `Seitentitel`: the title of the page, `offen` until the OneNote gate passed.
- `Seiten-ID`: the ID of the page, written only from the board author's `DONE` line; `keine` until then.
- `Alte Seite`: the title of the page of an earlier version of this lesson that the teacher should delete after a revision, or `keine`. The plugin never reads or writes that page.

Rules:

- The labels are German because the teacher may open the file. Keep them exactly as above.
- Write the values in German. Numbers use a decimal comma, for example `Stundenlänge: 67,5 Minuten`.
- `Stundenlänge` comes from `schulkontext.md` (`Quelle der Stundenlänge: schulkontext.md`), unless the request overrides it, for example `nur 45 Minuten` (`Quelle der Stundenlänge: Auftrag`).
- When the lesson is created, write every line above: `Schritt: Planung`, `Runde: 0 von 3`, and the rest `keine`, `keiner`, or `offen`.
- Change `## Stand` and `## OneNote` only as the write table of `orchestration.md` says: each write is a single edit of `stunde.md`, made only after its step completed.
- `## Verlauf` is a log for the teacher: append exactly one line for every write and every stop, and never rewrite earlier lines. It is written but never read to decide a step.
- When the teacher accepts open Muss-Mängel at a cap (`So übernehmen`), list them under `## Übernommene Mängel`; otherwise that section holds `- keine`.
