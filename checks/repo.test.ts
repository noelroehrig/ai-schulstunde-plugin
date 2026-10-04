import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createFsRepo, createMemoryRepo, toRepoPath } from "./repo.ts";

test("toRepoPath turns a Windows path into a forward-slash path", () => {
  assert.equal(toRepoPath("plugin\\agents\\x.md", "\\"), "plugin/agents/x.md");
});

test("toRepoPath leaves a POSIX path unchanged", () => {
  assert.equal(toRepoPath("plugin/agents/x.md", "/"), "plugin/agents/x.md");
});

test("createMemoryRepo lists sorted files and reads text and bytes", () => {
  const repo = createMemoryRepo({ "b.md": "B", "a/c.json": "{}" });
  assert.deepEqual(repo.listFiles(), ["a/c.json", "b.md"]);
  assert.equal(repo.readText("b.md"), "B");
  assert.deepEqual([...repo.readBytes("b.md")], [66]);
});

test("createFsRepo walks the tree with forward slashes and skips tooling directories", () => {
  const root = mkdtempSync(join(tmpdir(), "repo-test-"));
  try {
    for (const dir of [".git", "node_modules/x", "plugin/agents"]) {
      mkdirSync(join(root, dir), { recursive: true });
    }
    writeFileSync(join(root, ".git", "HEAD"), "ref");
    writeFileSync(join(root, "node_modules", "x", "index.js"), "");
    writeFileSync(join(root, "plugin", "agents", "x.md"), "hello");
    writeFileSync(join(root, "README.md"), "readme");

    const repo = createFsRepo(root);
    assert.deepEqual(repo.listFiles(), ["plugin/agents/x.md", "README.md"].sort());
    assert.equal(repo.readText("plugin/agents/x.md"), "hello");
    assert.equal(repo.readBytes("README.md").length, 6);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
