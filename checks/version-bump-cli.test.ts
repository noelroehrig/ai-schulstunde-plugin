import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { main, parseBase, type Git } from "./version-bump-cli.ts";

/** A fake git that answers `diff` and `show` from fixed text and records every call. */
function fakeGit(diff: string, baseManifest: string): { git: Git; calls: string[][] } {
  const calls: string[][] = [];
  const git: Git = (args) => {
    calls.push(args);
    if (args.includes("diff")) return diff;
    if (args[0] === "show") return baseManifest;
    throw new Error(`unexpected git call: ${args.join(" ")}`);
  };
  return { git, calls };
}

/** Runs `main` in a temporary repository whose working tree has `headVersion`. */
function runMain(
  args: string[],
  headVersion: string,
  git: Git,
): { code: number; lines: string[]; errors: string[] } {
  const root = mkdtempSync(join(tmpdir(), "version-bump-"));
  try {
    mkdirSync(join(root, "plugin", ".claude-plugin"), { recursive: true });
    writeFileSync(
      join(root, "plugin", ".claude-plugin", "plugin.json"),
      JSON.stringify({ name: "unterricht", version: headVersion }),
    );
    const lines: string[] = [];
    const errors: string[] = [];
    const code = main(args, root, git, (line) => lines.push(line), (line) => errors.push(line));
    return { code, lines, errors };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

const BASE_MANIFEST = JSON.stringify({ name: "unterricht", version: "0.1.0" });

test("parseBase reads --base and rejects a missing value", () => {
  assert.equal(parseBase(["--base", "origin/main"]), "origin/main");
  assert.equal(parseBase([]), undefined);
  assert.equal(parseBase(["--base"]), undefined);
});

test("main passes the ref to git as separate arguments, with plain paths and no rename detection", () => {
  const { git, calls } = fakeGit("README.md\n", BASE_MANIFEST);
  runMain(["--base", "origin/main"], "0.1.0", git);
  assert.deepEqual(calls, [
    ["-c", "core.quotepath=false", "diff", "--name-only", "--no-renames", "origin/main...HEAD"],
    ["show", "origin/main:plugin/.claude-plugin/plugin.json"],
  ]);
});

test("main exits 0 when nothing under plugin/ changed", () => {
  const { git } = fakeGit("README.md\nchecks/run.ts\n", BASE_MANIFEST);
  const { code, lines } = runMain(["--base", "origin/main"], "0.1.0", git);
  assert.equal(code, 0);
  assert.deepEqual(lines, ["0 findings (version bump)"]);
});

test("main exits 0 on a plugin change with a bump and a changelog change (CRLF output)", () => {
  const { git } = fakeGit("CHANGELOG.md\r\nplugin/agents/a.md\r\n", BASE_MANIFEST);
  const { code, lines } = runMain(["--base", "origin/main"], "0.2.0", git);
  assert.equal(code, 0, JSON.stringify(lines));
});

test("main prints findings like the check runner and exits 1", () => {
  const { git } = fakeGit("plugin/agents/a.md\n", BASE_MANIFEST);
  const { code, lines } = runMain(["--base", "origin/main"], "0.1.0", git);
  assert.equal(code, 1);
  assert.deepEqual(lines, [
    "plugin/.claude-plugin/plugin.json: version-bump: plugin/ changed but version 0.1.0 is not greater than 0.1.0",
    "CHANGELOG.md: version-bump: plugin/ changed but CHANGELOG.md did not",
    "2 findings (version bump)",
  ]);
});

test("main exits 2 without calling git on a missing or unsafe ref", () => {
  for (const args of [[], ["--base"], ["--base", "-p"], ["--base", "main..HEAD"], ["--base", "a;b"]]) {
    const { git, calls } = fakeGit("", BASE_MANIFEST);
    const { code, errors } = runMain(args, "0.1.0", git);
    assert.equal(code, 2, JSON.stringify(args));
    assert.equal(calls.length, 0);
    assert.ok(errors.length > 0);
  }
});

test("main exits 2 when git fails", () => {
  const git: Git = () => {
    throw new Error("fatal: bad revision");
  };
  const { code, errors } = runMain(["--base", "origin/main"], "0.1.0", git);
  assert.equal(code, 2);
  assert.match(errors.join("\n"), /bad revision/);
});

test("main exits 2 when a manifest has no string version", () => {
  const { git } = fakeGit("plugin/agents/a.md\n", JSON.stringify({ name: "unterricht" }));
  const { code, errors } = runMain(["--base", "origin/main"], "0.1.0", git);
  assert.equal(code, 2);
  assert.match(errors.join("\n"), /version/);
});

test("the CLI exits with the code main returns", () => {
  const script = fileURLToPath(new URL("./version-bump-cli.ts", import.meta.url));
  const tsx = import.meta.resolve("tsx");
  const result = spawnSync(process.execPath, ["--import", tsx, script, "--base", "-x"], {
    encoding: "utf8",
  });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /--base/);
});
