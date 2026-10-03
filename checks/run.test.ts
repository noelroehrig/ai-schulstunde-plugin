import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createMemoryRepo, type Rule } from "./repo.ts";
import { formatFinding, main, parseMode, runRules } from "./run.ts";

/** Runs `main` against a fresh temporary directory holding `files`. */
function runMain(args: string[], files: Record<string, string>): { code: number; lines: string[] } {
  const root = mkdtempSync(join(tmpdir(), "run-test-"));
  try {
    for (const [name, content] of Object.entries(files)) writeFileSync(join(root, name), content);
    const lines: string[] = [];
    const code = main(args, root, (line) => lines.push(line));
    return { code, lines };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("parseMode accepts build and release", () => {
  assert.equal(parseMode(["--mode", "build"]), "build");
  assert.equal(parseMode(["--mode", "release"]), "release");
});

test("parseMode rejects a missing or unknown mode", () => {
  assert.equal(parseMode([]), undefined);
  assert.equal(parseMode(["--mode"]), undefined);
  assert.equal(parseMode(["--mode", "debug"]), undefined);
});

test("runRules passes the mode to every rule and collects findings", () => {
  const seen: string[] = [];
  const rule: Rule = {
    name: "probe",
    run: (repo, mode) => {
      seen.push(mode);
      return repo.listFiles().map((file) => ({ file, rule: "probe", message: "seen" }));
    },
  };
  const findings = runRules(createMemoryRepo({ "a.md": "" }), "release", [rule, rule]);
  assert.deepEqual(seen, ["release", "release"]);
  assert.equal(findings.length, 2);
});

test("formatFinding prints file, rule, and message", () => {
  assert.equal(formatFinding({ file: "a.md", rule: "r", message: "m" }), "a.md: r: m");
});

test("main exits 0 with a zero count on a clean repository", () => {
  const { code, lines } = runMain(["--mode", "build"], { "a.json": "{}" });
  assert.equal(code, 0);
  assert.match(lines.at(-1) ?? "", /^0 findings/);
});

test("main exits 1 and prints each finding and the count", () => {
  const { code, lines } = runMain(["--mode", "release"], { "a.json": "{", "b.md": "x \u2014 y" });
  assert.equal(code, 1);
  assert.ok(lines.some((line) => line.startsWith("a.json: json-valid: ")));
  assert.ok(lines.some((line) => line.startsWith("b.md: no-dashes: line 1")));
  assert.match(lines.at(-1) ?? "", /^2 findings/);
});

test("main exits 2 on a missing or unknown mode", () => {
  assert.equal(runMain([], {}).code, 2);
  assert.equal(runMain(["--mode", "debug"], {}).code, 2);
});

test("the CLI exits with the code main returns", () => {
  const script = fileURLToPath(new URL("./run.ts", import.meta.url));
  const tsx = import.meta.resolve("tsx");
  const result = spawnSync(process.execPath, ["--import", tsx, script, "--mode", "bogus"], {
    encoding: "utf8",
  });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /--mode/);
});
