import { createHash } from "node:crypto";
import type { Finding, Mode, Repo, Rule } from "../repo.ts";
import { compareVersions, parseVersion, type Version } from "../version-bump.ts";

const RULE = "server";

const DIR = "plugin/server/";
const EXE = `${DIR}onenote-mcp.exe`;
const VERSION = `${DIR}VERSION`;
const SHA = `${DIR}onenote-mcp.exe.sha256`;

/** The three files of a vendored server. */
const SERVER_FILES = [EXE, VERSION, SHA];

const VERSION_LINE = /^v\d+\.\d+\.\d+(\r?\n)?$/;

/**
 * The format `sha256sum` writes and the server's release publishes. The `*` is the binary marker
 * `sha256sum` writes on Windows.
 */
const SHA_LINE = /^([0-9a-f]{64}) [ *]onenote-mcp\.exe(\r?\n)?$/;

const NOT_VENDORED = "server not vendored yet";

/** The last server release that reads an empty allowlist as every notebook; the plugin's empty `notebook` default needs a newer one. */
const LAST_FAIL_OPEN_RELEASE: Version = [1, 0, 1];

/** Lists the files under `plugin/server/`. */
function serverDirFiles(repo: Repo): string[] {
  return repo.listFiles().filter((file) => file.startsWith(DIR));
}

/**
 * Checks the vendored server: exactly the exe, `VERSION`, and a matching checksum, and in release mode a
 * version newer than the last one that fails open. A missing `plugin/server/` is expected during the build
 * and a finding only in release mode.
 */
export const server: Rule = {
  name: RULE,
  run(repo: Repo, mode: Mode): Finding[] {
    const files = serverDirFiles(repo);
    if (files.length === 0) {
      return mode === "release" ? [{ file: DIR, rule: RULE, message: "server not vendored" }] : [];
    }
    const problems = serverProblems(repo, files);
    if (mode === "release") problems.push(...failOpenProblems(repo, files));
    return problems.map(([file, message]) => ({ file, rule: RULE, message }));
  },
  notices(repo: Repo, mode: Mode): string[] {
    return mode === "build" && serverDirFiles(repo).length === 0 ? [NOT_VENDORED] : [];
  },
};

/** Lists `[file, message]` problems of a present `plugin/server/` holding `files`. */
function serverProblems(repo: Repo, files: string[]): [string, string][] {
  const problems: [string, string][] = [];
  for (const file of SERVER_FILES) {
    if (!files.includes(file)) problems.push([file, "missing from the vendored server"]);
  }
  for (const file of files) {
    if (!SERVER_FILES.includes(file)) problems.push([file, "not allowed in plugin/server/"]);
  }
  if (files.includes(VERSION) && !VERSION_LINE.test(repo.readText(VERSION))) {
    problems.push([VERSION, "VERSION must be one line like v1.2.3"]);
  }
  if (files.includes(SHA)) {
    const match = SHA_LINE.exec(repo.readText(SHA));
    if (match === null) problems.push([SHA, "must be one line: <64 lowercase hex>  onenote-mcp.exe (or *onenote-mcp.exe)"]);
    else if (files.includes(EXE) && match[1] !== sha256(repo.readBytes(EXE))) {
      problems.push([SHA, "checksum does not match onenote-mcp.exe"]);
    }
  }
  return problems;
}

/** Rejects a vendored server whose `VERSION` is not newer than the last release that fails open. */
function failOpenProblems(repo: Repo, files: string[]): [string, string][] {
  if (!files.includes(VERSION)) return [];
  const version = parseVersion(repo.readText(VERSION).trim().replace(/^v/, ""));
  if (version === undefined || compareVersions(version, LAST_FAIL_OPEN_RELEASE) > 0) return [];
  const last = `v${LAST_FAIL_OPEN_RELEASE.join(".")}`;
  return [[VERSION, `servers up to ${last} read an empty allowlist as every notebook; vendor a newer release`]];
}

/** The SHA-256 of `bytes` as lowercase hex. */
function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}
