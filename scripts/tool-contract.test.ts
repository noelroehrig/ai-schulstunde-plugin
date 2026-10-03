import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { evaluateContract, listTools, main, type ListTools } from "./tool-contract.ts";

const FAKE_SERVER = fileURLToPath(new URL("./fixtures/fake-mcp-server.ts", import.meta.url));

const REQUIRED = ["ping", "get_notebooks", "list_pages", "get_page", "create_page", "replace_page"];

/** Starts the fake server through the real `listTools` with the given fake settings. */
function listFake(settings: Record<string, string>, timeoutMs = 10_000): Promise<string[]> {
  return listTools(process.execPath, ["--import", "tsx", FAKE_SERVER], { ...process.env, ...settings }, timeoutMs);
}

/** True while a process with `pid` exists. */
function isRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/** Runs `fn` with a temporary file path for the fake server's PID, then checks the fake is gone. */
async function withPidFile(fn: (pidFile: string) => Promise<void>): Promise<void> {
  const dir = mkdtempSync(join(tmpdir(), "tool-contract-"));
  const pidFile = join(dir, "pid");
  try {
    await fn(pidFile);
    const pid = Number(readFileSync(pidFile, "utf8"));
    assert.equal(isRunning(pid), false, "the server process is still running");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("evaluateContract passes the six required tools and tolerates others", () => {
  assert.deepEqual(evaluateContract([...REQUIRED, "list_sections"]), []);
});

test("evaluateContract reports each missing required tool", () => {
  const findings = evaluateContract(REQUIRED.filter((name) => name !== "get_page" && name !== "ping"));
  assert.equal(findings.length, 2);
  assert.match(findings.map((f) => f.message).join("\n"), /ping/);
  assert.match(findings.map((f) => f.message).join("\n"), /get_page/);
  assert.ok(findings.every((f) => f.rule === "tool-contract"));
});

test("evaluateContract reports each forbidden raw-XML tool", () => {
  const forbidden = ["list_hierarchy_xml", "get_page_xml", "replace_page_xml", "append_page_xml"];
  const findings = evaluateContract([...REQUIRED, ...forbidden]);
  assert.equal(findings.length, 4);
  for (const name of forbidden) assert.ok(findings.some((f) => f.message.includes(name)), name);
});

test("listTools returns the tool names after the full handshake and stops the server", async () => {
  await withPidFile(async (pidFile) => {
    const tools = await listFake({ FAKE_MCP_TOOLS: REQUIRED.join(","), FAKE_MCP_PID_FILE: pidFile });
    assert.deepEqual(tools, REQUIRED);
  });
});

test("listTools follows nextCursor across pages", async () => {
  const names = [...REQUIRED, "list_sections", "get_page_xml"];
  assert.deepEqual(await listFake({ FAKE_MCP_TOOLS: names.join(","), FAKE_MCP_PAGE_SIZE: "3" }), names);
});

test("a server with a forbidden tool fails the contract", async () => {
  const tools = await listFake({ FAKE_MCP_TOOLS: [...REQUIRED, "replace_page_xml"].join(",") });
  assert.deepEqual(
    evaluateContract(tools).map((f) => f.message),
    ["forbidden tool replace_page_xml is listed"],
  );
});

test("a server missing a tool fails the contract", async () => {
  const tools = await listFake({ FAKE_MCP_TOOLS: REQUIRED.slice(1).join(",") });
  assert.deepEqual(evaluateContract(tools).map((f) => f.message), ["required tool ping is missing"]);
});

test("listTools fails on a timeout and stops the server", async () => {
  await withPidFile(async (pidFile) => {
    await assert.rejects(
      listFake({ FAKE_MCP_MODE: "silent", FAKE_MCP_PID_FILE: pidFile }, 2000),
      /timed out after 2000 ms/,
    );
  });
});

test("listTools fails when the server exits early", async () => {
  await assert.rejects(listFake({ FAKE_MCP_MODE: "exit" }), /exited.*code 3/);
});

test("listTools fails on an error response", async () => {
  await assert.rejects(listFake({ FAKE_MCP_MODE: "error", FAKE_MCP_TOOLS: "ping" }), /tools\/list.*tools unavailable/);
});

test("listTools fails when the command cannot start", async () => {
  await assert.rejects(listTools(join(tmpdir(), "no-such-server.exe"), [], {}, 5000), /could not start/);
});

/** Runs the CLI `main` with `list` and collects its output. */
async function runMain(
  args: string[],
  cwd: string,
  list: ListTools,
): Promise<{ code: number; lines: string[]; errors: string[] }> {
  const lines: string[] = [];
  const errors: string[] = [];
  const code = await main(args, cwd, list, (line) => lines.push(line), (line) => errors.push(line), {});
  return { code, lines, errors };
}

/** A temporary folder holding a file that stands in for the exe. */
function withExe(fn: (dir: string, exe: string) => Promise<void>): Promise<void> {
  const dir = mkdtempSync(join(tmpdir(), "tool-contract-"));
  const exe = join(dir, "onenote-mcp.exe");
  writeFileSync(exe, "");
  return fn(dir, exe).finally(() => rmSync(dir, { recursive: true, force: true }));
}

/** A `ListTools` that starts the fake server with `tools` instead of the exe and records the call. */
function fakeList(tools: string[], calls: { command: string; env: NodeJS.ProcessEnv }[]): ListTools {
  return (command, _args, env, timeoutMs) => {
    calls.push({ command, env });
    return listTools(
      process.execPath,
      ["--import", "tsx", FAKE_SERVER],
      { ...process.env, ...env, FAKE_MCP_TOOLS: tools.join(",") },
      timeoutMs,
    );
  };
}

test("the CLI starts the exe with ONENOTE_DISABLE_RAW_XML=1 and passes a complete contract", async () => {
  await withExe(async (dir, exe) => {
    const calls: { command: string; env: NodeJS.ProcessEnv }[] = [];
    const { code, lines } = await runMain(["--exe", "onenote-mcp.exe"], dir, fakeList(REQUIRED, calls));
    assert.equal(code, 0);
    assert.equal(calls[0]?.command, exe);
    assert.equal(calls[0]?.env["ONENOTE_DISABLE_RAW_XML"], "1");
    for (const name of REQUIRED) assert.ok(lines.includes(`tool: ${name}`), name);
    assert.equal(lines.at(-1), "0 findings (tool contract)");
  });
});

test("the CLI prints the findings and exits 1 on a broken contract", async () => {
  await withExe(async (dir) => {
    const { code, lines } = await runMain(
      ["--exe", "onenote-mcp.exe"],
      dir,
      fakeList([...REQUIRED.slice(1), "get_page_xml"], []),
    );
    assert.equal(code, 1);
    assert.ok(lines.some((line) => line.endsWith("tool-contract: required tool ping is missing")));
    assert.ok(lines.some((line) => line.endsWith("tool-contract: forbidden tool get_page_xml is listed")));
    assert.equal(lines.at(-1), "2 findings (tool contract)");
  });
});

test("the CLI refuses a missing --exe, a missing file, and a folder", async () => {
  await withExe(async (dir) => {
    const list: ListTools = () => assert.fail("must not start anything");
    for (const args of [[], ["--exe"], ["--exe", "missing.exe"], ["--exe", "."]]) {
      const { code, errors } = await runMain(args, dir, list);
      assert.equal(code, 2, args.join(" "));
      assert.ok(errors.length > 0, args.join(" "));
    }
  });
});

test("the CLI exits 2 when the server cannot be listed", async () => {
  await withExe(async (dir) => {
    const { code, errors } = await runMain(["--exe", "onenote-mcp.exe"], dir, () =>
      Promise.reject(new Error("timed out")),
    );
    assert.equal(code, 2);
    assert.match(errors.join("\n"), /timed out/);
  });
});
