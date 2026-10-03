# Plan 01: scaffold and repo checks

Builds the development tooling and the plugin skeleton: the repo checks with their tests, the
`verify` and `verify:release` scripts, the marketplace and plugin manifests, and `.mcp.json`. No
skills, agents, or templates yet (plans 02 to 04). Read `SPEC.md` first, especially sections 3,
5.1, 5.2, 10, 11, and 13, and Appendix C.

Common rules for every phase:

- The checks live in `checks/`, as TypeScript ES modules run with `tsx` and tested with `node:test`
  and `node:assert/strict`. Development dependencies are exactly `typescript`, `tsx`, and
  `@types/node` 22, pinned to exact versions. No other package, in particular no YAML or JSON schema
  library.
- Each rule is a pure function that receives a read-only view of a repository (an injected interface
  that lists files and reads text or bytes) and returns findings `{ file, rule, message }`. Only the
  CLI module touches the real file system.
- Tests build fixture repositories in a temporary directory (or an in-memory implementation of the
  interface). Every rule has at least one test where it passes and one where it reports a finding,
  and each failure test asserts the rule name and the file in the finding.
- Developer-facing output (check messages, test names) is English. Values the teacher sees (German
  strings in manifests) are written exactly as given below.
- The repo walk skips `.git/`, `node_modules/`, and `.agentpasture/`.
- Never create anything under `plugin/server/`.

## Phase 1: tooling and the check runner

Files: `package.json`, `package-lock.json`, `tsconfig.json`, `checks/repo.ts`
(the repository interface and its file-system implementation), `checks/run.ts` (the CLI),
`checks/rules/dashes.ts`, `checks/rules/json.ts`, and their tests.

Acceptance criteria:

1. `package.json` at the repo root is `private`, `"type": "module"`, has no `dependencies`, and has
   exactly the three development dependencies above at exact versions. `package-lock.json` is
   committed.
2. Scripts: `typecheck` runs `tsc --noEmit`; `test` runs `node --import tsx --test` on
   `checks/**/*.test.ts`; `check` runs the CLI in build mode; `check:release` runs it in release
   mode; `verify` runs `typecheck`, `test`, and `check` in that order and stops at the first failure.
   (`validate` joins `verify` in phase 2, `verify:release` is completed in phase 3.)
3. `tsconfig.json` is strict, uses `NodeNext` modules, `noEmit`, and includes only `checks/`.
4. The root `.gitignore` already ignores `.agentpasture/`, the engine's workspace files
   (`.agentpasture-*`), and `node_modules/`. Leave it unchanged.
5. `checks/run.ts` takes `--mode build` or `--mode release`, runs every registered rule against the
   repo root, prints each finding as `<file>: <rule>: <message>`, prints a final count, and exits
   with code 1 when there is at least one finding and 0 otherwise. An unknown or missing `--mode` is
   an error with exit code 2.
6. Rule `no-dashes`: an em dash (U+2014) or en dash (U+2013) in any `.md`, `.json`, `.ts`, `.yml`,
   `.yaml`, or `.txt` file is a finding naming file and line.
7. Rule `json-valid`: every `.json` file parses; a file that does not is a finding with the parser's
   message.
8. `npm run verify` passes on the repository as it is after this phase.

## Phase 2: marketplace, plugin manifest, MCP config

Files: `.claude-plugin/marketplace.json`, `plugin/.claude-plugin/plugin.json`, `plugin/.mcp.json`,
`checks/rules/marketplace.ts`, `checks/rules/manifest.ts`, `checks/rules/mcp.ts`, their tests, and
the `validate` script.

Acceptance criteria:

1. `.claude-plugin/marketplace.json` is exactly:

   ```json
   {
     "name": "schulstunde",
     "description": "Plugins für die Unterrichtsplanung mit Claude.",
     "owner": { "name": "Noel Röhrig" },
     "plugins": [
       {
         "name": "unterricht",
         "source": "./plugin",
         "description": "Plant Unterrichtsstunden mit Prüfschleifen und legt das Tafelbild in OneNote an."
       }
     ]
   }
   ```

   The entry has no `version` (the manifest's `version` wins, and a second one is a validate warning).
2. `plugin/.claude-plugin/plugin.json` has `name` `unterricht`, `version` `0.1.0`, `description`
   `Plant Unterrichtsstunden mit Prüfschleifen und legt das Tafelbild in OneNote an.`, `author`
   `{ "name": "Noel Röhrig" }`, and the `userConfig` block of `SPEC.md` section 5.2, character for
   character. No other keys.
3. `plugin/.mcp.json` is exactly the block in `SPEC.md` section 11.1.
4. Rule `marketplace`: name `schulstunde`; `owner.name` not empty; exactly one plugin entry, named
   `unterricht`, with source `./plugin` and no `version`.
5. Rule `manifest`: `name` is `unterricht`; `version` matches `^\d+\.\d+\.\d+$`; `description` and
   `author.name` are not empty; every `userConfig` option has `type`, `title`, `description`, and
   `default`, uses only the keys listed in `SPEC.md` Appendix A F8, and has a `default` whose JSON
   type matches `type` (`boolean` for `boolean`, string for `string`).
6. Rule `mcp`: exactly one server, `onenote`; `command` is
   `${CLAUDE_PLUGIN_ROOT}/server/onenote-mcp.exe`; `env` has exactly `ONENOTE_ALLOWED_NOTEBOOKS` set
   to `${user_config.notebook}` and `ONENOTE_DISABLE_RAW_XML` set to `"1"`.
7. Rule `user-config-refs`: every `${user_config.KEY}` in any file under `plugin/` names an option
   declared in `plugin.json`; an undeclared key is a finding naming file and key.
8. Script `validate` runs `claude plugin validate . --strict` at the repo root (the marketplace root,
   which validates the marketplace and the plugin's own files), and `verify` now runs `typecheck`,
   `test`, `check`, `validate`. If `claude` cannot run in the container (for example it needs a
   login), stop and report PARTIAL with the exact error; never drop `validate` from `verify`.
9. `npm run verify` passes.

## Phase 3: plugin directory rules and release completeness

Files: `checks/frontmatter.ts` (a minimal parser for the flat `key: value` frontmatter used by
agents and skills), `checks/permissions.ts` (the permission table of `SPEC.md` section 10 as a
constant), `checks/rules/plugin-dir.ts`, `checks/rules/paths.ts`, `checks/rules/agents.ts`,
`checks/rules/skills.ts`, `checks/rules/server.ts`, `checks/rules/completeness.ts`, their tests,
and the `verify:release` script.

Acceptance criteria:

1. `parseFrontmatter(text)` returns the `key: value` pairs between the opening and closing `---`
   lines (the value is everything after the first `: `, trimmed) and the body after it. A file
   without frontmatter, an unclosed block, or a duplicate key is an error, which the rules report as
   a finding.
2. Rule `plugin-dir`: the top level of `plugin/` contains only `.claude-plugin`, `.mcp.json`,
   `server`, `skills`, `agents`, and `templates`. Anything else (for example `bin`, `commands`,
   `hooks`, `CLAUDE.md`, `settings.json`, `.lsp.json`, `output-styles`, `themes`, `monitors`) is a
   finding.
3. Rule `paths`: no JSON string value under `plugin/` contains a backslash or starts with a drive
   letter or `/`. Every `${CLAUDE_PLUGIN_ROOT}/<path>` reference in a file under `plugin/` points to
   an existing file, except `server/onenote-mcp.exe`.
4. Rule `agents`, for each `plugin/agents/*.md` that exists:
   - the file name is `<name>.md`, and `name` is one of the four agents of `SPEC.md` section 3.1;
   - `description` is not empty; `model` is `inherit`; `omitClaudeMd` is `true`; `skills` is
     `lesson-conventions`;
   - `tools`, split at commas and trimmed, equals the agent's set in `checks/permissions.ts` exactly
     (OneNote tools written as `mcp__plugin_unterricht_onenote__<tool>`); a missing or extra tool,
     a `*`, or a server-level entry is a finding;
   - the body contains the mandated language sentence of `SPEC.md` section 3 verbatim;
   - for `plan-reviewer` and `board-reviewer`, the body also contains the reviewer exception
     sentence verbatim.
5. Rule `skills`, for each `plugin/skills/*/SKILL.md` that exists: the directory name is one of the
   four skills of `SPEC.md` section 3.1. `einrichten`, `stunde-planen`, and `stunde-ueberarbeiten`
   have `disable-model-invocation: true` and a non-empty `description`. `lesson-conventions` has
   `user-invocable: false` and does not set `disable-model-invocation`.
6. Rule `server`: if `plugin/server/` exists, it holds exactly `onenote-mcp.exe`, `VERSION`
   (matching `^v\d+\.\d+\.\d+\n?$`), and `onenote-mcp.exe.sha256` (one line,
   `<64 lowercase hex>  onenote-mcp.exe`), and the hash equals the SHA-256 of the exe computed with
   `node:crypto`. In build mode a missing `plugin/server/` prints the notice
   `server not vendored yet` and is not a finding. In release mode it is a finding.
7. Rule `completeness`, release mode only: the four agents, the four skills,
   `plugin/skills/lesson-conventions/board.md`, at least one file in
   `plugin/skills/lesson-conventions/examples/`, `plugin/templates/` with `CLAUDE.md`,
   `schulkontext.md`, `kriterien.md`, and `onenote.md`, and `README.md` and `CHANGELOG.md` at the
   root. Each missing item is its own finding.
8. Script `verify:release` runs `typecheck`, `test`, `check:release`, `validate`.
9. On the repository as it is after this phase, `npm run verify` passes, and `npm run verify:release`
   fails with one finding per missing component and one for the missing server. Record the
   `verify:release` output in the commit message body.
