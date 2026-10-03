# Notes on the examples

Both examples were written for the plugin. Values, class, and topic are made up. They show the expected quality, not content to copy. The board arithmetic below uses a decimal point, as in the JSON; in a plan or review, write a decimal comma.

## `plan.md`

- **Format:** the title line, the header line, and the eight headings of the lesson plan format in `SKILL.md`, in order. The line `> Beispiel: ...` marks it as an example.
- **Phases and times:** Einstieg 7,5, Erarbeitung 25, Sicherung 12,5 minutes. `7,5 + 25 + 12,5 = 45`, exactly the Stundenlänge, and the bold sum row says `45`. The durations use a decimal comma. The phase names are the ones of an assumed Phasenmodell, used verbatim.
- **Einordnung and Lernziele:** the lesson's place in the series and observable Lernziele (erklären, benennen, darstellen), each one practiced in a phase.
- **Differenzierung:** support and extension for groups (`Schülerinnen und Schüler, die mehr Unterstützung brauchen`, `Leistungsstärkere Schülerinnen und Schüler`), never names.
- **Tafelbild (Inhalt):** short items per phase, which the board turns into a layout. The planning reviewer judges this content, the board loop does not change it.
- **Besondere Regeln:** `- keine`, because the assumed `schulkontext.md` has no special rules. With rules, each one gets a line saying how the plan respects it.

## `board.json`

The payload for the `## Tafelbild (Inhalt)` of `plan.md`, exactly what the `board-author` writes to `tafelbild_vN.json`. `page_id` is `beispiel`, a stand-in for a real ID.

### Example Ansicht

The board is laid out for this `## Ansicht` in `onenote.md`:

```
Sichtbare Breite: 1024 pt
Sichtbare Höhe: 768 pt
Mindestschriftgröße: 20 pt
Farben:
- #1F4E79: Überschriften
- #C00000: Wichtiges
```

### Structure and keywords

- Outline 1: the Stundenthema `Brüche als Anteile`, `h1`, 32 pt, heading color.
- Outline 2, Einstieg: `Die Pizza`, `in 8 Stücke geteilt`, `5 von 8 Stücken übrig`.
- Outline 3, Erarbeitung: `Zähler und Nenner`, the fraction `5/8` at 32 pt, and one line each for Zähler and Nenner. The plan's arrows become the labels `Zähler (5):` and `Nenner (8):`, because images are a non-goal.
- Outline 4, Sicherung: `Merksatz`, the Merksatz from the plan (the one sentence on the board, because the plan names it as such), and the examples `1/2`, `1/4`, `3/4` as a bullet list.

Every item of `## Tafelbild (Inhalt)` appears, in plan order, and nothing is added. Text lines are keywords and short phrases. Block headings are 24 pt, text 20 pt, the minimum. Two colors with one meaning each: `#1F4E79` for headings, `#C00000` for the important terms Zähler, Nenner, and the Merksatz. List items use `segments` so that they carry an explicit `font_size`.

### Horizontal geometry

Every outline has `x` 48 and `width` 928: `48 + 928 = 976`, at most 1024. A margin of 48 pt stays on each side.

### Estimated heights

Line height is `1.3 * font_size`: 41.6 at 32 pt, 31.2 at 24 pt, 26 at 20 pt. Every line fits on one line at width 928; the longest is `Nenner (8): in wie viele gleich große Teile geteilt`, 51 characters: `ceil(51 * 0.5 * 20 / 928) = ceil(0.55) = 1`.

| Outline | y | Estimated height | Estimated end |
|---|---|---|---|
| 1 Stundenthema | 24 | 41.6 | 65.6 |
| 2 Einstieg | 89.6 | 31.2 + 26 + 26 = 83.2 | 172.8 |
| 3 Erarbeitung | 196.8 | 31.2 + 41.6 + 26 + 26 = 124.8 | 321.6 |
| 4 Sicherung | 345.6 | 31.2 + 26 + 26 + 3 * 26 = 161.2 | 506.8 |

Each `y` is the previous estimated end plus 24, for example `65.6 + 24 = 89.6`. The whole board ends at an estimated 506.8 pt, inside the Sichtbare Höhe of 768 pt, so the class sees it without scrolling. These heights are estimates: the server cannot report them.
