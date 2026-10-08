# Notes on the examples

Both examples were written for the plugin. Values, class, and topic are made up. They show the expected quality, not content to copy. The board arithmetic below uses a decimal point, as in the JSON; in a plan or review, write a decimal comma.

## `plan.md`

- **Format:** the title line, the header line, and the eight headings of the lesson plan format in `SKILL.md`, in order. The line `> Beispiel: ...` marks it as an example.
- **Phases and times:** Einstieg 7,5, Erarbeitung 25, Sicherung 12,5 minutes. `7,5 + 25 + 12,5 = 45`, exactly the Stundenlänge, and the bold sum row says `45`. The durations use a decimal comma. The phase names are the ones of an assumed Phasenmodell, used verbatim.
- **Einordnung and Lernziele:** the lesson's place in the series and observable Lernziele (erklären, benennen, darstellen), each one practiced in a phase.
- **Differenzierung:** support and extension for groups (`Schülerinnen und Schüler, die mehr Unterstützung brauchen`, `Leistungsstärkere Schülerinnen und Schüler`), never names.
- **Tafelbild (Inhalt):** short items per phase, which the board turns into a layout. The planning reviewer judges this content, the board loop does not change it. `Buchaufgabe: S. 52, Nr. 1 bis 3` marks the book task whose screenshot the teacher pastes onto the board; the book page is named under `## Material`, and the assumed `material/anhaenge.md` records `Seitenverhältnis: 3:1` for this task.
- **Besondere Regeln:** `- keine`, because the assumed `schulkontext.md` has no special rules. With rules, each one gets a line saying how the plan respects it.

## `board.json`

The payload file for the `## Tafelbild (Inhalt)` of `plan.md`, exactly what the `board-author` writes to `tafelbild_vN.json`: the `replace_page` arguments plus `image_labels`. `page_id` is `beispiel`, a stand-in for a real ID, and the handles `mcpref:0000000000b1` and so on stand in for the handles a `get_page` of the template pages returns.

### Example `onenote.md`

The board is laid out for these parts of `onenote.md`:

```
## Ansicht
Sichtbare Breite: 1024 pt
Sichtbare Höhe: 768 pt
Mindestschriftgröße: 20 pt
Farben:
- #1F4E79: Überschriften
- #C00000: Wichtiges
Notizfarbe: #7030A0

## Vorlagen
Banner-Seite: Vorlagen / Banner
Symbol-Seite: Vorlagen / Symbole
Vorbild-Seite: [Abschnitt / Seitentitel einer fertigen Tafelbild-Seite]
Banner je Phase:
- Einstieg: Einstieg
- Erarbeitung: Erarbeitung
- Sicherung: Sicherung

## Seitenaufbau
Stundenthema als erste Zeile: ja
Inhalt ab: 71 pt
Text bei x: 121 pt
Symbole bei x: 36 pt
Banner bei x: 36 pt
Bannerbreite: 940 pt
```

On the assumed template pages, the banners are 1175 pt wide and 110 pt high, and the symbol `Merke` is 120 by 120 pt, each in one outline with its label.

### Structure and keywords

- The Stundenthema `Brüche als Anteile` at `Inhalt ab` (y 71), `h1`, 32 pt, heading color, because `Stundenthema als erste Zeile` is `ja`.
- Einstieg: the banner `Einstieg`, then `Die Pizza`, `in 8 Stücke geteilt`, `5 von 8 Stücken übrig`.
- Erarbeitung: the banner `Erarbeitung`, then `Zähler und Nenner`, the fraction `5/8` at 32 pt, and one line each for Zähler and Nenner. The plan's arrows become the labels `Zähler (5):` and `Nenner (8):`, because the board has no drawings.
- Sicherung: the banner `Sicherung`; the Merksatz from the plan (the one sentence on the board, because the plan names it as such) in its own outline, marked by the symbol `Merke`, whose label names what the item is; the examples `1/2`, `1/4`, `3/4` as a bullet list; the Buchaufgabe as the line `S. 52, Nr. 1 bis 3` with an image placeholder below it, sized to the screenshot of the task.
- Notes for the teacher: one outline per block at x 1048, in the Notizfarbe at 14 pt, with the minutes and Sozialform of the phase and what to lay out from `## Material`.

Every item of `## Tafelbild (Inhalt)` appears, in plan order. Added are only what Layout of `board.md` allows: the Stundenthema line, the banners, the symbol, the placeholder, and the notes. Text lines are keywords and short phrases. Block headings are 24 pt, text 20 pt, the minimum. Two colors with one meaning each: `#1F4E79` for headings, `#C00000` for the important terms Zähler, Nenner, and the Merksatz; the notes use only the Notizfarbe. List items use `segments` so that they carry an explicit `font_size`. `image_labels` names the template and label of each floating image, in the order of `images`.

### Horizontal geometry

- Stundenthema and banners: `36 + 940 = 976`, at most 1024.
- Text outlines: `121 + 855 = 976`.
- Symbol: `36 + 66 = 102`, left of the text at 121.
- Notes: x 1048 is the Sichtbare Breite plus 24, so the class does not see them; they are the only elements beyond 1024.

### Sizes of the images

Banner: `height = 940 * 110 / 1175 = 88`. Symbol: width 66, `height = 66 * 120 / 120 = 66`. Placeholder: the width of its outline, 855, and `height = 855 * 1 / 3 = 285` from the `Seitenverhältnis` 3:1, so that the book text appears about as large as the board text. The Sicherung block fits the Sichtbare Höhe with it, so the width stays.

### Estimated heights

Line height is `1.3 * font_size`: 41.6 at 32 pt, 31.2 at 24 pt, 26 at 20 pt, 18.2 at 14 pt. Every line fits on one line at its width; the longest text line is `Nenner (8): in wie viele gleich große Teile das Ganze geteilt ist`, 65 characters: `ceil(65 * 0.5 * 20 / 855) = ceil(0.76) = 1`.

| Element | y | Estimated height | Estimated end |
|---|---|---|---|
| Stundenthema | 71 | 41.6 | 112.6 |
| Banner Einstieg | 136.6 | 88 | 224.6 |
| Einstieg text | 248.6 | 31.2 + 26 + 26 = 83.2 | 331.8 |
| Banner Erarbeitung | 355.8 | 88 | 443.8 |
| Erarbeitung text | 467.8 | 31.2 + 41.6 + 26 + 26 = 124.8 | 592.6 |
| Banner Sicherung | 616.6 | 88 | 704.6 |
| Merksatz with symbol | 728.6 | larger of 26 and 66 = 66 | 794.6 |
| Beispiele | 818.6 | 26 + 3 * 26 = 104 | 922.6 |
| Buchaufgabe | 946.6 | 26 + 285 = 311 | 1257.6 |

Each `y` is the previous estimated end plus 24, for example `112.6 + 24 = 136.6`. The blocks:

- Einstieg: 136.6 to 331.8, `88 + 24 + 83.2 = 195.2`.
- Erarbeitung: 355.8 to 592.6, `88 + 24 + 124.8 = 236.8`.
- Sicherung: 616.6 to 1257.6, `88 + 24 + 66 + 24 + 104 + 24 + 311 = 641`.

The whole board ends at an estimated 1257.6 pt, taller than the Sichtbare Höhe of 768 pt, so it is split into the three phase blocks, each at most 768 pt: the teacher scrolls down once per block. The placeholder's 285 pt count in the height of its block, so that any element below it would start below them: the server does not reserve them. These heights are estimates: the server cannot report them.
