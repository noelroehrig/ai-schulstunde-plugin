import { test } from "node:test";
import assert from "node:assert/strict";
import { createMemoryRepo } from "../repo.ts";
import { marketplace } from "./marketplace.ts";

const FILE = ".claude-plugin/marketplace.json";

/** A marketplace that satisfies the rule, with `top` merged into it and `entry` into its plugin entry. */
function marketplaceJson(top: Record<string, unknown> = {}, entry: Record<string, unknown> = {}): string {
  return JSON.stringify({
    name: "schulstunde",
    owner: { name: "Maintainer" },
    plugins: [{ name: "unterricht", source: "./plugin", description: "x", ...entry }],
    ...top,
  });
}

/** Runs the rule on a repository holding only the marketplace file. */
function check(content: string) {
  return marketplace.run(createMemoryRepo({ [FILE]: content }), "build");
}

/** Asserts exactly one marketplace finding whose message matches `pattern`. */
function assertOneFinding(content: string, pattern: RegExp): void {
  const findings = check(content);
  assert.equal(findings.length, 1, JSON.stringify(findings));
  assert.equal(findings[0].rule, "marketplace");
  assert.equal(findings[0].file, FILE);
  assert.match(findings[0].message, pattern);
}

test("marketplace passes on a valid marketplace", () => {
  assert.deepEqual(check(marketplaceJson()), []);
});

test("marketplace reports a missing marketplace file", () => {
  const findings = marketplace.run(createMemoryRepo({ "a.md": "" }), "build");
  assert.equal(findings.length, 1);
  assert.equal(findings[0].rule, "marketplace");
  assert.equal(findings[0].file, FILE);
});

test("marketplace leaves an unparseable file to json-valid", () => {
  assert.deepEqual(check("{"), []);
});

test("marketplace reports a wrong name", () => {
  assertOneFinding(marketplaceJson({ name: "other" }), /name/);
});

test("marketplace reports an empty owner name", () => {
  assertOneFinding(marketplaceJson({ owner: { name: " " } }), /owner\.name/);
});

test("marketplace reports a missing owner", () => {
  assertOneFinding(marketplaceJson({ owner: undefined }), /owner\.name/);
});

test("marketplace reports more than one plugin entry", () => {
  const two = JSON.parse(marketplaceJson());
  two.plugins.push({ ...two.plugins[0], name: "zweites" });
  assertOneFinding(JSON.stringify(two), /exactly one plugin/);
});

test("marketplace reports a wrong plugin name", () => {
  assertOneFinding(marketplaceJson({}, { name: "other" }), /unterricht/);
});

test("marketplace reports a wrong plugin source", () => {
  assertOneFinding(marketplaceJson({}, { source: "plugin" }), /\.\/plugin/);
});

test("marketplace reports a version on the plugin entry", () => {
  assertOneFinding(marketplaceJson({}, { version: "0.1.0" }), /version/);
});
