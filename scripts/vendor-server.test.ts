import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  bumpPatch,
  formatDate,
  insertChangelogEntry,
  isValidTag,
  main,
  parseChecksumLine,
} from "./vendor-server.ts";

const SCRIPT = fileURLToPath(new URL("./vendor-server.ts", import.meta.url));

const EXE_BYTES = Buffer.from("not a real server, only bytes to hash\n");
const EXE_SHA = createHash("sha256").update(EXE_BYTES).digest("hex");

const MANIFEST = {
  name: "unterricht",
  version: "0.1.0",
  description: "Beispiel",
  author: { name: "Beispiel" },
};

const CHANGELOG = "# Änderungen\n\n## 0.1.0 (2026-10-03)\n\nErste Version.\n";

/** A temporary minimal repository and a download folder holding a fake release. */
interface Fixture {
  root: string;
  download: string;
  cleanup: () => void;
}

/** Creates a minimal repository and a download folder whose checksum file says `checksumLine`. */
function makeFixture(checksumLine = `${EXE_SHA}  onenote-mcp.exe\n`): Fixture {
  const base = mkdtempSync(join(tmpdir(), "vendor-server-"));
  const root = join(base, "repo");
  const download = join(base, "download");
  mkdirSync(join(root, "plugin", ".claude-plugin"), { recursive: true });
  writeFileSync(join(root, "plugin", ".claude-plugin", "plugin.json"), JSON.stringify(MANIFEST));
  writeFileSync(join(root, "CHANGELOG.md"), CHANGELOG);
  mkdirSync(download);
  writeFileSync(join(download, "onenote-mcp.exe"), EXE_BYTES);
  writeFileSync(join(download, "onenote-mcp.exe.sha256"), checksumLine);
  return { root, download, cleanup: () => rmSync(base, { recursive: true, force: true }) };
}

/** Runs `main` silently and returns the exit code and the error lines. */
function runMain(args: string[], cwd: string): { code: number; errors: string[] } {
  const errors: string[] = [];
  const code = main(args, cwd, () => {}, (line) => errors.push(line), new Date("2026-10-04T12:00:00Z"));
  return { code, errors };
}

test("isValidTag accepts only vX.Y.Z", () => {
  assert.equal(isValidTag("v1.0.1"), true);
  assert.equal(isValidTag("v10.20.30"), true);
  for (const tag of ["1.0.1", "v1.0", "v1.0.1-rc1", "v1.0.1\n", "--tag", "v1.0.1;rm", ""]) {
    assert.equal(isValidTag(tag), false, tag);
  }
});

test("parseChecksumLine reads the sha256sum format with LF, CRLF, or no line end", () => {
  assert.equal(parseChecksumLine(`${EXE_SHA}  onenote-mcp.exe\n`), EXE_SHA);
  assert.equal(parseChecksumLine(`${EXE_SHA}  onenote-mcp.exe\r\n`), EXE_SHA);
  assert.equal(parseChecksumLine(`${EXE_SHA}  onenote-mcp.exe`), EXE_SHA);
  assert.equal(parseChecksumLine(`${EXE_SHA.toUpperCase()}  onenote-mcp.exe\n`), EXE_SHA);
});

test("parseChecksumLine rejects other files, short hashes, and extra lines", () => {
  assert.equal(parseChecksumLine(`${EXE_SHA}  other.exe\n`), undefined);
  assert.equal(parseChecksumLine(`${EXE_SHA.slice(1)}  onenote-mcp.exe\n`), undefined);
  assert.equal(parseChecksumLine(`${EXE_SHA} onenote-mcp.exe\n`), undefined);
  assert.equal(parseChecksumLine(`${EXE_SHA}  onenote-mcp.exe\nmore\n`), undefined);
  assert.equal(parseChecksumLine(""), undefined);
});

test("bumpPatch raises the patch version numerically", () => {
  assert.equal(bumpPatch("0.1.0"), "0.1.1");
  assert.equal(bumpPatch("1.2.9"), "1.2.10");
  assert.throws(() => bumpPatch("1.2"), /X\.Y\.Z/);
  assert.throws(() => bumpPatch("1.2.3-beta"), /X\.Y\.Z/);
});

test("formatDate writes the UTC date as YYYY-MM-DD", () => {
  assert.equal(formatDate(new Date("2026-01-05T23:30:00Z")), "2026-01-05");
});

test("insertChangelogEntry adds the entry directly under the heading", () => {
  assert.equal(
    insertChangelogEntry(CHANGELOG, "0.1.1", "2026-10-04", "v1.0.1"),
    "# Änderungen\n\n## 0.1.1 (2026-10-04)\n\n- Server aktualisiert auf v1.0.1.\n\n## 0.1.0 (2026-10-03)\n\nErste Version.\n",
  );
});

