# SPEC: `unterricht` plugin

**Version:** v1, draft 2 (2026-10-03)
**Status:** Decided, except the items marked Open in section 14. Ready for implementation planning. Nothing is implemented.

## 0. How to read this spec

- **Decided**: binding for implementation. Change only by explicit decision of the maintainer.
- **Open**: not decided. Listed in section 14. No implementation may depend on an Open item.
- Decision IDs (`O1` to `O28`) are kept from the review rounds and point to the decision log in section 14.
- Platform facts are cited as `F1` to `F32` (Appendix A, checked against the official docs on 2026-10-02). Server facts are cited as `B1` to `B10` (Appendix B, read from the `onenote-mcp` source on 2026-10-03).

Terms:

- **Teacher**: anyone who uses the plugin. Not a developer.
- **First user**: the maintainer's partner, the teacher this plugin was designed with. Where her setup matters, this spec says "the first user" and "she".
- **Maintainer**: develops this repo and `onenote-mcp`.
- **Working folder**: the teacher's own folder with their configuration and lessons (section 9).
- **Board**: Tafelbild.

## 1. Goals and non-goals

### Goals (Decided)

1. One command plans a lesson end to end: a German lesson plan as Markdown in the teacher's working folder, and a Tafelbild as a OneNote page.
2. Two review loops check the plan and the board against the teacher's own criteria. Each loop is capped. After the cap, the remaining issues go to the teacher to decide.
3. **The plugin is generic.** Any teacher can use it. Everything specific to a school or a teacher (lesson length, special rules, quality criteria, phase model, notebook structure, visible board area) is configuration in the teacher's working folder, never in this repo. The first user's school has 67.5-minute lessons; the plugin itself knows nothing about that.
4. A non-developer can install and use it: clicks only, and everything the teacher sees is German.
5. Least privilege per agent. OneNote writes are limited to one configured notebook.
6. The plugin stays Cowork-compatible, so switching later is a tab change.

### Non-goals for v1 (Decided)

- Cowork as the runtime.
- The plan in OneNote, Word, or PDF. The plan exists only as Markdown in the working folder.
- Developing the OneNote MCP server here. It is consumed as a pinned release.
- Planning a lesson series (Unterrichtsreihe) in one run (O1).
- Generating worksheets or other material files (O1).
- Images and tables on the board (O1, O14).
- Reviewing a rendered image of the page (O15).
- Personal data about students anywhere (O17).
- Lessons filed in section groups or as subpages. v1 supports lessons as pages in sections directly under the notebook (O13).
- Configuration shared by several teachers of one school (O28, Open for after v1).

## 2. Users and context (Decided)

- **Teachers** work on Windows with the OneNote desktop app and Claude Desktop with the Code tab. They are not developers.
- **The first user** projects the board live: she opens the OneNote page on her iPad and mirrors the iPad to the projector. Pages are written on Windows and reach the iPad through OneNote sync. The mirrored screen defines the area the class sees without scrolling. That area is her configuration, kept in her working folder.
- **Other teachers** may project differently or not at all. The visible-area part of the configuration is optional.
- **Existing notebooks:** teachers already organize lessons in a OneNote notebook. The plugin follows the teacher's existing structure and does not impose its own.
- **Maintainer:** develops this repo and `onenote-mcp`, publishes updates.

Consequences:

- **Sync delay:** a page written shortly before class may not be on another device yet. The final message names the page and reminds the teacher to open it on the presenting device once before class.
- **Annotations:** a page the teacher has changed (for example ink from an iPad) must never be overwritten (section 6.6).
- **Readable configuration:** agents read the notebook structure and the visible area from a file in the working folder (section 8.1).

## 3. Language policy (Decided)

The rule: **who reads it decides the language.**

| Who reads it | Language | Covers |
|---|---|---|
| Only Claude | English | agent definitions, entry-point skill instructions, the instructional text of `lesson-conventions`, SPEC.md |
| The teacher reads, types, opens, or edits it | German | lesson plans, reviews, handoff files, escalation summaries, OneNote content, questions and status messages, command names, file and folder names in the working folder, `userConfig` titles and descriptions, the plugin description, README, CHANGELOG |
| Machines only, never shown | English constants | review verdict tokens, `userConfig` keys, env vars, frontmatter fields, internal identifiers |

- Reviews are German: the teacher reads them when a loop hits its cap, and the criteria and plans they judge are German.
- English constants are defined once (section 3.1) and never appear as free text.
- Every agent definition contains this sentence verbatim: "All instructions are in English. Everything you write (plans, reviews, OneNote content, messages to the user) must be in German."
- The two reviewer agents also contain: "Exception: line 1 of every review is the verdict token, exactly as defined." (O2)
- Configuration files in the working folder are fully German, labels included (`Stundenlänge: 67,5 Minuten`, never `lesson_minutes: 67.5`). No YAML frontmatter in the teacher's files. Numbers are read with a decimal comma. (O2)
- The skill contains a glossary of German pedagogical terms that are never translated and always used verbatim: Tafelbild, Einstieg, Erarbeitung, Sicherung, Lernziel, Differenzierung, Stundenthema, Verlaufsplan, Sozialform, Einzelarbeit, Partnerarbeit, Gruppenarbeit, Plenum, Hausaufgabe, Material. Phase names come from the teacher's configuration (section 9.1) and are used verbatim too. (O2)

### 3.1 Constants (Decided)

| Meaning | Value |
|---|---|
| Review verdict: accept | `APPROVED` |
| Review verdict: revise | `REVISE` |
| Plugin name (command namespace) | `unterricht` |
| Marketplace name | `schulstunde` |
| MCP server key in `.mcp.json` | `onenote` |
| Agent names | `lesson-planner`, `plan-reviewer`, `board-author`, `board-reviewer` |
| Conventions skill | `lesson-conventions` |
| Entry-point skills | `einrichten`, `stunde-planen`, `stunde-ueberarbeiten` |
| `userConfig` key for the allowed notebook | `notebook` (default `Unterricht`) |
| `userConfig` key for the plan checkpoint | `plan_checkpoint` (boolean, default `true`) |
| Server env var fed from `notebook` | `ONENOTE_ALLOWED_NOTEBOOKS` |
| Server env var that hides the raw-XML tools | `ONENOTE_DISABLE_RAW_XML` (value `1`) |
| Round cap per loop | `3` |
| Agent result line | `DONE <path>` (board author: `DONE <path> page_id=<id>`) or `FAILED <German reason>` |
| Assignment keys (orchestrator to agent) | `working_folder`, `lesson_folder`, `round`, `inputs`, `output`, `section_id`, `page_title`, `page_id` |

## 4. Architecture overview (Decided)

```
Claude Desktop, Code tab   (working directory = the teacher's working folder)
│
├─ /unterricht:einrichten           setup and health check
├─ /unterricht:stunde-planen        orchestrator for a new lesson
└─ /unterricht:stunde-ueberarbeiten orchestrator for resuming or revising a lesson
     │
     ├─ 1. Planning loop   lesson-planner  ──> planung_vN.md
     │                     plan-reviewer   ──> review_vN.md          (line 1: APPROVED | REVISE)
     ├─ 2. Checkpoint      teacher says "weiter" or gives feedback (feedback re-enters loop 1)
     └─ 3. Board loop      board-author    ──> OneNote page + tafelbild_vN.json
                           board-reviewer  ──> tafelbild-review_vN.md
                                  │
                       plugin/server/onenote-mcp.exe (vendored, pinned)
                                  │
                       OneNote desktop ──sync──> presenting device ──> projector
```

