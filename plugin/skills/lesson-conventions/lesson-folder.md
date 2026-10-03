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
| `rueckmeldung_vN.md` | orchestrator | The teacher's feedback at the checkpoint, or guidance at the planning cap, that led to `planung_vN.md`. |
| `tafelbild_vN.json` | `board-author` | The exact `replace_page` payload of board round N. |
| `tafelbild-review_vN.md` | `board-reviewer` | Review of board round N. |
| `tafelbild-rueckmeldung_vN.md` | orchestrator | The teacher's guidance at the board cap that led to `tafelbild_vN.json`. |

Rules:

- N counts plan drafts across the whole lesson, starting at 1. It never restarts, also not when a fresh cap of 3 starts after feedback.
- `review_vN.md` always judges `planung_vN.md`.
- `rueckmeldung_vN.md` carries the N of the draft it leads to: feedback on `planung_v2.md` is saved as `rueckmeldung_v3.md`, then `planung_v3.md` is written.
- Board versions count separately, starting at 1: `tafelbild-review_vN.md` judges `tafelbild_vN.json`.
- `tafelbild-rueckmeldung_vN.md` carries the board version it leads to: guidance on `tafelbild_v3.json` is saved as `tafelbild-rueckmeldung_v4.md`, then `tafelbild_v4.json` is written.
- The orchestrator saves the teacher's words verbatim, under the heading `# Rückmeldung zu planung_v<N-1>.md` or `# Rückmeldung zu tafelbild_v<N-1>.json`.
- Never overwrite an existing versioned file. The next version gets the next number.
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

## OneNote
Abschnitt: <Name oder „offen“>
Seitentitel: <Titel oder „offen“>
Seiten-ID: <ID oder „keine“>

## Übernommene Mängel
- <Mangel oder „keine“>

## Verlauf
- <JJJJ-MM-TT>: <ein Satz, was passiert ist>
```

Rules:

- The labels are German because the teacher may open the file. Keep them exactly as above.
- Write the values in German. Numbers use a decimal comma, for example `Stundenlänge: 67,5 Minuten`.
- `Stundenlänge` comes from `schulkontext.md` (`Quelle der Stundenlänge: schulkontext.md`), unless the request overrides it, for example `nur 45 Minuten` (`Quelle der Stundenlänge: Auftrag`).
- Update `## Stand` after every step, and append exactly one line to `## Verlauf` for it. Never rewrite earlier `## Verlauf` lines.
- Record the OneNote section, page title, and page ID in `## OneNote` as soon as they are known.
- When the teacher accepts open Muss-Mängel at a cap (`So übernehmen`), list them under `## Übernommene Mängel`; otherwise that section holds `- keine`.
