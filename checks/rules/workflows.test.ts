import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { createFsRepo, createMemoryRepo } from "../repo.ts";
import { workflows } from "./workflows.ts";

const SHA = "3d3c42e5aac5ba805825da76410c181273ba90b1";
const FILE = ".github/workflows/ci.yml";

/** A workflow that satisfies the rule, with `job` as the body of its only job. */
function workflow(job: string[], top: string[] = []): string {
  return [
    "name: CI",
    "on: [push]",
    ...top,
    "jobs:",
    "  verify:",
    "    runs-on: ubuntu-latest",
    ...job,
    "",
  ].join("\n");
}

const GOOD_JOB = [
  "    permissions:",
  "      contents: read",
  "    steps:",
  `      - uses: actions/checkout@${SHA} # v7.0.1`,
  "        with:",
  "          persist-credentials: false",
  "      - name: Verify",
  "        env:",
  "          REF: ${{ github.ref }}",
  "        run: |",
  '          echo "$REF"',
  "          npm run verify",
  "      - run: npm ci",
];

/** Runs the rule on a repository holding `content` at `.github/workflows/ci.yml`. */
function check(content: string, file: string = FILE): string[] {
  return workflows.run(createMemoryRepo({ [file]: content, "README.md": "${{ x }}" }), "build").map((f) => {
    assert.equal(f.rule, "workflows");
    assert.equal(f.file, file);
    return f.message;
  });
}

test("workflows passes a pinned workflow with job permissions and expressions only in env", () => {
  assert.deepEqual(check(workflow(GOOD_JOB)), []);
});

test("workflows ignores files outside .github/workflows/", () => {
  const repo = createMemoryRepo({ "docs/ci.yml": "jobs:\n  a:\n    steps:\n      - uses: x@v1\n" });
  assert.deepEqual(workflows.run(repo, "build"), []);
});

test("workflows checks .yaml files and CRLF line endings", () => {
  const content = workflow(GOOD_JOB).replace(`@${SHA}`, "@v7").replace(/\n/g, "\r\n");
  assert.equal(check(content, ".github/workflows/x.yaml").length, 1);
});

test("workflows reports a uses pinned to a tag", () => {
  const messages = check(workflow(GOOD_JOB.map((l) => l.replace(`@${SHA}`, "@v7.0.1"))));
  assert.equal(messages.length, 1);
  assert.match(messages[0], /line 9: .*40-character/);
});

test("workflows reports an uppercase or short SHA", () => {
  assert.equal(check(workflow(GOOD_JOB.map((l) => l.replace(SHA, SHA.toUpperCase())))).length, 1);
  assert.equal(check(workflow(GOOD_JOB.map((l) => l.replace(SHA, SHA.slice(1))))).length, 1);
});

test("workflows reports a pinned uses without a version comment", () => {
  assert.equal(check(workflow(GOOD_JOB.map((l) => l.replace(" # v7.0.1", "")))).length, 1);
  assert.equal(check(workflow(GOOD_JOB.map((l) => l.replace(" # v7.0.1", " # release")))).length, 1);
});

test("workflows reports a quoted uses value", () => {
  assert.equal(check(workflow(GOOD_JOB.map((l) => l.replace(`actions/checkout@${SHA}`, `"actions/checkout@${SHA}"`)))).length, 1);
});

test("workflows checks uses as a step key and as a job key", () => {
  const job = ["    permissions: {}", "    steps:", "      - name: x", `        uses: a/b@${SHA} # v1`];
  assert.deepEqual(check(workflow(job)), []);
  assert.equal(check(workflow(["    permissions: {}", "    uses: a/b@main"])).length, 1);
});

test("workflows reports an expression in a single-line run", () => {
  const messages = check(workflow([...GOOD_JOB, "      - run: echo ${{ inputs.tag }}"]));
  assert.equal(messages.length, 1);
  assert.match(messages[0], /line 19: .*run/);
});

