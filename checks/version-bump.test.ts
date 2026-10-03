import { test } from "node:test";
import assert from "node:assert/strict";
import { checkVersionBump, compareVersions, isValidRef, parseVersion } from "./version-bump.ts";

test("parseVersion reads X.Y.Z and rejects anything else", () => {
  assert.deepEqual(parseVersion("1.20.3"), [1, 20, 3]);
  assert.equal(parseVersion("1.2"), undefined);
  assert.equal(parseVersion("1.2.3-beta"), undefined);
  assert.equal(parseVersion("v1.2.3"), undefined);
});

test("compareVersions compares numerically, not as text", () => {
  assert.ok(compareVersions([0, 10, 0], [0, 9, 0]) > 0);
  assert.ok(compareVersions([1, 0, 0], [0, 99, 99]) > 0);
  assert.ok(compareVersions([0, 1, 2], [0, 1, 10]) < 0);
  assert.equal(compareVersions([1, 2, 3], [1, 2, 3]), 0);
});

test("no finding when no changed file is under plugin/", () => {
  const findings = checkVersionBump({
    changedFiles: ["README.md", "checks/run.ts", "plugin.json"],
    baseVersion: "0.1.0",
    headVersion: "0.1.0",
    changelogChanged: false,
  });
  assert.deepEqual(findings, []);
});

test("no finding when a plugin change has a higher version and a changelog change", () => {
  const findings = checkVersionBump({
    changedFiles: ["plugin/skills/x/SKILL.md", "CHANGELOG.md"],
    baseVersion: "0.9.0",
    headVersion: "0.10.0",
    changelogChanged: true,
  });
  assert.deepEqual(findings, []);
});

test("a plugin change without a higher version is a finding", () => {
  for (const headVersion of ["0.1.0", "0.0.9"]) {
    const findings = checkVersionBump({
      changedFiles: ["plugin/agents/a.md"],
      baseVersion: "0.1.0",
      headVersion,
      changelogChanged: true,
    });
    assert.equal(findings.length, 1);
    assert.equal(findings[0]?.file, "plugin/.claude-plugin/plugin.json");
    assert.equal(findings[0]?.rule, "version-bump");
    assert.match(findings[0]?.message ?? "", /not greater/);
  }
});

test("a plugin change without a changelog change is a finding", () => {
  const findings = checkVersionBump({
    changedFiles: ["plugin/agents/a.md"],
    baseVersion: "0.1.0",
    headVersion: "0.1.1",
    changelogChanged: false,
  });
  assert.equal(findings.length, 1);
  assert.equal(findings[0]?.file, "CHANGELOG.md");
});

test("both findings are reported together", () => {
  const findings = checkVersionBump({
    changedFiles: ["plugin/agents/a.md"],
    baseVersion: "0.1.0",
    headVersion: "0.1.0",
    changelogChanged: false,
  });
  assert.equal(findings.length, 2);
});

test("an unreadable version is a finding, not a pass", () => {
  const findings = checkVersionBump({
    changedFiles: ["plugin/agents/a.md"],
    baseVersion: "0.1.0",
    headVersion: "1.0",
    changelogChanged: true,
  });
  assert.equal(findings.length, 1);
  assert.match(findings[0]?.message ?? "", /1\.0/);
});

test("isValidRef accepts branch and remote refs", () => {
  assert.ok(isValidRef("origin/main"));
  assert.ok(isValidRef("feature/x_1.2-y"));
  assert.ok(isValidRef("adaefc6"));
});

test("isValidRef rejects options, ranges, and unexpected characters", () => {
  for (const ref of ["", "-x", "--output=/tmp/x", "main..HEAD", "a/../b", "main...HEAD", "a b", "a;b", "HEAD~1", "@{u}", "$(x)"]) {
    assert.equal(isValidRef(ref), false, ref);
  }
});