- The entry-point skill is the orchestrator and runs in the main session. Subagents could spawn subagents (F14), but the teacher's checkpoint and escalation answers arrive in the main conversation, so the loop state belongs there. The main session also shows progress, and one level of agents is easier to debug. (O23)
- Agents hand off through versioned files in the lesson's folder. Each agent returns only a one-line status to the orchestrator; content lives in files. (O7)
- The orchestrator reads only line 1 of a review, and the full review only to escalate. (O7)
- Nothing relies on `CLAUDE.md` loading. The plugin ships no `CLAUDE.md` (it would not be loaded, F12). Every agent reads `schulkontext.md` and `kriterien.md` explicitly and sets `omitClaudeMd: true` (F17), so a note in the teacher's `CLAUDE.md` cannot change how an agent judges, and behavior matches Cowork. (O7)

## 5. Components (Decided)

### 5.1 Repository layout (O25)

The repo root is the marketplace. The plugin lives in `plugin/`. Only `plugin/` is copied to the teacher's machine (F31), so development tooling never ships and never counts against the plugin limits (F25).

```
schulstunde-plugin/                  # repo root = marketplace
├── .claude-plugin/
│   └── marketplace.json             # one entry: unterricht, source ./plugin
├── plugin/                          # the plugin; only this ships
│   ├── .claude-plugin/
│   │   └── plugin.json              # name, version, description, author, userConfig
│   ├── .mcp.json                    # starts server/onenote-mcp.exe
│   ├── server/                      # added by the maintainer only (section 11.2)
│   │   ├── onenote-mcp.exe
│   │   ├── VERSION
│   │   └── onenote-mcp.exe.sha256
│   ├── skills/
│   │   ├── einrichten/SKILL.md
│   │   ├── stunde-planen/SKILL.md
│   │   ├── stunde-ueberarbeiten/SKILL.md
│   │   └── lesson-conventions/
│   │       ├── SKILL.md             # language, glossary, plan and review formats, assignments
│   │       ├── board.md             # Tafelbild conventions and the page payload format
│   │       ├── lesson-folder.md     # stunde.md format, naming, versions
│   │       ├── orchestration.md     # loops, checkpoint, escalation, failure handling
│   │       └── examples/
│   │           ├── plan.md          # German example plan
│   │           ├── board.json       # example page payload
│   │           └── NOTES.md         # why the examples are good (English)
│   ├── agents/
│   │   ├── lesson-planner.md
│   │   ├── plan-reviewer.md
│   │   ├── board-author.md
│   │   └── board-reviewer.md
│   └── templates/                   # German files that einrichten copies into a working folder
├── checks/                          # repo checks and their node:test tests (Appendix C)
├── scripts/                         # CI helpers: server vendoring, tool contract (11.2)
├── plans/                           # build plans for the engine (Appendix C)
├── package.json                     # dev tooling only: typecheck, test, verify, verify:release
├── .agentpasture/                   # build engine, local only, gitignored (Appendix C)
├── .github/workflows/               # CI, pin update (section 11.2)
├── README.md                        # German install guide for teachers
├── CHANGELOG.md                     # German, for teachers
└── SPEC.md
```

The plugin directory contains only `.claude-plugin/`, `.mcp.json`, `server/`, `skills/`, `agents/`, and `templates/`. No `commands/`, `hooks/`, `bin/`, `CLAUDE.md`, LSP, output styles, themes, or `settings`.

### 5.2 Manifest and `userConfig`

`plugin.json` has `name`, a semantic `version`, a German `description`, `author`, and `userConfig` (F8, F32):

```json
{
  "userConfig": {
    "notebook": {
      "type": "string",
      "title": "OneNote-Notizbuch",
      "description": "Name des Notizbuchs, in dem das Plugin Tafelbilder lesen und anlegen darf.",
      "default": "Unterricht"
    },
    "plan_checkpoint": {
      "type": "boolean",
      "title": "Plan vor dem Tafelbild prüfen",
      "description": "Vor dem Tafelbild fragen, ob der Plan so passt.",
      "default": true
    }
  }
}
```

- Every option has a default (Cowork rule). Claude Code asks for the values when the plugin is enabled; each option is a row in `/config` (F3, F10).
- `${user_config.notebook}` reaches the server through `.mcp.json`; `${user_config.plan_checkpoint}` reaches the entry-point skills through their content (F9).
- The server matches `ONENOTE_ALLOWED_NOTEBOOKS` against the notebook's display name, exactly and case-sensitively, splits it at commas, and treats a blank value as no restriction (B6). The entry points therefore refuse to touch OneNote when `notebook` is blank or contains a comma, and say so in German.

### 5.3 Entry points (O24, O4, O10)

All three are skills with `disable-model-invocation: true`, so only the teacher starts them. Commands are the older format (F13), and `${user_config.*}` is documented for skill content (F9).

**`/unterricht:einrichten`** sets up a working folder and doubles as a health check. Steps:

1. Show the current folder and ask the teacher to confirm it is their working folder.
2. Create missing files from `templates/`. Existing files stay untouched and are listed.
3. Configuration interview: ask for what the templates need (school, lesson length, special rules, classes, criteria). If the teacher has instructions from a Claude project, they paste them, and Claude sorts them into `schulkontext.md`, `kriterien.md`, and `onenote.md`, shows the result, and writes only after a yes. Knowledge files are copied into `material/` by hand.
4. OneNote: check the `notebook` setting (5.2), `ping`, confirm the notebook exists, read its sections and page titles read-only, draft the Ablage part of `onenote.md`, and confirm it.
5. Visible area, only if the teacher projects with a fixed visible area: calibration (section 8.1).
6. German summary with the next step.

**`/unterricht:stunde-planen <Thema, Klasse, Hinweise>`** plans a new lesson: both loops (section 6).

**`/unterricht:stunde-ueberarbeiten [Stunde] [Änderungen]`** works on an existing lesson. Without arguments it lists the lessons to choose from. It either resumes an interrupted run (for example OneNote was closed during the board loop) or treats the changes like checkpoint feedback and runs both loops again from the latest plan (section 6.6).

### 5.4 Agents (O6)

| Agent | Purpose | Reads | Writes |
|---|---|---|---|
| `lesson-planner` | drafts or revises the plan | `schulkontext.md`, `kriterien.md`, `stunde.md`, `material/` as needed, previous plan, previous review, teacher feedback | `planung_vN.md` |
| `plan-reviewer` | judges the plan | `schulkontext.md`, `kriterien.md`, `stunde.md`, `planung_vN.md`, previous review, teacher feedback | `review_vN.md` |
| `board-author` | builds or revises the board page | `schulkontext.md`, `kriterien.md`, `onenote.md`, approved plan, previous board review | OneNote page, `tafelbild_vN.json` |
| `board-reviewer` | reads the page back and judges it | `schulkontext.md`, `kriterien.md`, `onenote.md`, approved plan, `tafelbild_vN.json`, the page via `get_page` | `tafelbild-review_vN.md` |

Every agent definition:

- has English instructions with the mandated language sentence (section 3),
- starts with: read `schulkontext.md`, then `kriterien.md`,
- states its inputs, its exact output (file name, structure), and when it stops,
- ends with a one-line status for the orchestrator,
- sets `model: inherit`, `omitClaudeMd: true`, and `skills: lesson-conventions`,
- has exactly the tool list from section 10.

Plugin agents ignore the `hooks`, `mcpServers`, and `permissionMode` frontmatter fields (F15); none of them is used.

### 5.5 Conventions skill (O5)

One skill, `lesson-conventions`, with `user-invocable: false`. It must not set `disable-model-invocation: true`, which would block preloading into subagents (F16).

