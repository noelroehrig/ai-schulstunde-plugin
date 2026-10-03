# Fix 06-1: final polish from the reviews of plans 04 and 05

Plans 01 to 05 are implemented and merged. This fix changes only what is listed below. Read
`SPEC.md` (sections 6.1, 11.3, 12.1), `plugin/skills/`, `README.md`, `checks/version-bump-cli.ts`,
and `scripts/tool-contract.test.ts` first. Every mechanical requirement gets its check or test
first.

## Phase 1: OneNote server not running, `Freigegebener Plan`

Files: `plugin/skills/lesson-conventions/orchestration.md`,
`plugin/skills/lesson-conventions/lesson-folder.md`, the entry-point `SKILL.md` files where they
call OneNote tools themselves, `README.md`.

Acceptance criteria:

1. Implements the last row of `SPEC.md` section 11.3 (already there; `SPEC.md` stays unchanged):
   when the plugin's OneNote tools
   (`mcp__plugin_unterricht_onenote__*`) are not available in the session, the OneNote server did
   not start (for example Windows blocked the unsigned `onenote-mcp.exe`). Wherever the procedure
   would call `ping` first (the preflight of `stunde-planen` and `stunde-ueberarbeiten`, the
   OneNote gate, the OneNote steps of `einrichten`), it checks this first and treats it like
   `onenote_responsive: false`: the preflight warns and plans anyway, the gate stops and keeps the
   plan with the resume hint, `einrichten` skips the OneNote steps and lists them as missing.
2. The German message is written once, in `orchestration.md`, and the entry points refer to it:
   `Die OneNote-Verbindung des Plugins läuft nicht. Starte die Claude-App neu. Wenn das nicht hilft,
   prüfe, ob Windows Defender oder SmartScreen die Datei onenote-mcp.exe blockiert.` (or wording of
   the same content in correct German with "du").
3. `README.md` troubleshooting has an entry for this case with the same advice.
4. `lesson-folder.md` describes `Freigegebener Plan` as the plan of the last `APPROVED` verdict or
   `So übernehmen` in the planning loop, shown at the checkpoint and used by the board loop.

## Phase 2: version-bump CLI and tool-contract tests

Files: `checks/version-bump-cli.ts`, its test, `scripts/tool-contract.test.ts`.

Acceptance criteria:

1. The changed files are read with `git -c core.quotepath=false diff --name-only --no-renames
   <ref>...HEAD`, so a path with an umlaut and both sides of a rename are listed as plain paths. A
   test covers the argument list.
2. The `evaluateContract` tests assert the `file` field of every finding, and the CLI test asserts
   the full `<file>: tool-contract: <message>` line.
3. No other file changes. `npm run verify` passes, and `npm run verify:release` fails with exactly
   one finding: the server is not vendored.
