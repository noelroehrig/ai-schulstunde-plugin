import { test } from "node:test";
import assert from "node:assert/strict";
import { createMemoryRepo } from "../repo.ts";
import { manifest, userConfigRefs } from "./manifest.ts";

const FILE = "plugin/.claude-plugin/plugin.json";

/** A string option that satisfies the rule, with `changes` merged in. */
function stringOption(changes: Record<string, unknown> = {}): Record<string, unknown> {
  return { type: "string", title: "Titel", description: "Beschreibung", default: "Wert", ...changes };
}

/** A manifest that satisfies the rule, with `changes` merged in. */
function manifestJson(changes: Record<string, unknown> = {}): string {
  return JSON.stringify({
    name: "unterricht",
    version: "0.1.0",
    description: "Beschreibung",
    author: { name: "Maintainer" },
    userConfig: {
      notebook: stringOption(),
      plan_checkpoint: { type: "boolean", title: "T", description: "D", default: true },
    },
    ...changes,
  });
}

/** Runs the manifest rule on a repository holding only the manifest. */
function check(content: string) {
  return manifest.run(createMemoryRepo({ [FILE]: content }), "build");
}

/** Asserts exactly one manifest finding whose message matches `pattern`. */
function assertOneFinding(content: string, pattern: RegExp): void {
  const findings = check(content);
  assert.equal(findings.length, 1, JSON.stringify(findings));
  assert.equal(findings[0].rule, "manifest");
  assert.equal(findings[0].file, FILE);
  assert.match(findings[0].message, pattern);
}

test("manifest passes on a valid manifest", () => {
  assert.deepEqual(check(manifestJson()), []);
});

test("manifest reports a missing manifest", () => {
  const findings = manifest.run(createMemoryRepo({ "plugin/.mcp.json": "{}" }), "build");
  assert.equal(findings.length, 1);
  assert.equal(findings[0].rule, "manifest");
  assert.equal(findings[0].file, FILE);
});

test("manifest reports a wrong name", () => {
  assertOneFinding(manifestJson({ name: "lesson" }), /name/);
});

test("manifest reports a version that is not x.y.z", () => {
  assertOneFinding(manifestJson({ version: "0.1" }), /version/);
  assertOneFinding(manifestJson({ version: "v0.1.0" }), /version/);
});

test("manifest reports an empty description", () => {
  assertOneFinding(manifestJson({ description: "" }), /description/);
});

test("manifest reports a missing author name", () => {
  assertOneFinding(manifestJson({ author: {} }), /author\.name/);
});

test("manifest reports an option without a default", () => {
  const option = stringOption({ default: undefined });
  assertOneFinding(manifestJson({ userConfig: { notebook: option } }), /notebook.*default/);
});

test("manifest reports an option without a title", () => {
  const option = stringOption({ title: undefined });
  assertOneFinding(manifestJson({ userConfig: { notebook: option } }), /notebook.*title/);
});

test("manifest reports an unknown option key", () => {
  const option = stringOption({ placeholder: "x" });
  assertOneFinding(manifestJson({ userConfig: { notebook: option } }), /notebook.*placeholder/);
});

test("manifest accepts every optional option key", () => {
  const option = stringOption({ required: false, options: ["Wert", "Anderer"], multiple: false, sensitive: false });
  const number = { type: "number", title: "T", description: "D", default: 3, min: 1, max: 5 };
  assert.deepEqual(check(manifestJson({ userConfig: { notebook: option, rounds: number } })), []);
});

test("manifest reports options that are empty or not a list", () => {
  assertOneFinding(manifestJson({ userConfig: { model: stringOption({ options: [] }) } }), /model.*non-empty list/);
  assertOneFinding(manifestJson({ userConfig: { model: stringOption({ options: "Wert" }) } }), /model.*non-empty list/);
});

test("manifest reports a default that is not one of options", () => {
  const option = stringOption({ options: ["Opus", "Sonnet"], default: "Haiku" });
  assertOneFinding(manifestJson({ userConfig: { model: option } }), /model.*default must be one of options/);
});

test("manifest reports an options entry that is not a label of 1 to 64 characters", () => {
  const empty = stringOption({ options: ["Wert", ""] });
  assertOneFinding(manifestJson({ userConfig: { model: empty } }), /model.*label of 1 to 64/);
  const long = stringOption({ options: ["Wert", "x".repeat(65)] });
  assertOneFinding(manifestJson({ userConfig: { model: long } }), /model.*label of 1 to 64/);
});