- `SKILL.md`: language rule, glossary, working-folder files, plan format (section 7), review format (section 6.2), the assignment format and result line (3.1), the rule against personal data (section 9.2).
- `board.md`: Tafelbild conventions (section 8.2), the `replace_page` payload format, and the `tafelbild_vN.json` format.
- `lesson-folder.md`: the `stunde.md` format, folder naming, and version numbering (section 9). Read by the orchestrators.
- `orchestration.md`: the loops, the checkpoint, escalation, and failure handling (sections 6 and 11.3), shared by `stunde-planen` and `stunde-ueberarbeiten`.
- `examples/`: one German example plan, one example page payload, and English notes on why they are good. Written for the plugin, not copied from a real teacher's notebook, and marked as examples.

Each agent preloads the skill through `skills:` (full `SKILL.md` injected, F16). Supporting files are read with the Read tool by path. `${CLAUDE_PLUGIN_ROOT}` and `${user_config.*}` are substituted only in `SKILL.md` files and agent files (F9, F11), never in a file read by path, so supporting files contain no `${...}`. The agent or entry-point skill names the full path, for example `${CLAUDE_PLUGIN_ROOT}/skills/lesson-conventions/board.md`, and passes values such as `plan_checkpoint` on.

## 6. Workflow (Decided)

### 6.1 `/unterricht:stunde-planen <Thema, Klasse, Hinweise>`

1. **Preflight, no writes.**
   - `schulkontext.md` and `kriterien.md` exist; otherwise stop and tell the teacher in German to run `/unterricht:einrichten`.
   - `schulkontext.md` has a numeric `Stundenlänge`. A template placeholder stops the run with a German message naming the line.
   - Topic and class are known; if either is missing from the arguments, ask.
   - The `notebook` setting is not blank and has no comma (5.2). `ping`; if `onenote_responsive` is false, warn in German and plan anyway (section 11.3).
2. **Lesson folder.** Create `Stunden/<name>/` (section 9) and write `stunde.md` with the request.
3. **Planning loop** (6.2).
4. **Checkpoint** (6.3).
5. **OneNote gate.** `ping` must report `onenote_responsive: true`; the configured notebook and the target section must exist (section 11.3).
6. **Board loop** (6.4).
7. **Finish.** German summary: path of the final plan, OneNote location of the page, issues the teacher accepted at a cap, and the reminder to open the page on the presenting device once before class. Update `stunde.md`.

Between steps the orchestrator prints one German status line, for example: `Planung, Runde 2 von 3: Der Entwurf wird überarbeitet.`

### 6.2 Planning loop (O7, O8)

```
for round in 1..3:
    lesson-planner  -> planung_vN.md
    plan-reviewer   -> review_vN.md
    if line 1 of review_vN.md == APPROVED: leave loop
    N = N + 1
no APPROVED after 3 rounds: escalate (6.5)
```

- A round is one draft plus one review. The cap is 3.
- Round 1: the planner gets the request. Later rounds: also the previous plan and its review.
- The reviewer gets the previous review too. It must confirm whether earlier Muss-Mängel were fixed, and may raise a new Muss-Mangel only for an actual violation of `kriterien.md` or `schulkontext.md` (prevents oscillation).
- The orchestrator passes explicit file paths (lesson folder, version N) in every agent prompt. Agents never pick "the latest file" themselves.
- Before comparing line 1, strip a UTF-8 BOM, trailing spaces, and a trailing CR. Any other value is a protocol error: re-run that reviewer once with a format reminder; a second failure stops the run with a German error message. The orchestrator never infers a verdict from the review text.

Review file format:

```markdown
REVISE

## Muss-Mängel
1. Die Phasen ergeben 62,5 statt 67,5 Minuten.

## Soll-Hinweise
- Die Sicherung könnte ein Beispiel aus dem Einstieg aufgreifen.
```

- Verdict rule: `APPROVED` exactly when there are no Muss-Mängel. Soll-Hinweise never block.
- Which criteria are Muss and which are Soll is defined in the teacher's `kriterien.md` (section 9.1).
- For every criterion that is a number (for example the time sum), the reviewer lists the values, computes the result, and writes the computation into the review (O12).

### 6.3 Checkpoint after planning (O9)

- Runs when `plan_checkpoint` is `true` (the default).
- The orchestrator shows a short German summary of the plan and the path to `planung_vN.md`, then asks: `Passt der Plan so? Antworte mit „weiter“, oder schreib, was geändert werden soll.`
- `weiter`: the board loop starts.
- Feedback: saved as `rueckmeldung_vN.md` (N of the draft it leads to). The planning loop runs again with a fresh cap of 3. The planner must address the feedback; the reviewer checks the criteria and that the feedback was addressed.
- The teacher's explicit feedback wins over `kriterien.md`. The reviewer notes a conflict as a Soll-Hinweis, never as a Muss-Mangel.
- If the planning loop ended at its cap, escalation and checkpoint are one question, not two.

### 6.4 Board loop

```
ping, resolve target section from onenote.md
for round in 1..3:
    board-author    -> round 1: create_page, then replace_page; later rounds: replace_page (same page)
                       writes the exact replace_page payload to tafelbild_vN.json
    board-reviewer  -> get_page -> tafelbild-review_vN.md
    if line 1 == APPROVED: leave loop
no APPROVED after 3 rounds: escalate (6.5)
```

- `create_page` sets only the title (B2); the content follows with `replace_page`. Later rounds replace the same page and never add pages.
- `replace_page` deletes everything except the title before it writes, without a conflict check, and is not atomic (B2). Inside the board loop that is acceptable: the page is minutes old and only the plugin has written to it.
- The orchestrator records page ID and location in `stunde.md`.
- If the target section does not exist, the author does not guess. The orchestrator asks the teacher (section 11.3).

### 6.5 Escalation at the cap (O8)

The orchestrator reads the last review fully, shows the open Muss-Mängel in German, and offers:

1. `So übernehmen`: accept as is, noted in `stunde.md`.
2. `Ich gebe Hinweise`: the teacher's guidance goes to the planner (or the board author), with a fresh cap of 3.
3. `Abbrechen`: stop. Files and page stay as they are.

### 6.6 Re-planning and resume (O10)

`/unterricht:stunde-ueberarbeiten` resumes or revises a lesson (5.3). The server cannot protect a page the teacher has changed: `replace_page` deletes ink and everything else except the title, the structured tools expose no last-modified time, and there is no conflict check (B1, B2, B10). Therefore **a page is never replaced after its board loop has ended**. Revising a finished lesson creates a new page next to the old one, and the teacher is told to delete the old one. Resuming an interrupted board loop continues on the page that loop created.

## 7. Lesson plan (Decided)

### 7.1 Content and format (O11)

A fixed German structure owned by the plugin, because it is the contract between planner, reviewer, and orchestrator. Teacher preferences go into `kriterien.md`. Example (values are examples):

```markdown
# <Stundenthema>

Klasse: 6b · Fach: Mathematik · Datum: (optional) · Stundenlänge: 67,5 Minuten

## Einordnung
## Lernziele
## Verlaufsplan
| Zeit (Min.) | Phase | Unterrichtsgeschehen | Sozialform | Material/Medien |
|---|---|---|---|---|
| 7,5 | Einstieg | ... | Plenum | Tafelbild |
| ... | ... | ... | ... | ... |
| **67,5** | | | | |
## Differenzierung
## Material
## Hausaufgabe
## Tafelbild (Inhalt)
## Besondere Regeln
```