test("workflows reports an expression inside a run block", () => {
  const job = GOOD_JOB.map((l) => (l === "          npm run verify" ? "          git checkout ${{ github.head_ref }}" : l));
  const messages = check(workflow(job));
  assert.equal(messages.length, 1);
  assert.match(messages[0], /line 17: /);
});

test("workflows ends a run block at the next key and across blank lines keeps it open", () => {
  const job = [
    "    permissions: {}",
    "    steps:",
    "      - run: >-",
    "          echo a",
    "",
    "          echo ${{ x }}",
    "        env:",
    "          X: ${{ x }}",
    "      - if: ${{ always() }}",
    "        run: echo b",
  ];
  const messages = check(workflow(job));
  assert.equal(messages.length, 1);
  assert.match(messages[0], /line 11: /);
});

test("workflows accepts permissions at the workflow level", () => {
  const job = GOOD_JOB.filter((l) => !l.includes("permissions:") && !l.includes("contents: read"));
  assert.deepEqual(check(workflow(job, ["permissions:", "  contents: read"])), []);
});

test("workflows reports each job without permissions", () => {
  const content = [
    "on: push",
    "jobs:",
    "  a:",
    "    runs-on: x",
    "    permissions:",
    "      contents: read",
    "  b:",
    "    runs-on: x",
    "    steps:",
    "      - with:",
    "          permissions: write",
    "  # c is a comment, not a job",
    "  d:",
    "    runs-on: x",
    "",
  ].join("\n");
  const messages = check(content);
  assert.equal(messages.length, 2);
  assert.match(messages[0], /job "b"/);
  assert.match(messages[1], /job "d"/);
});

test("workflows reports a workflow without jobs", () => {
  assert.equal(check("on: push\n").length, 1);
});

/** The repository's workflows, read from the working tree. */
const REPO = createFsRepo(fileURLToPath(new URL("../../", import.meta.url)));

/** Reads a repository file with LF line endings, as Windows checkouts may convert them. */
function read(file: string): string {
  return REPO.readText(file).replace(/\r\n/g, "\n");
}

const CHECKOUT = "uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1";
const SETUP_NODE = "uses: actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7.0.0";
const CLAUDE_CODE = "run: npm install -g @anthropic-ai/claude-code@2.1.288";

/** Splits a workflow into its jobs, keyed by name. */
function jobs(content: string): Record<string, string> {
  const body = content.split(/^jobs:\r?\n/m)[1] ?? "";
  const result: Record<string, string> = {};
  for (const part of body.split(/^(?=  [a-z-]+:)/m)) result[part.trim().split(":")[0]] = part;
  return result;
}

/** Asserts that `job` holds `lines` (trimmed) in this order. */
function assertOrder(job: string, lines: string[]): void {
  const trimmed = job.split(/\r?\n/).map((line) => line.trim().replace(/^- /, ""));
  let from = 0;
  for (const line of lines) {
    const at = trimmed.indexOf(line, from);
    assert.ok(at !== -1, `missing or out of order: ${line}`);
    from = at + 1;
  }
}

test("the repository's workflows pass the rule", () => {
  const files = REPO.listFiles().filter((f) => f.startsWith(".github/workflows/"));
  assert.deepEqual(files, [".github/workflows/ci.yml", ".github/workflows/update-server.yml"]);
  assert.deepEqual(workflows.run(REPO, "build"), []);
});

test("the workflows use only checkout and setup-node at the pinned SHAs, with Node 22", () => {
  for (const file of [".github/workflows/ci.yml", ".github/workflows/update-server.yml"]) {
    const content = read(file);
    for (const line of content.split(/\r?\n/).filter((l) => /^\s*(- )?uses:/.test(l))) {
      assert.ok([CHECKOUT, SETUP_NODE].includes(line.trim().replace(/^- /, "")), `${file}: ${line}`);
    }
    assert.equal(content.match(/node-version: 22$/gm)?.length, content.match(/setup-node@/g)?.length);
  }
});