test("manifest reports an options entry with surrounding spaces", () => {
  assertOneFinding(manifestJson({ userConfig: { model: stringOption({ options: ["Wert", " Opus"] }) } }), /model.*surrounding spaces/);
  assertOneFinding(manifestJson({ userConfig: { model: stringOption({ options: ["Wert", "Opus "] }) } }), /model.*surrounding spaces/);
  assertOneFinding(manifestJson({ userConfig: { model: stringOption({ options: ["Wert", "  "] }) } }), /model.*surrounding spaces/);
});

test("manifest reports a repeated options entry, also in another letter case", () => {
  assertOneFinding(manifestJson({ userConfig: { model: stringOption({ options: ["Wert", "Wert"] }) } }), /model.*repeat/);
  assertOneFinding(manifestJson({ userConfig: { model: stringOption({ options: ["Wert", "wert"] }) } }), /model.*repeat/);
});

test("manifest reports options on an option that is not a plain string", () => {
  const multiple = stringOption({ options: ["Wert"], multiple: true });
  assertOneFinding(manifestJson({ userConfig: { model: multiple } }), /model.*neither multiple nor sensitive/);
  const sensitive = stringOption({ options: ["Wert"], sensitive: true });
  assertOneFinding(manifestJson({ userConfig: { model: sensitive } }), /model.*neither multiple nor sensitive/);
  const flag = { type: "boolean", title: "T", description: "D", default: true, options: [true] };
  const findings = check(manifestJson({ userConfig: { flag } }));
  const shown = JSON.stringify(findings);
  assert.ok(findings.every((finding) => finding.rule === "manifest" && finding.file === FILE), shown);
  assert.ok(findings.some((finding) => /flag.*neither multiple nor sensitive/.test(finding.message)), shown);
});

test("manifest reports a default whose type does not match", () => {
  const flag = { type: "boolean", title: "T", description: "D", default: "true" };
  assertOneFinding(manifestJson({ userConfig: { flag } }), /flag.*default/);
  assertOneFinding(manifestJson({ userConfig: { notebook: stringOption({ default: 1 }) } }), /notebook.*default/);
});

test("manifest reports an unknown option type", () => {
  assertOneFinding(manifestJson({ userConfig: { notebook: stringOption({ type: "text" }) } }), /notebook.*type/);
});

test("manifest reports an option key with characters outside letters, digits, underscores", () => {
  assertOneFinding(manifestJson({ userConfig: { "plan-checkpoint": stringOption() } }), /plan-checkpoint/);
});

/** A repository with the valid manifest plus `files`. */
function repoWith(files: Record<string, string>) {
  return createMemoryRepo({ [FILE]: manifestJson(), ...files });
}

test("user-config-refs passes when every reference is declared", () => {
  const repo = repoWith({
    "plugin/.mcp.json": '{ "x": "${user_config.notebook}" }',
    "plugin/skills/a/SKILL.md": "Checkpoint: ${user_config.plan_checkpoint}\r\n",
    "README.md": "${user_config.outside_plugin_is_ignored}",
  });
  assert.deepEqual(userConfigRefs.run(repo, "build"), []);
});

test("user-config-refs reports an undeclared key with file and key", () => {
  const repo = repoWith({ "plugin/agents/a.md": "Use ${user_config.notebok} here.\n" });
  const findings = userConfigRefs.run(repo, "build");
  assert.equal(findings.length, 1);
  assert.equal(findings[0].rule, "user-config-refs");
  assert.equal(findings[0].file, "plugin/agents/a.md");
  assert.match(findings[0].message, /notebok/);
});

test("user-config-refs treats every key as undeclared without a readable manifest", () => {
  const repo = createMemoryRepo({ "plugin/.mcp.json": '{ "x": "${user_config.notebook}" }' });
  const findings = userConfigRefs.run(repo, "build");
  assert.equal(findings.length, 1, JSON.stringify(findings));
  assert.equal(findings[0].rule, "user-config-refs");
  assert.equal(findings[0].file, "plugin/.mcp.json");
  assert.match(findings[0].message, /notebook/);
});