- **Stundenlänge** comes from `schulkontext.md`. The teacher can override it in the request (for example `nur 45 Minuten`); the planner records the override in `stunde.md`.
- **Zeit** holds durations, not clock times.
- **Phase** names come from the phase model in `schulkontext.md`.
- **Tafelbild (Inhalt)** says what the board must show, phase by phase. The planning reviewer judges this content; the board loop only turns it into a layout.
- **Besondere Regeln** states how each special rule from `schulkontext.md` is respected, or `keine`. The reviewer checks it.

### 7.2 Checks (O12)

The rules a plan is checked against are configuration: they live in the teacher's `kriterien.md`, not in the plugin. The `kriterien.md` template ships with the time-sum rule as a default Muss-Kriterium ("Die Phasen ergeben zusammen genau die Stundenlänge."). The plan reviewer applies every criterion, with explicit arithmetic for number criteria (6.2). There is no hook in v1.

## 8. Tafelbild and OneNote (Decided)

### 8.1 OneNote structure (O13)

- The working folder has `onenote.md` (German) with two parts:
  - **Ablage:** which section a lesson goes into (for example one section per class) and the page title scheme.
  - **Ansicht** (optional): the visible area in points (width and height), minimum font size, the colors the teacher uses and what they mean.
- `einrichten` drafts the Ablage part by reading the notebook read-only and inferring the scheme from existing page titles. The teacher confirms it.
- One page per lesson, in a section directly under the notebook. `get_notebooks` does not list sections inside section groups (B3); v1 does not support them.
- The plugin never creates notebooks or sections; no server tool creates sections (B3). A missing section is the teacher's action.
- Calibration (`einrichten` step 5): write a calibration page with labeled markers at known positions; the teacher opens it on the presenting device at the usual zoom and reports the last fully visible marker; the numbers go into `onenote.md`. The teacher deletes the calibration page by hand (no delete tool).
- The server works in points (1/72 inch). Outline position and width can be written and read back; outline height can neither be set nor read (B1, B2). Only the width of the visible area can be checked against page data.

### 8.2 Tafelbild conventions (O14)

Generic conventions in `board.md`; the teacher's specifics come from `onenote.md` and the Tafelbild part of `kriterien.md`.

- With an Ansicht configured: everything the class must see at once fits inside the visible width. Never horizontal scrolling.
- Top to bottom follows the lesson phases. A board taller than the visible area is split into blocks, one per phase or reveal step, so the teacher scrolls down once per step.
- The Stundenthema is the first line.
- Keywords and short phrases from the plan's "Tafelbild (Inhalt)", not full sentences.
- Few colors, each with one meaning; with an Ansicht, only the teacher's colors.
- Font sizes are set explicitly, at least the configured minimum. The server's built-in heading styles are fixed CSS (`h1` is 16 pt, B2), too small for projection.
- Glossary terms verbatim.
- Outlines and lists only: no tables, no images (non-goals).

### 8.3 What the board reviewer checks (O15)

The board reviewer reads the page back with `get_page`. It returns the title, outlines with position and width in points, paragraphs and lists with text, heading level, and inline formatting. It does not return outline height, formatting that OneNote moved to paragraph level, tables, or ink (B1).

- **On the read-back:** structure (title, phase blocks in plan order, every item of "Tafelbild (Inhalt)" present, nothing invented), German and glossary terms, brevity (words and lines per block), horizontal geometry (`x + width` of every outline inside the visible width), and that the text matches `tafelbild_vN.json`.
- **On `tafelbild_vN.json`:** font sizes, colors, heading styles, because formatting may not survive a read-back. OneNote also rewrites colors (`#C00000` came back as `#9C0000`, `#FFFF00` as `yellow`), so a formatting difference between payload and read-back is never a finding.
- **Not checkable:** vertical extent and overlap (estimated from line counts), rendering on the presenting device, contrast on the projector. The teacher's one-time look covers this (A8).

## 9. Working-folder contract (Decided)

The teacher owns the content; the plugin owns the behavior.

```
<working folder>/
├── CLAUDE.md                          # short German pointer to the files below
├── schulkontext.md                    # school, lesson length, phase model, special rules
├── kriterien.md                       # the teacher's criteria, Muss and Soll, used by both reviewers
├── onenote.md                         # Ablage and optional Ansicht (8.1)
├── material/                          # curricula, templates
└── Stunden/
    └── 2026-10-07 6b Bruchrechnung/
        ├── stunde.md                  # request, overrides, status, OneNote location
        ├── planung_v1.md
        ├── review_v1.md
        ├── rueckmeldung_v2.md         # checkpoint feedback that led to v2
        ├── planung_v2.md
        ├── review_v2.md
        ├── tafelbild_v1.json          # exact page payload the author sent
        └── tafelbild-review_v1.md
```

- Every agent reads `schulkontext.md` and `kriterien.md` first.
- **Lesson folder name:** the page title scheme from `onenote.md`, so folder and page match. Default if there is no scheme: `JJJJ-MM-TT Klasse Thema`, with the lesson date if known, else today. Characters invalid in Windows file names are removed; umlauts are kept.
- **Version numbers:** N counts plan drafts. `review_vN` judges `planung_vN`. `rueckmeldung_vN` is the feedback that led to `planung_vN`. Board versions (`tafelbild_vN.json`, `tafelbild-review_vN.md`) count separately.
- **The teacher's files are theirs:** the plugin never overwrites `CLAUDE.md`, `schulkontext.md`, `kriterien.md`, `onenote.md`, or anything in `material/`. `einrichten` only adds missing files, or changes existing ones after showing the change and getting a yes.
- **Material formats:** the file tools read Markdown, text, PDF, and images. Word files are not assumed readable; `einrichten` asks the teacher to save them as PDF.
- **Contract changes:** when a plugin update needs a new file in the working folder, the preflight of every entry point detects it and asks the teacher to run `einrichten`, which adds what is missing.

### 9.1 Templates (O16)

German templates with placeholders, never with one school's values. A placeholder is text in square brackets, for example `[Minuten eintragen]`; the preflight refuses a run while a required placeholder is unfilled.

`schulkontext.md`

```markdown
# Schulkontext

## Schule
[Schulform, Bundesland, Besonderheiten]

## Zeitraster
Stundenlänge: [Minuten eintragen] Minuten
Besondere Regeln:
- [zum Beispiel feste Rituale, Pausenregeln; sonst „keine“]

## Phasenmodell
Einstieg, Erarbeitung, Sicherung

## Fächer und Klassen
| Klasse | Fach | Lehrplan / Kerncurriculum | Lehrwerk |
|---|---|---|---|

## Ausstattung im Unterricht
[zum Beispiel Beamer, Tablet mit Spiegelung, Tafel]

## Was jede Planung beachten soll
- [...]
```

`kriterien.md`

```markdown
# Meine Kriterien

## Planung
### Muss (sonst wird überarbeitet)
- Die Phasen ergeben zusammen genau die Stundenlänge.
### Soll (Hinweis, kein Grund zum Überarbeiten)
- [...]

## Tafelbild
### Muss
- Alles, was die Klasse gleichzeitig sehen soll, passt in die sichtbare Breite.
### Soll
- [...]
```

- The Muss and Soll split gives reviewers a clear verdict rule (6.2).
- Example criteria are marked as examples and can be deleted.
- `CLAUDE.md` (German, short): what the folder is, the main files, the commands. It serves the teacher's normal chats; agents never depend on it.
- `onenote.md`: Ablage and Ansicht headings, filled by `einrichten`.
- Every template carries a short German note: no student names or other personal data.

### 9.2 Student data (O17)

No student names or other personal data in any file, page, template, example, or fixture. The skill tells agents to describe groups ("leistungsstärkere Schülerinnen und Schüler") instead of naming students.

