# Board

How the `board-author` turns the `## Tafelbild (Inhalt)` of an approved plan into a OneNote page, and how the `board-reviewer` checks it. Read together with `SKILL.md` of `lesson-conventions`. The teacher's specifics come from `onenote.md` (`## Ansicht`, `## Vorlagen`, `## Seitenaufbau`) and the `## Tafelbild` part of `kriterien.md`.

## Payload format

A page is written as one payload `{ page_id, title, outlines, images? }`. Use only the fields below. Anything else is an error: other item types (`inline_image` and tables included) and unknown keys anywhere.

- `page_id`: the page ID, a non-empty string.
- `title`: the page title, a non-empty string (the assignment's `page_title`).
- `outlines`: an array of outlines. Units are points.
- Outline: `{ position?, width?, items }`.
  - `position`: `{ x, y, z? }` with `x >= 0`, `y >= 0`, and an integer `z`. Never negative: a negative coordinate breaks reading the page back.
  - `width`: a number greater than 0.
  - `items`: a non-empty array of paragraphs, lists, and image placeholders.
- Paragraph: `{ "type": "paragraph" }` with exactly one of `text` (a string) or `segments` (an array of runs), and optionally:
  - `style`: `normal`, or `h1` to `h6`.
  - `bold`, `italic`, `underline`, `strikethrough`: booleans.
  - `color`, `highlight`: `#RGB` or `#RRGGBB`.
  - `font_size`: a number greater than 0.
  - `font_family`: letters, digits, spaces, `,`, `.`, `-`; at most 64 characters.
- Run: `{ text }` (a string) with the same optional `bold`, `italic`, `underline`, `strikethrough`, `color`, `highlight`, `font_size`, `font_family`. A run has no `style`.
- List: `{ "type": "list", "style": "bullet" | "numbered", "items": [...] }`. Each list item is `{ text | segments, children? }`, with exactly one of `text` or `segments`; `children` is an array of list items, nested the same way. A list item has no formatting fields of its own: to size or color it, use `segments`.
- Image placeholder: `{ "type": "image_placeholder", "description", "width", "height" }`, the space for a screenshot the teacher pastes later. `description` is a non-empty string, `width` and `height` are numbers greater than 0. It is the last item of its outline. The server shows `description` verbatim as a highlighted label, so it is German, and reserves a box of exactly `width` by `height` below the label.
- `images`: an array of floating images, placed on the page next to the outlines. Omit it when the page has none.
- Floating image: `{ handle, width, height, position }`, all four required. `handle` is a string that starts with `mcpref:`; `width` and `height` are numbers greater than 0; `position` as for an outline.

Example:

```json
{
  "page_id": "<page_id>",
  "title": "6a Brüche als Anteile",
  "outlines": [
    {
      "position": { "x": 121, "y": 183 },
      "width": 855,
      "items": [
        { "type": "paragraph", "text": "Die Pizza", "font_size": 20 },
        { "type": "list", "style": "bullet", "items": [{ "segments": [{ "text": "in 8 Stücke geteilt", "font_size": 20 }] }] }
      ]
    }
  ],
  "images": [
    { "handle": "mcpref:<handle>", "width": 940, "height": 88, "position": { "x": 36, "y": 71 } }
  ]
}
```

## Template pages

`## Vorlagen` of `onenote.md` may name three pages of the teacher's notebook, each as `<Abschnitt> / <Seitentitel>`: the `Banner-Seite`, the `Symbol-Seite`, and the `Vorbild-Seite`. A line is set when its value is neither empty nor a placeholder in square brackets. The orchestrator finds the pages at the OneNote gate and passes their IDs as `banner_page_id`, `symbol_page_id`, and `model_page_id`, each empty when its line is not set.

- The board agents call `get_page` on these IDs, read-only. Never `replace_page`, `create_page` with them as parent, or any other write.
- A template image and its label sit in one outline: an `inline_image` item and paragraph text. The label is the text of that outline's paragraphs, joined with a space and trimmed. An image without such an outline has no label and is never used. `einrichten` checks this convention.
- A handle does not identify an image: the same image gets a new handle when it is written to a page, and a handle can go stale when the server restarts. So take every handle from a `get_page` of the template page in your own run, never from an earlier payload, and identify an image by its template page and its label, never by its handle.
- Size: the `width` and `height` that `get_page` reports for the template image give its aspect ratio. Set the floating image's `width` as Layout says, and `height = width * template height / template width`, rounded to one decimal.
- `Banner je Phase` under `## Vorlagen` maps each phase of the Phasenmodell to a banner label of the Banner-Seite, as lines `- <Phase>: <Beschriftung>`, or to `keins` for no banner.
- The Vorbild-Seite is a finished page of the teacher. The author reads it for font sizes, colors, spacing, and how the text is phrased, and follows that style. The numbers of `## Seitenaufbau` win over anything read from it.

## Writing a page

- Round 1 (`page_id:` empty): call `create_page` with the assignment's `section_id` and `page_title`, and with `parent_page_id` when the assignment's `parent_page_id` is not empty. It sets only the title and returns the new page ID. Then call `replace_page` with the content on that ID.
- Later rounds, and round 1 with a `page_id`: call `replace_page` on the assignment's `page_id`. Never create a second page.
- `replace_page` deletes everything on the page except the title and the objects of the top-level `unsupported` list of `get_page`, such as handwriting on the page, which stay in place. It has no conflict check. Call it only on the page of this board loop: the ID returned by your own `create_page`, or the `page_id` of your assignment. Never on any other page.
- With a `page_id`, read the page first, as The existing page says.
- Pass `page_id`, `title`, `outlines`, and `images` (when the payload has floating images) to `replace_page`. Never pass `image_labels`.
- Never use `append_page` or a raw-XML tool to write the Tafelbild.
- Finish with `DONE <output path> page_id=<id>`.

## The existing page

With a `page_id`, the page exists already, and the teacher may have written on it, for example at the board checkpoint or before a revision on the existing page. The author reads it with `get_page` before writing:

- Every object of the top-level `unsupported` list, handwriting or a drawing on the page, stays in place through `replace_page`. It is an element at its `position`, `width`, and `height` that no other element may overlap: lay the page out around it.
- An item with `type` `unsupported` and `kind` `ink` inside an outline is handwriting in a text box, which `replace_page` would delete. It is never deleted: the author stops with `FAILED`.
- All other content of the page, typed text, tables, files, and pasted images included, is replaced.
- An outline the author keeps unchanged, with the same items and width, takes its measured `height` from this read instead of the estimate.

## `tafelbild_vN.json`

The file holds the arguments passed to `replace_page` (`page_id`, `title`, `outlines`, and `images` when there are floating images) in the payload format above, plus the key `image_labels`, which is not sent. It is one JSON object.

- `image_labels`: one entry `{ "handle", "template", "label" }` per floating image, in the order of `images`: the image's `handle`, `template` `banner` or `symbol`, and its label on that template page. Omit it when `images` is omitted.

Write it to the assignment's `output` immediately before the `replace_page` call, with the same values you pass. In round 1 without a `page_id`, write it after `create_page`, so that it holds the real `page_id`.

## Visible area

The `## Ansicht` in `onenote.md` counts as configured only when `Sichtbare Breite`, `Sichtbare Höhe`, and `Mindestschriftgröße` are numbers (decimal comma allowed). A template placeholder such as `[Punkte]` means not configured.

The layout is positioned when the Ansicht is configured or a template page is set. In a positioned layout, every outline has `position` and `width`, and every floating image has its four fields.

With a configured Ansicht:

- For every outline and every floating image, `x + width` is at most the `Sichtbare Breite`. Never horizontal scrolling. The notes for the teacher are the only exception.
- Every paragraph with `text` and every run has its own explicit `font_size`, at least the `Mindestschriftgröße`. List items therefore use `segments`. The notes for the teacher have an explicit `font_size` too, but the minimum does not apply to them.
- Colors come only from the `Farben` list, each with the meaning given there, and from the `Notizfarbe` for the notes.
- A board taller than the `Sichtbare Höhe` is split into phase blocks, so that the teacher scrolls down once per block. No block is taller than the `Sichtbare Höhe`.

Without a configured Ansicht:

- Outside a positioned layout, `position` and `width` may be omitted.
- Set font sizes explicitly anyway: 32 pt for the Stundenthema, 24 pt for block headings, 20 pt for text. The server's heading styles are fixed CSS (`h1` is 16 pt), too small for projection.
- Use few colors, each with one meaning.

## Page layout

`## Seitenaufbau` of `onenote.md` sets the grid. A line counts as set when its value is a number (decimal comma allowed), or `ja` or `nein`; a missing line or a placeholder means not set.

- `Stundenthema als erste Zeile`: `ja` or `nein`; `ja` when not set.
- `Inhalt ab`: the y at which content starts, below the page title and its date. 71 when not set. No element starts above it.
- `Text bei x`: the x of every text outline of a phase block.
- `Symbole bei x`: the x of every symbol. When not set, a symbol stands at `Text bei x`, and its text outline starts 12 pt right of the symbol.
- `Banner bei x` and `Bannerbreite`: the x and the width of every banner. When not set, a banner starts at `Text bei x`, or at 36 when that is not set either, and is as wide as the Sichtbare Breite allows from there; without a configured Ansicht it keeps the width of its template image.

## Heights

OneNote sets the height of an outline itself. `get_page` reports it as the outline's measured `height`, but only once the outline is written. Before writing, the author estimates it like this:

- The line height is 1.3 times the font size.
- A paragraph or list item takes `ceil(characters * 0.5 * font_size / width)` lines, at least 1. `characters` counts all characters of its text or of all its runs; with runs of different sizes, use the largest `font_size`.
- An image placeholder takes its `height` plus one line for its label, counted at 26 pt.
- An outline's height is the sum of the heights of its items.
- A floating image's height is its `height`.
- An element is an outline, a floating image, or an object of the top-level `unsupported` list of the existing page. Its box runs from `x` to `x + width` and from `y` to `y + height`.
- A symbol and the text outline it marks start at the same `y`; together they are a row as tall as the taller of the two.
- The next element below starts at least 24 pt below the estimated end of the element above: `y_next >= y + height + 24`.
- A phase block runs from the top of its first element (its banner, when it has one) to the end of its last element. The notes for the teacher do not count.
- No two elements overlap: their boxes share no area.

Without a positioned layout, estimate only outlines that have a `width`. The author lays the page out by the estimate, using the measured `height` of every outline it keeps unchanged from the existing page. The reviewer uses the measured heights of the read-back and calls them measured (`gemessen`); only for an outline without a measured `height` it uses the estimate and calls it an estimate (`geschätzt`).

## Layout

- With `Stundenthema als erste Zeile: ja`, the Stundenthema comes first: one outline at `y` = `Inhalt ab` with a paragraph of `style` `h1` and an explicit `font_size`. With `nein`, the page shows no Stundenthema, also when `## Tafelbild (Inhalt)` names it.
- Then one phase block per phase of `## Tafelbild (Inhalt)`, in the order of the plan's phases.
- Banner: with a Banner-Seite, every phase block starts with the banner that `Banner je Phase` maps its phase to, a floating image at `Banner bei x` with the `Bannerbreite`, above the block's text. A phase mapped to `keins` gets no banner. A phase without a line under `Banner je Phase`, or a label the Banner-Seite does not have, is never guessed: the author stops with `FAILED`.
- Text: the outlines of a block at `Text bei x`. Keywords and short phrases from `## Tafelbild (Inhalt)`, not sentences. A Merksatz the plan names is the exception.
- Symbols: with a Symbol-Seite, a symbol may mark an item when its label names what the item is, for example a symbol labeled `Merke` before a Merksatz. The marked item is an outline of its own, and the symbol a floating image at `Symbole bei x` at the same `y`. Never a symbol whose label does not fit, and never an image of a template page as decoration.
- Buchaufgabe: an item of `## Tafelbild (Inhalt)` that starts with `Buchaufgabe:` becomes a paragraph with the text after `Buchaufgabe:`, followed by an image placeholder as the last item of the same outline, with `description` `Screenshot <text after Buchaufgabe:> hier einfügen` and the size that Screenshot size gives.
- Every item of `## Tafelbild (Inhalt)` appears, except the Stundenthema with `Stundenthema als erste Zeile: nein`. Nothing is added, except the Stundenthema line, banners, symbols, the placeholders of Buchaufgaben, and the notes for the teacher.
- Glossary terms verbatim.
- Few colors, each with one meaning.
- No tables and no inline images: the server has no table item, and images inside outlines are not verified.

## Screenshot size

A placeholder is as large as the screenshot of its task should appear on the page, never a fixed size.

- Aspect ratio: the `Seitenverhältnis` that `material/anhaenge.md` records for the task, found by its page and number. Without one, estimate the shape of the task's area in the book from what `anhaenge.md`, the material, or the plan say about it: a wide strip for a task of one or two lines, a taller shape for a longer text or a task with a figure or a table.
- Width: the `width` of its outline, so that the book's text stays about as readable as the board's text.
- Height: `width * Höhe / Breite` of the aspect ratio, rounded to one decimal.
- When its phase block would then be taller than the Sichtbare Höhe, reduce the width, keeping the aspect ratio, until the block fits.

## Notes for the teacher

`Notizfarbe` under `## Ansicht` of `onenote.md` is set when it is a color `#RRGGBB`. Only with a configured Ansicht and a set Notizfarbe, the author adds notes for the teacher to the right of the visible area, where the class does not see them:

- At most one notes outline per phase block, at the `y` of the block, with `x` at least the `Sichtbare Breite` plus 24. Its width is free.
- Every paragraph with `text` and every run has `color` the Notizfarbe and an explicit `font_size`.
- Content only from the plan, for that phase: the minutes and the Sozialform of its rows in `## Verlaufsplan`, solutions and expected answers the plan states, and preparation from `## Material`. Keywords, not sentences. Nothing invented, and nothing for the class.

## Review

The `board-reviewer` reads the page back with `get_page`. The read-back has the title, outlines with position, width, and measured height, paragraphs and lists with text, heading level, and inline formatting, floating images with position, width, and height, and as `unsupported` what the server cannot write: tables, files, and handwriting, inside outlines or in the top-level `unsupported` list. It loses formatting: a paragraph's `font_size` can vanish, and runs can come back merged into one plain paragraph. An image gets a new handle on the page, so a handle of the read-back never matches the payload. An image placeholder comes back as a paragraph with its `description`; how its box comes back is not documented, so an item without text of its own directly after that paragraph, in the same outline, belongs to the placeholder.

Each of these is a Muss-Mangel. On the read-back:

- The title differs from `page_title`.
- With `Stundenthema als erste Zeile: ja`, the Stundenthema is not the first element.
- The phase blocks are not in the phase order of the plan.
- An item of `## Tafelbild (Inhalt)` is missing, or content is on the page that the plan does not name. The exception and the additions that Layout allows are neither, and neither is the teacher's handwriting of the top-level `unsupported` list.
- Text that is not German, or a glossary term that is not verbatim.
- In a positioned layout, an outline without `position` and `width`.
- With a configured Ansicht, an element with `x + width` greater than the Sichtbare Breite, the notes for the teacher excepted.
- An element whose `y` is less than `Inhalt ab`.
- Text of the page that differs from the text of the payload, a number of floating images that differs from the payload, or a floating image more than 1 pt away from its position in the payload.
- A phase block taller than the Sichtbare Höhe, or two elements that overlap, by the measured heights (Heights); an overlap with an object of the top-level `unsupported` list included.

On `tafelbild_vN.json`:

- A paragraph with `text` or a run without an explicit `font_size`, or one below the Mindestschriftgröße (or the default sizes without an Ansicht), the notes for the teacher excepted.
- With a configured Ansicht, a color that is not in the Farben list or is used against its meaning.
- A Stundenthema without the `h1` style.
- With a Banner-Seite, a phase block that does not start with the banner `Banner je Phase` maps its phase to, by `image_labels`; or a label in `image_labels` that its template page does not have.
- An item starting with `Buchaufgabe:` without its image placeholder; a placeholder wider than its outline; or one whose `width / height` differs by more than 5 % from the `Seitenverhältnis` that `material/anhaenge.md` records for its task.
- Notes for the teacher that are not in the Notizfarbe, that start left of the Sichtbare Breite plus 24, or that hold content the plan does not name.

Under `## Nachrechnung`, write one line per element with `x + width`, for example `48 + 928 = 976 (Sichtbare Breite 1024): erfüllt`, one line per block with its height from the top of its first element to the end of its last, for example `Einstieg: 136,6 bis 331,8, Höhe 195,2 gemessen (Sichtbare Höhe 768): erfüllt`, and one line with the smallest `y`, for example `kleinstes y 71 (Inhalt ab 71): erfüllt`.

OneNote rewrites colors (`#C00000` can come back as `#9C0000`) and loses paragraph formatting in the read-back. A formatting difference between `tafelbild_vN.json` and the read-back is therefore never a finding. Rendering on the presenting device and contrast cannot be checked; the teacher's look at the page covers them.
