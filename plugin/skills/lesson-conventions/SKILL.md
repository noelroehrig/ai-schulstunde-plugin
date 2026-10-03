---
name: lesson-conventions
description: Shared conventions of the unterricht plugin, used by its agents and entry points.
user-invocable: false
---

# Lesson conventions

These conventions bind every agent and entry point of the plugin. Follow them exactly.

## Language

Who reads it decides the language.

- These instructions are English, because only Claude reads them.
- Everything you write is German: plans, reviews, OneNote content, messages to the user. Use real umlauts and ß.
- English constants are written exactly as defined, never translated or paraphrased: the verdict tokens `APPROVED` and `REVISE`, the result-line tokens `DONE` and `FAILED`, the assignment keys, `page_id=`, and file names such as `planung_vN.md`.
- Line 1 of a review is the verdict token, nothing else. The rest of the review is German.
- Numbers in German text use a decimal comma: `7,5`, never `7.5`.

## Glossary

These German terms are never translated. Use them verbatim, also inside English text.

| Begriff | Meaning |
|---|---|
| Tafelbild | The board picture shown to the class; in this plugin a OneNote page. |
| Einstieg | Opening phase that activates prior knowledge and motivates the topic. |
| Erarbeitung | Phase in which students work out the new content. |
| Sicherung | Phase that consolidates and records the results. |
| Lernziel | A learning objective of the lesson. |
| Differenzierung | Adapting tasks or support to different groups of learners. |
| Stundenthema | The topic of the lesson: the title of the plan and the first line of the Tafelbild. The OneNote page title is the assignment's `page_title`, not the Stundenthema. |
| Verlaufsplan | The timed table of the lesson's phases. |
| Sozialform | The grouping of students in a phase. |
| Einzelarbeit | Students work alone. |
| Partnerarbeit | Students work in pairs. |
| Gruppenarbeit | Students work in small groups. |
| Plenum | The whole class together. |
| Hausaufgabe | Homework. |
| Material | Worksheets, texts, objects, and media used in the lesson. |

The phase names in the teacher's `## Phasenmodell` (in `schulkontext.md`) are used verbatim as well. Never rename, merge, or invent a phase.

## Working folder

The working folder belongs to the teacher. Its files and their roles:

| File | Role |
|---|---|
| `CLAUDE.md` | Short German pointer to the files below, for the teacher. |
| `schulkontext.md` | School, Stundenlänge, Phasenmodell, special rules. |
| `kriterien.md` | The teacher's criteria, Muss and Soll, used by both reviewers. |
| `onenote.md` | Ablage (section and page title scheme) and the optional Ansicht. |
| `material/` | Curricula and templates of the teacher. |
| `Stunden/<lesson folder>/` | One folder per lesson, holding the files below. |
| `stunde.md` | The request, overrides, status, and OneNote location of the lesson. |
| `planung_vN.md` | Plan draft N. |
| `review_vN.md` | Review of `planung_vN.md`. |
| `rueckmeldung_vN.md` | Teacher feedback or guidance that led to `planung_vN.md`. |
| `tafelbild_vN.json` | The exact page payload the board author sent in board round N. |
| `tafelbild-review_vN.md` | Review of board round N. |
| `tafelbild-rueckmeldung_vN.md` | Teacher guidance at the board cap that led to `tafelbild_vN.json`. |

Rules for agents:

- Read `schulkontext.md`, then `kriterien.md`, before anything else.
- Write only the `output` named in your assignment.
- Never change the teacher's own files: `CLAUDE.md`, `schulkontext.md`, `kriterien.md`, `onenote.md`, and anything in `material/`.
- Use only the paths your assignment lists. Never pick "the latest" file yourself.

Entry points have no assignment. They follow `lesson-folder.md` and `orchestration.md` instead. They never overwrite the teacher's own files either; only `einrichten` may change one, and only after showing the change and getting a yes.

## Assignment and result line

An orchestrator starts an agent with an assignment in exactly this shape:

```
working_folder: <absolute path>
lesson_folder: <absolute path>
round: <n> of 3
inputs:
- <absolute path>
output: <absolute path>
```

Board agents also get these lines; `page_id:` is empty when the page does not exist yet:

```
section_id: <OneNote section ID>
page_title: <page title>
page_id: <OneNote page ID or empty>
```

The final message of every agent is exactly one line and nothing else:

- `DONE <output path>` when the output is written.
- The board author: `DONE <output path> page_id=<id>`.
- `FAILED <reason in German>` when the work cannot be done.

## Lesson plan format

Every plan has exactly this structure:

```markdown
# <Stundenthema>

Klasse: <Klasse> · Fach: <Fach> · Datum: <Datum oder „offen“> · Stundenlänge: <Minuten> Minuten

## Einordnung
## Lernziele
## Verlaufsplan
| Zeit (Min.) | Phase | Unterrichtsgeschehen | Sozialform | Material/Medien |
|---|---|---|---|---|
| <Minuten> | <Phase> | <Unterrichtsgeschehen> | <Sozialform> | <Material/Medien> |
| **<Summe>** | | | | |
## Differenzierung
## Material
## Hausaufgabe
## Tafelbild (Inhalt)
## Besondere Regeln
```

Rules:

- `Zeit` holds durations in minutes, not clock times, with a decimal comma (`7,5`).
- The durations add up exactly to the Stundenlänge. The last row holds only the bold sum in the first column.
- The Stundenlänge comes from `stunde.md`.
- Phase names come from the Phasenmodell in `schulkontext.md`.
- `## Tafelbild (Inhalt)` lists short items per phase: what the Tafelbild must show.
- `## Besondere Regeln` states how each special rule of `schulkontext.md` is respected, or says `keine`.

## Review format

Every review, of a plan or of a Tafelbild, has exactly this structure:

```markdown
REVISE

## Muss-Mängel
1. <Mangel>

## Soll-Hinweise
- <Hinweis>

## Nachrechnung
- <Rechnung>: <erfüllt oder nicht erfüllt>

## Frühere Muss-Mängel
- <Mangel>: <behoben oder offen>
```

Rules:

- Line 1 is exactly `APPROVED` or `REVISE`.
- After line 1 come exactly these headings in this order: `## Muss-Mängel`, `## Soll-Hinweise`, `## Nachrechnung`, `## Frühere Muss-Mängel`.
- `APPROVED` exactly when there are no Muss-Mängel. Soll-Hinweise never block.
- `## Muss-Mängel` lists only the defects that are open now, numbered. An empty section holds `- keine`.
- Under `## Nachrechnung`, every criterion that is a number gets one line with the computation, for example `7,5 + 25 + 12,5 = 45 (Stundenlänge 45): erfüllt`.
- `## Frühere Muss-Mängel` has one line per Muss-Mangel of the previous review: `- <Mangel>: behoben` or `- <Mangel>: offen`. An open one is also listed under `## Muss-Mängel`. When your assignment lists no previous review, the section holds `- keine`.
- Raise a new Muss-Mangel only for an actual violation of `kriterien.md` or `schulkontext.md`.
- A conflict between teacher feedback and `kriterien.md` is a Soll-Hinweis, never a Muss-Mangel. The teacher's feedback wins.

## Personal data

Never write names or other personal data of students, in any file, review, or OneNote page. Describe groups instead, for example `leistungsstärkere Schülerinnen und Schüler`.