## 10. Permissions (Decided, O18)

- Planner and planning reviewer: file tools only.
- Board author: OneNote navigation and write tools.
- Board reviewer: OneNote read tools only.
- Every agent also has `Read`, `Glob`, `Grep` (it reads the configuration first) and `Write` (handoff is file-based; "only" above refers to the OneNote tools).
- Raw-XML tools, image tools, and `append_page` are in no agent.

OneNote tools are written by full name, `mcp__plugin_unterricht_onenote__<tool>` (F18). No wildcards and no server-level entries: `mcp__<server>__*` would include the raw-XML tools.

| Agent | File tools | OneNote tools |
|---|---|---|
| `lesson-planner` | Read, Glob, Grep, Write | none |
| `plan-reviewer` | Read, Glob, Grep, Write | none |
| `board-author` | Read, Glob, Grep, Write | `get_notebooks`, `list_pages`, `get_page`, `create_page`, `replace_page`, `ping` |
| `board-reviewer` | Read, Glob, Grep, Write | `get_notebooks`, `list_pages`, `get_page`, `ping` |

Example:

```yaml
---
name: board-reviewer
description: Reads a Tafelbild page back from OneNote and reviews it against the approved plan and the teacher's criteria.
tools: Read, Glob, Grep, Write, mcp__plugin_unterricht_onenote__get_notebooks, mcp__plugin_unterricht_onenote__list_pages, mcp__plugin_unterricht_onenote__get_page, mcp__plugin_unterricht_onenote__ping
skills: lesson-conventions
model: inherit
omitClaudeMd: true
---
```

How a plugin skill is named in `skills:` (bare or with the plugin prefix) is not documented, and `claude plugin validate` does not check `skills:` references. A probe plugin on Claude Code 2.1.288 (2026-10-03) showed that both forms preload the skill; the plugin uses the bare name. A missing skill is skipped with only a debug-log warning, so A3 confirms the preload by hand.

Further rules:

- Tool lists cannot restrict paths. Writes outside the lesson folder are prevented by instruction.
- Agent tool lists do not bind the main session. `.mcp.json` sets `ONENOTE_DISABLE_RAW_XML=1`, so the raw-XML tools do not exist in the teacher's normal chats either (requires `onenote-mcp` R4, Appendix B).
- Permission prompts: `allowed-tools` grants end with the teacher's next message (F20), and plugin agents cannot set `permissionMode` (F15). `einrichten` therefore offers to add these allow rules to `.claude/settings.json` in the working folder, and writes only after a yes (merging, never replacing an existing file). `Edit` rules cover every file-writing tool; `/` anchors at the working folder; MCP tools are allowed by full name:

  ```json
  {
    "permissions": {
      "allow": [
        "Edit(/Stunden/**)",
        "Read(~/.claude/plugins/**)",
        "mcp__plugin_unterricht_onenote__ping",
        "mcp__plugin_unterricht_onenote__get_notebooks",
        "mcp__plugin_unterricht_onenote__list_pages",
        "mcp__plugin_unterricht_onenote__get_page",
        "mcp__plugin_unterricht_onenote__create_page",
        "mcp__plugin_unterricht_onenote__replace_page"
      ]
    }
  }
  ```

  Whether these rules cover subagent calls in the Code tab is verified by hand (S2, section 14).

## 11. MCP dependency and updates (Decided)

### 11.1 Server

- `github.com/noelroehrig/onenote-mcp`, maintained separately. Its release workflow publishes `onenote-mcp.exe` and `onenote-mcp.exe.sha256` (B8). The first release (`v1.0.1`) is pending (R2).
- The plugin vendors a pinned release under `plugin/server/` and starts it from `.mcp.json`:

```json
{
  "mcpServers": {
    "onenote": {
      "command": "${CLAUDE_PLUGIN_ROOT}/server/onenote-mcp.exe",
      "env": {
        "ONENOTE_ALLOWED_NOTEBOOKS": "${user_config.notebook}",
        "ONENOTE_DISABLE_RAW_XML": "1"
      }
    }
  }
}
```

- 13 tools (B7). The plugin uses `ping`, `get_notebooks`, `list_pages`, `get_page`, `create_page`, `replace_page`. Errors: `timeout`, `backend_error`, `bad_request` (B4).
- The exe is Python packed by PyInstaller, unpacks into `%TEMP%` at every start, and is not signed (B8).

### 11.2 Vendoring and the pin

- **During the build the exe is absent.** No placeholder binary is committed. `.mcp.json` references the path anyway.
- `npm run verify` (engine and every PR) passes without `plugin/server/` and prints that the server is not vendored yet. If `plugin/server/` exists, its three files must all be present and consistent.
- `npm run verify:release` (CI before a release) fails unless `plugin/server/` holds the exe, `VERSION`, and a `.sha256` that matches the exe, and unless every component of section 5.1 exists.
- **Pin update workflow** (`.github/workflows/update-server.yml`, manual trigger with a release tag, Windows runner): download the asset and its `.sha256` with `gh release download`, then `scripts/vendor-server.ts` verifies the hash, updates `plugin/server/`, bumps the plugin's patch version, and adds a changelog line; then the tool contract check, `npm run verify:release`, and a PR.
- **Tool contract check** (`scripts/tool-contract.ts`): start the exe with `ONENOTE_DISABLE_RAW_XML=1`, list its tools over MCP stdio, and require the six tools the plugin uses and none of the four raw-XML tools. The server answers `tools/list` without OneNote (B9). The script is tested in the container against a fake MCP server; the real exe runs only in the workflow.
- **CI** (`.github/workflows/ci.yml`): `npm run verify` on every push and pull request, `npm run verify:release` on pushes to `main`, and on pull requests the version-bump check: a change under `plugin/` needs a higher `version` and a `CHANGELOG.md` change.
- Every pin bump adds the full exe to git history. No Git LFS. The plugin must stay under 200 MB (F25).
- Agents never touch `plugin/server/` (protected path, Appendix C). Only the maintainer or the pin workflow changes it.

### 11.3 OneNote failure behavior (O20)

Server behavior (B4): `ping` never fails and reports `onenote_responsive: true|false`; errors arrive as `Error executing tool <tool>: <code>: <message>`, so the code is found inside the text; argument validation errors have no code and count as `bad_request`; a write that timed out may still complete later; `replace_page` is not atomic.

| Situation | Behavior |
|---|---|
| `onenote_responsive` false at the start of `stunde-planen` | Warn in German, plan anyway, check again before the board loop. |
| `onenote_responsive` false before the board loop | Ask the teacher to open OneNote and close any dialog, `ping` again once; then stop, keep the plan, explain how to resume with `stunde-ueberarbeiten`. |
| `timeout` on a read | Tell the teacher OneNote is busy or shows a dialog. `ping`, retry once. On a second failure, stop the board loop, keep the plan, explain how to resume. |
| `timeout` on `create_page` | Never retry blindly. After `ping`, `list_pages` on the target section shows whether the page exists after all; reuse it if so. |
| `timeout` or `backend_error` on `replace_page` | Re-send the same payload once. If that fails, stop and tell the teacher the page may be empty. |
| Other `backend_error` | Stop the board loop, show the error, keep the plan, explain how to resume. |
| `bad_request` | Treated as a plugin bug. The author may correct its call once; then stop, show the error, and ask the teacher to forward it to the maintainer. |
| `notebook` blank or with a comma | Stop before any OneNote call (5.2). |
| Configured notebook not found | Stop before writing. Name the configured notebook (exact, case-sensitive) and say where to change the setting. Never create a notebook. |
| Target section missing | Ask the teacher to create it in OneNote or to choose another. Never create sections. |
| OneNote not installed for COM | Stop and explain in German that the OneNote desktop app is needed. |

