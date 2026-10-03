# Fix 07-2: fresh notebook data after the teacher's section answer

Everything else is merged. This fix changes only what is listed below. Read `SPEC.md` sections 6.1
and 11.3 and `plugin/skills/lesson-conventions/orchestration.md` first.

## Phase 1: re-read the sections in the OneNote gate

Files: `plugin/skills/lesson-conventions/orchestration.md`, any entry-point `SKILL.md` that runs
the same section check itself.

Acceptance criteria:

1. Whenever the OneNote gate (or an entry point) checks a section after the teacher answered a
   section question (a missing section, or `Abschnitt` still a placeholder), it calls
   `get_notebooks` again first and checks against that fresh answer, so a section the teacher just
   created in OneNote is found. The `timeout` handling for this read stays as for every own read
   (`ping`, once more, then stop).
2. No other change in meaning. `npm run verify` passes, and `npm run verify:release` fails with
   exactly one finding: the server is not vendored.