test("ci.yml runs verify always, verify:release on main pushes, and the version check on PRs", () => {
  const content = read(".github/workflows/ci.yml");
  assert.match(content, /^on: \[push, pull_request\]$/m);
  const ci = jobs(content);
  assert.deepEqual(Object.keys(ci), ["verify", "release", "version-bump"]);
  const setup = [CHECKOUT, "persist-credentials: false", SETUP_NODE, "run: npm ci", CLAUDE_CODE];
  for (const job of Object.values(ci)) {
    assertOrder(job, ["permissions:", "contents: read", "steps:"]);
    assert.doesNotMatch(job, /: write/);
  }
  assert.doesNotMatch(ci.verify, /^\s+if:/m);
  assertOrder(ci.verify, [...setup, "run: npm run verify"]);
  assertOrder(ci.release, ["if: github.event_name == 'push' && github.ref == 'refs/heads/main'"]);
  assertOrder(ci.release, [...setup, "run: npm run verify:release"]);
  assertOrder(ci["version-bump"], ["if: github.event_name == 'pull_request'"]);
  assertOrder(ci["version-bump"], [
    CHECKOUT,
    "persist-credentials: false",
    "fetch-depth: 0",
    SETUP_NODE,
    "run: npm ci",
    CLAUDE_CODE,
    "env:",
    "BASE_REF: ${{ github.base_ref }}",
    'run: npm run check:version -- --base "origin/$BASE_REF"',
  ]);
});

test("update-server.yml vendors a validated tag on Windows and opens a pull request", () => {
  const content = read(".github/workflows/update-server.yml");
  assertOrder(content, ["on:", "workflow_dispatch:", "inputs:", "tag:", "required: true", "type: string", "jobs:"]);
  assert.doesNotMatch(content, /^\s+(push|pull_request|schedule):/m);
  const job = Object.values(jobs(content));
  assert.equal(job.length, 1);
  const update = job[0];
  assertOrder(update, ["runs-on: windows-latest", "permissions:", "contents: write", "pull-requests: write"]);
  const lines = update.split(/\r?\n/);
  const steps = update.split(/^(?=      - )/m).slice(1);
  for (const step of steps.filter((s) => /^\s+(- )?run:/m.test(s))) assert.match(step, /^\s+(- )?shell: bash$/m);
  const firstRun = steps.findIndex((s) => /^\s+(- )?run:/m.test(s));
  assert.match(steps[firstRun], /\^v\[0-9\]\+\\\.\[0-9\]\+\\\.\[0-9\]\+\$/);
  assert.ok(steps.slice(0, firstRun).every((s) => !s.includes("TAG")));
  for (const step of steps.filter((s) => /\$TAG/.test(s))) assert.match(step, /TAG: \$\{\{ inputs\.tag \}\}/);
  for (const step of steps.filter((s) => /\bgh /.test(s))) assert.match(step, /GH_TOKEN: \$\{\{ github\.token \}\}/);
  assert.ok(lines.some((l) => l.trim() === "persist-credentials: false"));
  assert.doesNotMatch(update, /git config/);
  assertOrder(update, [
    CHECKOUT,
    "persist-credentials: false",
    SETUP_NODE,
    "run: npm ci",
    CLAUDE_CODE,
    'run: gh release download "$TAG" --repo noelroehrig/onenote-mcp --pattern onenote-mcp.exe --pattern onenote-mcp.exe.sha256 --dir "$RUNNER_TEMP/server"',
    'run: npx tsx scripts/vendor-server.ts --tag "$TAG" --from "$RUNNER_TEMP/server"',
    "run: npx tsx scripts/tool-contract.ts --exe plugin/server/onenote-mcp.exe",
    "run: npm run verify:release",
  ]);
  assert.match(update, /git switch -c "\$branch"/);
  assert.match(update, /branch="server\/\$TAG"/);
  assert.match(
    update,
    /git -c user\.name="github-actions\[bot\]" -c user\.email="41898282\+github-actions\[bot\]@users\.noreply\.github\.com" commit/,
  );
  assertOrder(update, ["gh auth setup-git", 'git push origin "$branch"']);
  assert.match(update, /gh pr create .*--title "Server \$TAG" --body "[^"]*Server[^"]*"/);
});
