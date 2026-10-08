import { test } from "node:test";
import assert from "node:assert/strict";
import { serverFiles } from "../fixtures.ts";
import type { Mode } from "../repo.ts";
import { createMemoryRepo } from "../repo.ts";
import { server } from "./server.ts";

const EXE = "plugin/server/onenote-mcp.exe";
const VERSION = "plugin/server/VERSION";
const SHA = "plugin/server/onenote-mcp.exe.sha256";

/** Runs the rule on a repository holding the given files. */
function check(files: Record<string, string>, mode: Mode = "build") {
  return server.run(createMemoryRepo(files), mode);
}

/** Asserts exactly one server finding on `file` whose message matches `pattern`. */
function assertOneFinding(files: Record<string, string>, file: string, pattern: RegExp, mode: Mode = "build"): void {
  const findings = check(files, mode);
  assert.equal(findings.length, 1, JSON.stringify(findings));
  assert.equal(findings[0].rule, "server");
  assert.equal(findings[0].file, file);
  assert.match(findings[0].message, pattern);
}

test("server passes on a consistent vendored server in both modes", () => {
  assert.deepEqual(check(serverFiles(), "build"), []);
  assert.deepEqual(check(serverFiles(), "release"), []);
});

test("server accepts a VERSION without a newline and CRLF files", () => {
  const files = serverFiles();
  files[VERSION] = "v1.0.1";
  files[SHA] = files[SHA].replace("\n", "\r\n");
  assert.deepEqual(check(files), []);
});

test("server rejects a release with a server that reads an empty allowlist as every notebook", () => {
  for (const version of ["v1.0.1\n", "v0.9.0\n"]) {
    const files = { ...serverFiles(), [VERSION]: version };
    assertOneFinding(files, VERSION, /up to v1\.0\.1 read an empty allowlist as every notebook/, "release");
    assert.deepEqual(check(files, "build"), []);
  }
});

test("server is only a notice in build mode when not vendored", () => {
  const repo = createMemoryRepo({ "plugin/.mcp.json": "{}" });
  assert.deepEqual(server.run(repo, "build"), []);
  assert.deepEqual(server.notices?.(repo, "build"), ["server not vendored yet"]);
});

test("server reports a missing server directory in release mode", () => {
  assertOneFinding({ "plugin/.mcp.json": "{}" }, "plugin/server/", /not vendored/, "release");
  assert.deepEqual(server.notices?.(createMemoryRepo({}), "release"), []);
});

test("server has no notice when vendored", () => {
  assert.deepEqual(server.notices?.(createMemoryRepo(serverFiles()), "build"), []);
});

test("server reports a missing file even in build mode", () => {
  const files = serverFiles();
  delete files[VERSION];
  assertOneFinding(files, VERSION, /missing/);
});

test("server reports an extra file", () => {
  assertOneFinding({ ...serverFiles(), "plugin/server/README.md": "" }, "plugin/server/README.md", /not allowed/);
});

test("server reports a malformed VERSION", () => {
  assertOneFinding({ ...serverFiles(), [VERSION]: "1.0.1\n" }, VERSION, /VERSION/);
});

test("server accepts the binary marker that sha256sum writes on Windows", () => {
  const files = serverFiles();
  files[SHA] = files[SHA].replace("  onenote-mcp.exe", " *onenote-mcp.exe");
  assert.deepEqual(check(files), []);
});

test("server reports a checksum line for another file in either format", () => {
  for (const separator of ["  ", " *"]) {
    const files = serverFiles();
    files[SHA] = files[SHA].replace("  onenote-mcp.exe", `${separator}other.exe`);
    assertOneFinding(files, SHA, /one line/);
  }
});

test("server reports a malformed checksum file", () => {
  const files = serverFiles();
  files[SHA] = files[SHA].toUpperCase();
  assertOneFinding(files, SHA, /one line/);
});

test("server reports a checksum that does not match the exe", () => {
  assertOneFinding({ ...serverFiles(), [EXE]: "other exe" }, SHA, /does not match/);
});
