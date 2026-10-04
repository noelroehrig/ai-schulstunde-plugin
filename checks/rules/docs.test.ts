import { test } from "node:test";
import assert from "node:assert/strict";
import { changelogFile, manifestFiles, readmeFile } from "../fixtures.ts";
import { createMemoryRepo } from "../repo.ts";
import { COMMANDS, MARKETPLACE_REPO, docs } from "./docs.ts";
import { SERVER_EXE } from "./orchestration.ts";

const README = "README.md";
const CHANGELOG = "CHANGELOG.md";
const MANIFEST = "plugin/.claude-plugin/plugin.json";

/** README, CHANGELOG, and the repository's own manifests, which pass the rule. */
function docFiles(): Record<string, string> {
  return { ...manifestFiles(), [README]: readmeFile(), [CHANGELOG]: changelogFile() };
}

/** Runs the rule on a repository holding only the given files. */
function check(files: Record<string, string>) {
  return docs.run(createMemoryRepo(files), "build");
}

/** Asserts exactly one docs finding on `file` whose message matches `pattern`. */
function assertOneFinding(files: Record<string, string>, file: string, pattern: RegExp): void {
  const findings = check(files);
  assert.equal(findings.length, 1, JSON.stringify(findings));
  assert.equal(findings[0].rule, "docs");
  assert.equal(findings[0].file, file);
  assert.match(findings[0].message, pattern);
}

/** Sets the `version` of the manifest in `files`. */
function withVersion(files: Record<string, string>, version: string): Record<string, string> {
  const manifest = JSON.parse(files[MANIFEST]) as Record<string, unknown>;
  return { ...files, [MANIFEST]: JSON.stringify({ ...manifest, version }) };
}

test("docs passes on a README and CHANGELOG that hold what the rule needs", () => {
  assert.deepEqual(check(docFiles()), []);
});

test("docs accepts CRLF line endings", () => {
  const files = docFiles();
  files[README] = files[README].replace(/\n/g, "\r\n");
  files[CHANGELOG] = files[CHANGELOG].replace(/\n/g, "\r\n");
  assert.deepEqual(check(files), []);
});

test("docs passes when README and CHANGELOG do not exist yet", () => {
  assert.deepEqual(check(manifestFiles()), []);
});

test("docs reports each command missing from the README", () => {
  for (const command of COMMANDS) {
    const files = { ...docFiles(), [README]: readmeFile().split(command).join("x") };
    assertOneFinding(files, README, new RegExp(`command "${command}"`));
  }
});

test("docs reports a README without the marketplace repository", () => {
  const files = { ...docFiles(), [README]: readmeFile().split(MARKETPLACE_REPO).join("x") };
  assertOneFinding(files, README, /noelroehrig\/ai-schulstunde-plugin/);
});

test("docs reports a README without a troubleshooting entry naming the server exe", () => {
  const files = { ...docFiles(), [README]: readmeFile().split(SERVER_EXE).join("x") };
  assertOneFinding(files, README, /onenote-mcp\.exe/);
});

test("docs reports a CHANGELOG without an entry for the manifest version", () => {
  assertOneFinding(withVersion(docFiles(), "99.0.0"), CHANGELOG, /99\.0\.0/);
});

test("docs does not count a version that only starts the same way", () => {
  const files = withVersion(docFiles(), "0.1.0");
  files[CHANGELOG] = "# Änderungen\n\n## 0.1.01 (2026-10-03)\n\n- Text.\n";
  assertOneFinding(files, CHANGELOG, /0\.1\.0/);
});

test("docs does not count the version outside a heading", () => {
  const files = withVersion(docFiles(), "0.1.0");
  files[CHANGELOG] = "# Änderungen\n\nVersion 0.1.0 kommt bald.\n";
  assertOneFinding(files, CHANGELOG, /0\.1\.0/);
});

test("docs skips the CHANGELOG version check when plugin.json is missing or malformed", () => {
  const files = docFiles();
  delete files[MANIFEST];
  assert.deepEqual(check(files), []);
  assert.deepEqual(check({ ...docFiles(), [MANIFEST]: "{" }), []);
});