## 12. Installation, onboarding, updates (Decided, O21, O22)

### 12.1 Installation (README, German)

1. Prerequisites: a Claude plan with Claude Code, Claude Desktop signed in with the claude.ai account, the OneNote desktop app signed in with the notebook synced.
2. claude.ai: *Customize → Plugins → Add marketplace*, enter this repo, install `unterricht`. It appears in the Code tab as a synced plugin at the next session start (F6).
3. When the plugin is enabled, Claude Code asks for the options (F3). The notebook name must match exactly. Later changes go through `/config` (F10).
4. Create a working folder (suggested: `Dokumente\Unterricht`) and open it in the Code tab.
5. Run `/unterricht:einrichten`.
6. First lesson, for example: `/unterricht:stunde-planen Brüche als Anteile, 6b, Einstieg mit Pizza-Beispiel`.

- The repo is public. It contains no teacher's content.
- If OneDrive syncs the working folder, cloud-only files may need a download before Claude can read them.
- The final message of `einrichten` repeats the commands. No separate guide file in the working folder.

### 12.2 Updates

- Semantic `version` in `plugin.json`, bumped with every release. Installs through claude.ai use claude.ai's own version record (F24); the field matters for CLI installs and for `claude plugin validate --strict` (F32).
- Updates arrive through the platform's sync; the entry points do not check versions. After an update the teacher restarts the Desktop app (F30).
- `CHANGELOG.md` is German and written for teachers.
- New templates never overwrite a teacher's files (section 9).

## 13. Cowork compatibility rules (Decided)

- No top-level `bin/` in the plugin directory (F1).
- Every `userConfig` option has a default (F3).
- Only components Cowork loads; v1 uses skills, agents, and an MCP server (F5).
- Nothing relies on implicit `CLAUDE.md` loading.
- All plugin paths go through `${CLAUDE_PLUGIN_ROOT}`, with forward slashes, never absolute.
- Local MCP servers load only in Cowork sessions on the device (F2). Whether Cowork runs them on the Windows host is not documented (F23); test before any switch.
- `npm run verify` enforces these rules.

## 14. Decision log and open items

| ID | Topic | Status | Decision |
|---|---|---|---|
| O1 | Further non-goals | Decided | Series, worksheets, images, rendered review, student data out of v1 |
| O2 | Language details | Decided | Reviewer exception sentence, German labels, extended glossary, phase names from configuration |
| O3 | Names | Decided | Section 3.1 |
| O4 | `einrichten` scope | Decided | Section 5.3, calibration only with a fixed visible area |
| O5 | Skill layout | Decided | One skill, `user-invocable: false`, preloaded |
| O6 | Agent models | Decided | `model: inherit`; usage measured in A14 |
| O7 | Orchestration protocol | Decided | Status lines, line-1 verdicts, strict parsing, explicit paths, `omitClaudeMd` |
| O8 | Cap and escalation | Decided | Cap 3, fresh cap after teacher input, three escalation options |
| O9 | Checkpoint | Decided | `plan_checkpoint` default `true`, teacher feedback wins |
| O10 | Re-planning | Decided | `stunde-ueberarbeiten`; finished pages are never replaced |
| O11 | Plan format | Decided | Section 7.1 |
| O12 | Checks | Decided | Rules are configuration in `kriterien.md`; reviewer arithmetic; no hook in v1 |
| O13 | OneNote structure | Decided | `onenote.md`; sections directly under the notebook; one page per lesson |
| O14 | Tafelbild conventions | Decided | Section 8.2; no tables, no images |
| O15 | Board review | Decided | Payload file for formatting, read-back for structure and width |
| O16 | Templates | Decided | Placeholders, Muss and Soll |
| O17 | Student data | Decided | None anywhere |
| O18 | Permissions | Decided | Section 10 |
| O19 | CI workflows | Decided | Section 11.2 |
| O20 | Failure behavior | Decided | Section 11.3 |
| O21 | Onboarding | Decided | Public repo, German README |
| O22 | Updates | Decided | Semver bumped per release, German changelog |
| O23 | Orchestration in the main session | Decided | Section 4 |
| O24 | Entry points as skills | Decided | Section 5.3 |
| O25 | Plugin in `plugin/` | Decided | Section 5.1 |
| O26 | Build plans and models | Decided | Appendix C, Opus for implementing and reviewing |
| O27 | Changes to `onenote-mcp` | Decided | R1, R2, R4 by the maintainer; R3, R7, R8 dismissed; R5, R6, R9 after v1 |
| O28 | Configuration shared by teachers of one school | **Open** | After v1. Recommendation: `einrichten` imports a shared `schulkontext.md` from a file the school provides |

Manual verification on Windows (not decisions, cannot run in the build container):

- **S2:** allow rules in the working folder's `.claude/settings.json` cover a plugin subagent's MCP and `Write` calls without prompts (section 10).
- **S3:** the plugin with the vendored exe installs from claude.ai, starts in the Code tab, and is not blocked by Microsoft Defender or SmartScreen.

## 15. Acceptance criteria for v1

`[auto]` runs in the build container or CI; `[manual]` runs on a Windows machine with OneNote.

- **A1 Install** `[manual]`: installed from the claude.ai marketplace. The three entry points appear in the Code tab with German descriptions. `ping` reports `onenote_responsive: true`.
- **A2 Setup** `[manual]`: `einrichten` in an empty folder creates exactly the files of section 9. In a filled folder it changes nothing without a yes.
- **A3 Happy path** `[manual]`: `stunde-planen` creates the lesson folder, at least one `planung_vN.md` and `review_vN.md` pair, an approved final plan, and a board page in the right section with the right title. `stunde.md` records the page. Plans and reviews follow the `lesson-conventions` formats, which shows that the agents got the skill preloaded.
- **A4 Verdicts** `[manual]`: line 1 of every review file is exactly `APPROVED` or `REVISE`.
- **A5 Time sum** `[manual]`: the minutes of the approved plan sum exactly to the configured lesson length, checked by hand.
- **A6 Caps** `[manual]`: with a deliberately unsatisfiable Muss-Kriterium, each loop stops after 3 rounds, shows the open Muss-Mängel in German, and offers the escalation options.
- **A7 Checkpoint** `[manual]`: feedback produces `rueckmeldung_vN.md` and a new plan that addresses it. With `plan_checkpoint` off, the board loop starts without asking.
- **A8 Visible area** `[manual]`: the first user opens the page on her iPad, mirrored, at her usual zoom. No horizontal scrolling, and in her judgment it is legible from the back of the room.
- **A9 Failure paths** `[manual]`: an open dialog in OneNote leads to the `timeout` message and a successful retry after it is closed. A wrong notebook name leads to a clear German error, and nothing is written.
- **A10 Language** `[auto]` and `[manual]`: the mechanical markers pass `npm run verify`; in the runs, every message, file, and OneNote text is German and glossary terms appear verbatim.
- **A11 Least privilege** `[auto]`: each agent's tool list matches section 10 exactly; no raw-XML tool anywhere.
- **A12 Plugin rules** `[auto]`: `npm run verify:release` passes, including `claude plugin validate --strict`.
- **A13 Generic** `[auto]` and review: no school- or teacher-specific value in `plugin/` outside content marked as an example.
- **A14 Usage** `[manual]`: duration and usage of one happy-path run are measured and recorded.

## Appendix A: Platform facts

Checked on 2026-10-02. **Verified** means quoted from the page named. A docs subagent did the first pass; the claims that contradict the original brief (F14, F17) and the ones that change the design (F7, F9, F13, F16, F20, F24) were re-read directly.