test("insertChangelogEntry keeps CRLF line ends and adds a missing blank line", () => {
  assert.equal(
    insertChangelogEntry("# Änderungen\r\n## 0.1.0 (2026-10-03)\r\n", "0.1.1", "2026-10-04", "v1.0.1"),
    "# Änderungen\r\n\r\n## 0.1.1 (2026-10-04)\r\n\r\n- Server aktualisiert auf v1.0.1.\r\n\r\n## 0.1.0 (2026-10-03)\r\n",
  );
});

test("insertChangelogEntry fails without the heading", () => {
  assert.throws(() => insertChangelogEntry("# Changes\n", "0.1.1", "2026-10-04", "v1.0.1"), /# Änderungen/);
});

test("main refuses a checksum mismatch and writes nothing", () => {
  const fixture = makeFixture(`${"0".repeat(64)}  onenote-mcp.exe\n`);
  try {
    const { code, errors } = runMain(
      ["--tag", "v1.0.1", "--from", fixture.download, "--root", fixture.root],
      fixture.root,
    );
    assert.equal(code, 1);
    assert.match(errors.join("\n"), /checksum/);
    assert.equal(existsSync(join(fixture.root, "plugin", "server")), false);
    assert.deepEqual(
      JSON.parse(readFileSync(join(fixture.root, "plugin", ".claude-plugin", "plugin.json"), "utf8")),
      MANIFEST,
    );
    assert.equal(readFileSync(join(fixture.root, "CHANGELOG.md"), "utf8"), CHANGELOG);
  } finally {
    fixture.cleanup();
  }
});

test("main refuses a malformed checksum file and writes nothing", () => {
  const fixture = makeFixture("garbage\n");
  try {
    const { code } = runMain(["--tag", "v1.0.1", "--from", fixture.download, "--root", fixture.root], fixture.root);
    assert.equal(code, 1);
    assert.equal(existsSync(join(fixture.root, "plugin", "server")), false);
  } finally {
    fixture.cleanup();
  }
});

test("main refuses an invalid tag, a missing --from, and a --from that is not a folder", () => {
  const fixture = makeFixture();
  try {
    const exe = join(fixture.download, "onenote-mcp.exe");
    for (const args of [
      ["--tag", "1.0.1", "--from", fixture.download],
      ["--tag", "v1.0.1"],
      ["--tag", "v1.0.1", "--from", join(fixture.download, "missing")],
      ["--tag", "v1.0.1", "--from", exe],
    ]) {
      const { code, errors } = runMain([...args, "--root", fixture.root], fixture.root);
      assert.notEqual(code, 0, args.join(" "));
      assert.ok(errors.length > 0, args.join(" "));
      assert.equal(existsSync(join(fixture.root, "plugin", "server")), false, args.join(" "));
    }
  } finally {
    fixture.cleanup();
  }
});

test("main resolves --from relative to --root, and --root to the current directory", () => {
  const fixture = makeFixture();
  try {
    const { code } = runMain(["--tag", "v1.0.1", "--from", "../download"], fixture.root);
    assert.equal(code, 0);
    assert.equal(readFileSync(join(fixture.root, "plugin", "server", "VERSION"), "utf8"), "v1.0.1\n");
  } finally {
    fixture.cleanup();
  }
});

test("the script vendors a release into a minimal repository", () => {
  const fixture = makeFixture();
  try {
    const result = spawnSync(
      process.execPath,
      ["--import", "tsx", SCRIPT, "--tag", "v1.0.1", "--from", fixture.download, "--root", fixture.root],
      { encoding: "utf8" },
    );
    assert.equal(result.status, 0, result.stderr);
    const server = join(fixture.root, "plugin", "server");
    assert.deepEqual(readFileSync(join(server, "onenote-mcp.exe")), EXE_BYTES);
    assert.equal(readFileSync(join(server, "onenote-mcp.exe.sha256"), "utf8"), `${EXE_SHA}  onenote-mcp.exe\n`);
    assert.equal(readFileSync(join(server, "VERSION"), "utf8"), "v1.0.1\n");
    assert.equal(
      readFileSync(join(fixture.root, "plugin", ".claude-plugin", "plugin.json"), "utf8"),
      `${JSON.stringify({ ...MANIFEST, version: "0.1.1" }, null, 2)}\n`,
    );
    const today = new Date().toISOString().slice(0, 10);
    assert.equal(
      readFileSync(join(fixture.root, "CHANGELOG.md"), "utf8"),
      `# Änderungen\n\n## 0.1.1 (${today})\n\n- Server aktualisiert auf v1.0.1.\n\n## 0.1.0 (2026-10-03)\n\nErste Version.\n`,
    );
  } finally {
    fixture.cleanup();
  }
});
