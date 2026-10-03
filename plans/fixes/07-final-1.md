# Fix 07-1: findings of the release-readiness audit

Plans 01 to 05 and fixes up to 06-1 are merged. This fix changes only what is listed below.
`SPEC.md` is binding where an earlier plan said otherwise. Read `SPEC.md` (sections 6.1, 6.2, 9,
11.2, 11.3), all of `plugin/`, `README.md`, `scripts/vendor-server.ts`, `checks/rules/server.ts`,
and `scripts/tool-contract.test.ts` first. Every mechanical requirement gets its check or test
first.

## Phase 1: entry points and orchestration

Files: `plugin/skills/stunde-planen/SKILL.md`, `plugin/skills/stunde-ueberarbeiten/SKILL.md`,
`plugin/skills/lesson-conventions/orchestration.md`, `plugin/skills/lesson-conventions/lesson-folder.md`,
`README.md`.

Acceptance criteria:

1. The preflight no longer requires a filled Ablage in `onenote.md` (`SPEC.md` 6.1 and 11.3: plan
   anyway). When `Seitentitel` is a placeholder, the lesson folder and later the page title use the
   default scheme `JJJJ-MM-TT Klasse Thema` (`SPEC.md` section 9). `Abschnitt` is checked only at
   the OneNote gate; a placeholder there is handled like a missing section (ask the teacher). The
   README says the same.
2. A `FAILED` result of an agent whose reason contains `bad_request` ends with a German message
   that shows the error and asks the teacher to forward it to the maintainer (`SPEC.md` 11.3), not
   only with the resume hint.
3. `orchestration.md` names `<plugin root>/skills/lesson-conventions/SKILL.md` where it refers to
   the assignment shape and the conventions, and contains no reference to `SPEC.md` (it does not
   ship with the plugin).
4. The sentence in `orchestration.md` that lists the OneNote tools the main session calls includes
   every tool any entry point calls, `list_pages` included.

## Phase 2: agents and conventions

Files: `plugin/agents/*.md`, `plugin/skills/lesson-conventions/SKILL.md`.

Acceptance criteria:

1. `board-author`: a `timeout` on its own `get_notebooks` or `list_pages` call is handled as the
   read timeout of `SPEC.md` 11.3: `ping`, then the same call once more; a second failure ends with
   `FAILED` and the error text. The `create_page` rules stay as they are.
2. Review rule in `SKILL.md`: a new Muss-Mangel (one the previous review did not raise) needs an
   actual violation of `kriterien.md`, `schulkontext.md`, the plan format of `SKILL.md`, or the
   conventions of `board.md`. The reviewer agents follow this wording and do not contradict it.
3. The agents describe the teacher-input file as the current loop's `Rückmeldung` file as listed in
   the assignment, whatever its number, never as "numbered like output".
4. `lesson-planner` reads `${CLAUDE_PLUGIN_ROOT}/skills/lesson-conventions/examples/plan.md` and
   `examples/NOTES.md` as an example of the format and quality, never as content to copy.
5. `npm run verify` passes, and the `agents` and `agent-bodies` rules report nothing.

## Phase 3: checksum format and the tool-contract CLI test

Files: `scripts/vendor-server.ts`, `checks/rules/server.ts`, their tests,
`scripts/tool-contract.test.ts`.

Acceptance criteria:

1. Both parsers of a checksum line accept `<64 hex>  onenote-mcp.exe` and `<64 hex> *onenote-mcp.exe`
   (the binary marker `sha256sum` writes on Windows), with tests for both and for a wrong file name.
2. `vendor-server.ts` writes `plugin/server/onenote-mcp.exe.sha256` always as
   `<64 lowercase hex>  onenote-mcp.exe` and a final newline, whatever the input format.
3. The tool-contract CLI test passes an `--exe` value different from the default (for example
   `./onenote-mcp.exe`) and asserts that value as the file of the printed findings.
4. No other file changes. `npm run verify` passes, and `npm run verify:release` fails with exactly
   one finding: the server is not vendored.