Sources: `PS` = claude.com/docs/plugins/platform-support · `REF` = code.claude.com/docs/en/plugins-reference · `LOAD` = code.claude.com/docs/en/plugins/loading · `COMP` = code.claude.com/docs/en/plugins/components · `SUB` = code.claude.com/docs/en/sub-agents · `SK` = code.claude.com/docs/en/skills · `HOOKS` = code.claude.com/docs/en/hooks

| ID | Fact | Status | Source |
|---|---|---|---|
| F1 | claude.ai and Cowork refuse a plugin with a top-level `bin/` ("Can't be installed"). | Verified | PS, REF |
| F2 | Local MCP servers: ignored in Chat, load in Cowork "when the Cowork session runs on your computer", load in Claude Code. | Verified | PS |
| F3 | An MCP server that references `${user_config.*}`: Cowork ignores it when the option has no default ("Cowork doesn't prompt for values"); Claude Code "prompts you for the values". | Verified | PS |
| F4 | Pro/Max Cowork is moving to cloud sessions. | Not found | PS, LOAD |
| F5 | Skills load in Chat, Cowork, Claude Code. Commands load in Cowork (run by typing `/plugin-name:command`) and Claude Code. Agents and hooks: Cowork and Claude Code. LSP servers, output styles, themes, `settings`: Claude Code only. | Verified | PS |
| F6 | "Claude Code" includes the desktop app's Code tab. A plugin installed on the account "appears in Claude Code as a synced plugin at the next session start", as `<name>@synced`. | Verified | PS, LOAD |
| F7 | For synced plugins in terminal sessions: "skills, agents, hooks, MCP servers, and LSP servers all load" (commands not listed). Needs v2.1.273 or later and sign-in with the claude.ai account. | Verified | LOAD |
| F8 | `userConfig` fields: `type` (`string`, `number`, `boolean`, `directory`, `file`), `title`, `description` required; `default`, `required`, `options`, `multiple`, `sensitive`, `min`/`max` optional. Keys: letters, digits, underscores. Unknown keys fail validation. | Verified | REF |
| F9 | `${user_config.KEY}` is substituted "in MCP server config, LSP server config, exec-form hook `args`, and skill and agent content". Hooks also get `CLAUDE_PLUGIN_OPTION_<KEY>`. Command content is not listed. | Verified | REF |
| F10 | Each option appears as a row in `/config` (v2.1.269 or later). | Verified | REF |
| F11 | `${CLAUDE_PLUGIN_ROOT}` resolves in hook `command`/`args`, MCP stdio `command`/`args`/`env`, and skill, command, and agent Markdown bodies, but not in the Bash tool's environment. Marketplace plugins are copied to `cache/<marketplace>/<plugin>/<version>/`, so the root changes with every version. | Verified | REF, LOAD |
| F12 | A `CLAUDE.md` at the plugin root "isn't loaded as context"; `claude plugin validate` warns. | Verified | REF, COMP |
| F13 | "Commands are the older format, and skills supersede them for new work." A command takes the same frontmatter as a skill. | Verified | COMP |
| F14 | "By default, a subagent can spawn subagents of its own, up to three layers below the main conversation" (`CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH`). | Verified | SUB |
| F15 | "Plugin subagents don't support the `hooks`, `mcpServers`, or `permissionMode` frontmatter fields." | Verified | SUB |
| F16 | `skills:` frontmatter: "The full content of each listed skill is injected into the subagent's context at startup." `disable-model-invocation: true` "also prevents the skill from being preloaded into subagents". | Verified | SUB, SK |
| F17 | Custom subagents load user, project, and local `CLAUDE.md` files unless `omitClaudeMd: true` (v2.1.271 or later). | Verified | SUB |
| F18 | Plugin MCP tool names: `mcp__plugin_<plugin>_<server>__<tool>`. `tools` and `disallowedTools` also accept `mcp__<server>` and `mcp__<server>__*`. | Verified | COMP, SUB |
| F19 | Skill frontmatter includes `disable-model-invocation`, `user-invocable`, `argument-hint`, `allowed-tools`, `model`, `context: fork`. Arguments arrive as `$ARGUMENTS`, `$0`, `$1`, ... with shell-style quoting. A user-invoked skill runs in the main conversation. | Verified | SK |
| F20 | `allowed-tools` pre-approves tools "during the turn that invokes this skill. The grant clears when you send your next message." It does not apply to `context: fork` subagents. Effect on other subagents: not stated. | Verified, partly not documented | SK |
| F21 | Hooks accept `"shell": "powershell"` per hook. On Windows the default is Git Bash if installed, else PowerShell. | `shell` field verified; default from the subagent report only | REF, HOOKS |
| F22 | Whether plugin hooks fire for tool calls made inside subagents. | Not documented in the pages checked | HOOKS |
| F23 | Where Cowork runs local MCP servers and hooks (Windows host or isolated environment). | Not documented | PS |
| F24 | A manifest `version` pins installs until it changes; without `version`, a Git-hosted plugin's version is its commit SHA. "For a plugin from a marketplace hosted on claude.ai, the version claude.ai records for the plugin is its version, and the manifest's `version` isn't read." Auto-update is on by default for marketplaces added from claude.ai. | Verified | LOAD, REF |
| F25 | Account installs: up to 25 self-added marketplaces; each plugin up to 5,000 files and 200 MB. | Verified | PS |
| F26 | Marketplaces added in claude.ai can be GitHub and GitHub Enterprise repositories, and public GitLab and Bitbucket repositories. | Verified | PS |
| F27 | A marketplace entry can point to a plugin directory by relative path from the marketplace root. The exact entry is confirmed with `claude plugin validate`. | Verified in principle | REF |
| F28 | Plugin `name`: kebab-case, no spaces, `@`, `:`, or path separators. Components are namespaced under it. | Verified | REF |
| F29 | Signing or security requirements for binaries shipped in a plugin. | Not documented | |
| F30 | After an update mid-session, MCP servers keep the previous version's path until `/reload-plugins`. | Verified | LOAD |
| F31 | Marketplace plugins are copied into the cache at install; "Files outside the plugin directory aren't copied." | Verified | LOAD |
| F32 | `claude plugin validate` reports a missing `version`, `description`, or `author`, and a non-kebab-case `name`, as warnings; `--strict` turns warnings into failures. Its MCP entry checks need Claude Code v2.1.281 or later. | Verified | REF |

## Appendix B: `onenote-mcp` facts

Read on 2026-10-03 at `C:\Projects\Personal\onenote-mcp`, branch `ci/standalone-exe` (HEAD `03c70a1`, not merged into `main`). Python with FastMCP (`mcp` 1.27.0), comtypes, and pydantic, over stdio. Paths are relative to `src/onenote_mcp/`. Facts marked **read** were re-read in the source directly; the others come from an agent's read with the line references given.

- **B1 `get_page`** returns `{title, outlines, images}` with default values left out. An outline has `position` (x, y, z), `width`, and items: paragraphs (text or segments, `h1` to `h6`, bold, italic, underline, strikethrough, color, highlight, font size, font family), lists (bullet or numbered, nested), inline images. Units are points.
  - Outline height is not returned (**read**, `builders.py:793-799`).
  - Formatting is read only from inline spans. OneNote can move written CSS to a paragraph-level style, which is ignored (`builders.py:441-533`, `test_headings.py:62-65`).
  - Tables come back as empty paragraphs. Ink is dropped. No tool returns a last-modified time.
  - A negative outline coordinate on an existing page makes `get_page` fail with `bad_request` (`models.py:120-126`).
