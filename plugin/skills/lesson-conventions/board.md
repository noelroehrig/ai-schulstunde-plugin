# Board

How the `board-author` turns the `## Tafelbild (Inhalt)` of an approved plan into a OneNote page, and how the `board-reviewer` checks it. Read together with `SKILL.md` of `lesson-conventions`. The teacher's specifics come from `onenote.md` and the `## Tafelbild` part of `kriterien.md`.

## Payload format

A page is written as one payload `{ page_id, title, outlines }`. Use only the fields below. Anything else is an error: other item types, an `images` key, and unknown keys anywhere. Images and tables are non-goals.

- `page_id`: the page ID, a non-empty string.
- `title`: the page title, a non-empty string (the assignment's `page_title`).
- `outlines`: an array of outlines. Units are points.
- Outline: `{ position?, width?, items }`.
  - `position`: `{ x, y, z? }` with `x >= 0`, `y >= 0`, and an integer `z`. Never negative: a negative coordinate breaks reading the page back.
  - `width`: a number greater than 0.
  - `items`: a non-empty array of paragraphs and lists.
- Paragraph: `{ "type": "paragraph" }` with exactly one of `text` (a string) or `segments` (an array of runs), and optionally:
  - `style`: `normal`, or `h1` to `h6`.
  - `bold`, `italic`, `underline`, `strikethrough`: booleans.
  - `color`, `highlight`: `#RGB` or `#RRGGBB`.
  - `font_size`: a number greater than 0.
  - `font_family`: letters, digits, spaces, `,`, `.`, `-`; at most 64 characters.
- Run: `{ text }` (a string) with the same optional `bold`, `italic`, `underline`, `strikethrough`, `color`, `highlight`, `font_size`, `font_family`. A run has no `style`.
- List: `{ "type": "list", "style": "bullet" | "numbered", "items": [...] }`. Each list item is `{ text | segments, children? }`, with exactly one of `text` or `segments`; `children` is an array of list items, nested the same way. A list item has no formatting fields of its own: to size or color it, use `segments`.

Example:

```json
{
  "page_id": "<page_id>",
  "title": "6a Brüche als Anteile",
  "outlines": [
    {
      "position": { "x": 48, "y": 24 },
      "width": 928,
      "items": [
        { "type": "paragraph", "text": "Brüche als Anteile", "style": "h1", "font_size": 32, "color": "#1F4E79" },
        { "type": "list", "style": "bullet", "items": [{ "segments": [{ "text": "Zähler", "font_size": 20 }] }] }
      ]
    }
  ]
}
```

## Writing a page

- Round 1 (`page_id:` empty): call `create_page` with the assignment's `section_id` and `page_title`. It sets only the title and returns the new page ID. Then call `replace_page` with the content on that ID.
- Later rounds: call `replace_page` on the assignment's `page_id`. Never create a second page.
- `replace_page` deletes everything on the page except the title (ink, images, tables included), without a conflict check. Call it only on the page this board loop created: the ID returned by your own `create_page`, or the `page_id` of your assignment. Never on any other page.
- Never use `append_page` or a raw-XML tool to write the Tafelbild.
- Finish with `DONE <output path> page_id=<id>`.

## `tafelbild_vN.json`

The file holds exactly the arguments passed to `replace_page`: `page_id`, `title`, and `outlines`, as one JSON object in the payload format above. Write it to the assignment's `output` immediately before the `replace_page` call, with the same values you pass. In round 1, write it after `create_page`, so that it holds the real `page_id`.

## Visible area

The `## Ansicht` in `onenote.md` counts as configured only when `Sichtbare Breite`, `Sichtbare Höhe`, and `Mindestschriftgröße` are numbers (decimal comma allowed). A template placeholder such as `[Punkte]` means not configured.

With a configured Ansicht:

- Every outline has `position` and `width`.
- For every outline, `x + width` is at most the `Sichtbare Breite`. Never horizontal scrolling.
- Every paragraph with `text` and every run has its own explicit `font_size`, at least the `Mindestschriftgröße`. List items therefore use `segments`.
- Colors come only from the `Farben` list, each with the meaning given there.
- A board taller than the `Sichtbare Höhe` is split into blocks, one per phase or reveal step, so that the teacher scrolls down once per step. No block is taller than the `Sichtbare Höhe`.

Without a configured Ansicht:

- `position` and `width` may be omitted.
- Set font sizes explicitly anyway: 32 pt for the Stundenthema, 24 pt for block headings, 20 pt for text. The server's heading styles are fixed CSS (`h1` is 16 pt), too small for projection.
- Use few colors, each with one meaning.

## Height estimate

The server can neither set nor report the height of an outline. Estimate it like this:

- The line height is 1.3 times the font size.
- A paragraph or list item takes `ceil(characters * 0.5 * font_size / width)` lines, at least 1. `characters` counts all characters of its text or of all its runs; with runs of different sizes, use the largest `font_size`.
- A block's height is the sum of the line heights of all its paragraphs and list items.
- The next outline starts 24 pt below the estimated end of the previous one: `y_next = y + height + 24`.

Without a configured Ansicht, estimate only outlines that have a `width`. Author and reviewer use the same estimate. The reviewer always calls it an estimate (`geschätzt`), never a measurement.

## Layout

- The Stundenthema comes first, as a paragraph with `style` `h1` and an explicit `font_size`.
- Then one outline per phase block, in the order of the plan's phases.
- Text: keywords and short phrases from `## Tafelbild (Inhalt)`, not sentences. A Merksatz the plan names is the exception. Every item of `## Tafelbild (Inhalt)` appears; nothing is added.
- Glossary terms verbatim.
- Few colors, each with one meaning.
- Outlines, paragraphs, and lists only: no tables, no images.

## Review

The `board-reviewer` reads the page back with `get_page`. The read-back has the title, outlines with position and width, and paragraphs and lists with text, heading level, and inline formatting. It has no outline height, no formatting that OneNote moved to paragraph level, no tables, and no ink.

On the read-back, check:

- Structure: the title, the Stundenthema first, the phase blocks in plan order, every item of `## Tafelbild (Inhalt)` present, nothing invented.
- German text and glossary terms verbatim.
- Brevity: words and lines per block, keywords instead of sentences.
- Horizontal geometry: with a configured Ansicht, `x + width` of every outline is at most the `Sichtbare Breite`.
- The text matches `tafelbild_vN.json`.

On `tafelbild_vN.json`, check:

- Font sizes: explicit, at least the `Mindestschriftgröße` (or the default sizes without an Ansicht).
- Colors: only from the `Farben` list, used with their meaning.
- Heading styles: `h1` for the Stundenthema.
- The estimated height of every block (section Height estimate), against the `Sichtbare Höhe`, and that no outlines overlap by the estimate.

Under `## Nachrechnung`, write one line per outline with `x + width`, for example `48 + 928 = 976 (Sichtbare Breite 1024): erfüllt`, and one line per block with the estimated height, for example `geschätzte Höhe 31,2 + 26 + 26 = 83,2 (Sichtbare Höhe 768): erfüllt`.

OneNote rewrites colors (`#C00000` can come back as `#9C0000`) and moves paragraph formatting out of the read-back. A formatting difference between `tafelbild_vN.json` and the read-back is therefore never a finding. Vertical extent, rendering on the presenting device, and contrast cannot be checked; the teacher's one-time look covers them.