- **B2 Writes.**
  - `create_page(section_id, title, parent_page_id?)` returns the new page ID. Section by ID only. It sets only the title (`com.py:570-661`).
  - `replace_page(page_id, title, outlines, images?)` keeps the page ID. It deletes every top-level object except the title (ink, images, tables included), swallowing per-object errors, then writes once. No conflict check: `dateExpectedLastModified` is `0.0` (**read**, `com.py:549-567`). Not atomic.
  - Settable: outline position and width, `h1` to `h6` (fixed CSS, `h1` 16 pt bold), font size, color, highlight, font family, bold, italic, underline, strikethrough, lists. Not settable: tables (raw XML only), alignment, outline height, images other than existing handles.
  - `append_page(page_id, outline)` adds one outline.
- **B3 Navigation.** `get_notebooks` returns notebooks with the sections directly below them; section groups are not listed (**read**, `builders.py:701-705`). `list_pages` returns a flat `{id, name}` list without level or dates. No tool creates a section.
- **B4 OneNote state and errors.** Every call creates the COM object, which most likely starts OneNote if installed (not proven); if OneNote is not registered for COM, calls fail with a `backend_error` saying so. `ping` returns `{"server": "ok", "onenote_responsive": true|false}` and never fails. Errors arrive as `Error executing tool <tool>: <code>: <message>`; argument validation errors carry no code. On `timeout` the worker thread is abandoned, so a timed-out write may still complete. No retries in the server.
- **B5 Images.** Handles are `mcpref:` plus 12 hex characters, valid only while the server process runs. No tool takes a local file path.
- **B6 Environment.** `ONENOTE_ALLOWED_NOTEBOOKS`: comma-separated display names, trimmed, exact and case-sensitive; unset or blank means no restriction (**read**, `com.py:403-414`); enforced on reads and writes of sections and pages, not on `ping`, `get_image_data`, `validate_handles` (**read**, `com.py:433-462`). Timeouts: `ONENOTE_READ_TIMEOUT` 20 s, `ONENOTE_WRITE_TIMEOUT` 25 s, `ONENOTE_PING_TIMEOUT` 8 s. FastMCP also reads `FASTMCP_*` variables and a `.env` file in the working directory.
- **B7 Tools.** 13 (9 with `ONENOTE_DISABLE_RAW_XML=1`, R4): `ping`, `validate_handles`, `get_image_data`, `get_notebooks`, `list_pages`, `get_page`, `create_page`, `replace_page`, `append_page`, and the raw-XML tools `list_hierarchy_xml`, `get_page_xml`, `replace_page_xml`, `append_page_xml`.
- **B8 Release.** `.github/workflows/release.yml` on a `v*` tag: unit tests, tag-equals-version check, PyInstaller onefile (Python 3.14), smoke test without OneNote, release with `onenote-mcp.exe` and `onenote-mcp.exe.sha256` (sha256sum format). Not signed. Size unknown. Version 1.0.1; the workflow is not on `main` yet.
- **B9 Without OneNote.** The exe answers `tools/list` without OneNote; COM is touched only on the first tool call.
- **B10 Content from other devices.** Ink synced to the desktop copy is deleted by `replace_page`, with no conflict check.
- **Escaping bug** (fixed by R1, not yet released). Styled text went into an HTML span without escaping (**read**, `builders.py:87-101`), so `<`, `&`, or `]]>` broke the write or corrupted the text, and color and font family went into the CSS unchecked.

Server changes (O27):

| ID | Change | Status |
|---|---|---|
| R1 | Escape text in styled spans; validate color and font family | Done on branch `fix/escaping-raw-xml-switch` (2026-10-03): all text in `<one:T>` is escaped, colors must be `#RGB` or `#RRGGBB`, font families match `^[A-Za-z0-9 ,.\-]+$`; `get_page` normalizes OneNote's color names to hex and drops values that do not fit |
| R2 | Merge `ci/standalone-exe` and `fix/escaping-raw-xml-switch`, publish `v1.0.1` with exe and checksum | Open, maintainer |
| R4 | `ONENOTE_DISABLE_RAW_XML=1` hides the raw-XML tools | Done on the same branch: read once at startup, 9 tools when set, an invalid value stops the server |
| R3, R7, R8 | Section groups, page levels, tables | Dismissed |
| R5, R6, R9 | Last-modified and conflict check, outline height and paragraph formatting, negative positions | After v1 |

## Appendix C: Build process (Decided, O26)

The plugin is built with AgentPasture (`.agentpasture/`, engine 0.9.0): Claude Code in a Linux container on a git bundle of this repo, plan phase by phase, an independent review agent as quality gate, results returned as a local branch.

- **Project files:** `pasture.config.json` (verify `npm run verify`, context doc `SPEC.md`, protected paths), `PROJECT_RULES.md` (binding rules for this repo), `review-checks.md` (reviewer checklist). The generic `engine/` is not changed.
- **Not in git:** `.agentpasture/` is gitignored and lives only on the maintainer's machine; the engine reads it from there and mounts what the agents need. The root `.gitignore` also ignores `.agentpasture-*`, the files the engine copies into the workspace and the reviewer's result file, so no agent can commit them.
- **Protected paths:** `.agentpasture/**`, `.github/**`, `SPEC.md`, `plans/**`, `**/server/**`. Plan 5 runs with `.github/**` unprotected.
- **Models:** `--impl-model opus --review-model opus` for every plan.
- **Prerequisites:** at least one commit (the engine bundles `HEAD`), Docker on the host, a credential in `.agentpasture/.env`. The server exe is not needed (section 11.2).
- **The container can verify:** manifests, `claude plugin validate --strict`, frontmatter and tool lists, language markers, the plugin directory's contents, dashes. **It cannot verify** anything that needs Windows, OneNote, the Desktop app, or the iPad (S2, S3, and the `[manual]` criteria).
- **The image pins Claude Code 2.1.280;** `validate` checks MCP entries only from 2.1.281 (F32). The repo's own checks cover `.mcp.json`.

Plans, one file each under `plans/`, each split into phases with acceptance criteria:

1. `01-scaffold-and-checks.md`: `package.json`, `checks/` with tests, `verify` and `verify:release`, marketplace and plugin manifests, `.mcp.json`.
2. `02-conventions-and-templates.md`: `lesson-conventions` (`SKILL.md`, `board.md`, `lesson-folder.md`, examples) and the German templates.
3. `03-agents.md`: the four agents.
4. `04-entry-points.md`: `orchestration.md`, `einrichten`, `stunde-planen`, `stunde-ueberarbeiten`, README, CHANGELOG.
5. `05-ci.md`: CI, the version-bump check, the server vendoring workflow with the tool contract check.

**Running end to end:** `.agentpasture/run-plan.ps1` runs one plan from `main` into its result branch (`build/<plan>`); re-running the same command resumes the plan from its last passed phase. After review, fixes run as fix plans (`plans/fixes/`), each into its own branch on top of the last one. The final branch is merged into `main` locally with a merge commit, as if through a pull request, and the next plan starts from `main`. For plan 05 the script removes `.github/**` from the protected paths and restores the config afterwards. There is no remote yet: `main` is pushed, and teachers install from it, only once `npm run verify:release` passes with the vendored server.

CI facts pinned for plan 05 (looked up on 2026-10-03): `actions/checkout` v7.0.1 is commit `3d3c42e5aac5ba805825da76410c181273ba90b1`, `actions/setup-node` v7.0.0 is commit `820762786026740c76f36085b0efc47a31fe5020`, `@anthropic-ai/claude-code` latest is 2.1.288 (it has a `postinstall` script, so it is installed globally in CI, never as a dependency).
