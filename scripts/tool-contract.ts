import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { realpathSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import type { Finding } from "../checks/repo.ts";
import { formatFinding } from "../checks/run.ts";

const RULE = "tool-contract";

const USAGE = "usage: tool-contract.ts --exe <path>";

/** The tools the plugin uses (`SPEC.md` section 11.1). */
const REQUIRED_TOOLS = ["ping", "get_notebooks", "list_pages", "get_page", "create_page", "replace_page"];

/** The raw-XML tools that `ONENOTE_DISABLE_RAW_XML=1` must remove. */
const FORBIDDEN_TOOLS = ["list_hierarchy_xml", "get_page_xml", "replace_page_xml", "append_page_xml"];

const PROTOCOL_VERSION = "2025-06-18";
const CLIENT_INFO = { name: "unterricht-tool-contract", version: "1.0.0" };

/** Generous because the PyInstaller exe unpacks itself into `%TEMP%` at every start. */
const CLI_TIMEOUT_MS = 60_000;

/** How long a stopped server gets before it is killed for good. */
const KILL_GRACE_MS = 2_000;

/** Starts a server and returns the names of its tools; the CLI takes it as a parameter for tests. */
export type ListTools = (
  command: string,
  args: string[],
  env: NodeJS.ProcessEnv,
  timeoutMs: number,
) => Promise<string[]>;

/** Reports every required tool that is missing and every forbidden tool that is listed. */
export function evaluateContract(toolNames: string[], file = "onenote-mcp.exe"): Finding[] {
  const findings: Finding[] = [];
  for (const name of REQUIRED_TOOLS) {
    if (!toolNames.includes(name)) findings.push({ file, rule: RULE, message: `required tool ${name} is missing` });
  }
  for (const name of FORBIDDEN_TOOLS) {
    if (toolNames.includes(name)) findings.push({ file, rule: RULE, message: `forbidden tool ${name} is listed` });
  }
  return findings;
}

/** A JSON-RPC response as far as this client reads it. */
interface Response {
  id?: unknown;
  result?: unknown;
  error?: { message?: unknown };
}

/** A request waiting for its response. */
interface Pending {
  method: string;
  resolve: (result: unknown) => void;
  reject: (error: Error) => void;
}

/**
 * Starts `command` without a shell and lists its tools over MCP stdio (newline-delimited
 * JSON-RPC 2.0): `initialize`, `notifications/initialized`, then `tools/list` until no
 * `nextCursor` is left. The server is stopped in every case. Fails on a timeout, an early exit,
 * an error response, or a malformed answer.
 */
export const listTools: ListTools = async (command, args, env, timeoutMs) => {
  const child = spawn(command, args, { env, stdio: ["pipe", "pipe", "pipe"], windowsHide: true });
  const pending = new Map<number, Pending>();
  let nextId = 1;
  let stderrTail = "";

  let fail: (error: Error) => void = () => {};
  const failure = new Promise<never>((_, reject) => {
    fail = reject;
  });
  // Only a race with a running request observes `failure`; a late one after success is expected.
  failure.catch(() => {});

  child.on("error", (error) => fail(new Error(`could not start ${command}: ${error.message}`)));
  // `close` rather than `exit`, so answers still buffered in stdout are read first.
  child.on("close", (code, signal) => {
    const detail = stderrTail.trim() === "" ? "" : `; stderr: ${stderrTail.trim()}`;
    fail(new Error(`server exited before the tool list was complete (code ${code}, signal ${signal})${detail}`));
  });
  // A server that dies makes writes fail with EPIPE; the `close` handler reports that.
  child.stdin.on("error", () => {});
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk: string) => {
    stderrTail = (stderrTail + chunk).slice(-2_000);
  });
  createInterface({ input: child.stdout }).on("line", (line) => {
    try {
      onResponse(line, pending);
    } catch (error) {
      fail(error instanceof Error ? error : new Error(String(error)));
    }
  });
  const timer = setTimeout(() => fail(new Error(`server timed out after ${timeoutMs} ms`)), timeoutMs);

  const send = (message: object): void => {
    child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", ...message })}\n`);
  };
  const request = (method: string, params: object): Promise<unknown> => {
    const id = nextId++;
    const response = new Promise<unknown>((resolve, reject) => pending.set(id, { method, resolve, reject }));
    send({ id, method, params });
    return Promise.race([response, failure]);
  };

  try {
    await request("initialize", { protocolVersion: PROTOCOL_VERSION, capabilities: {}, clientInfo: CLIENT_INFO });
    send({ method: "notifications/initialized" });
    return await listAllPages((params) => request("tools/list", params));
  } finally {
    clearTimeout(timer);
    await stop(child);
  }
};

/** Settles the pending request that `line` answers; other messages from the server are ignored. */
function onResponse(line: string, pending: Map<number, Pending>): void {
  if (line.trim() === "") return;
  let message: Response;
  try {
    message = JSON.parse(line) as Response;
  } catch {
    throw new Error(`server wrote a line that is not JSON-RPC: ${line.slice(0, 200)}`);
  }
  if (typeof message.id !== "number") return;
  const request = pending.get(message.id);
  if (request === undefined) return;
  pending.delete(message.id);
  if (message.error !== undefined) {
    request.reject(new Error(`${request.method} failed: ${String(message.error.message)}`));
  } else {
    request.resolve(message.result);
  }
}

/** Calls `tools/list` page by page and collects the tool names. */
async function listAllPages(listPage: (params: object) => Promise<unknown>): Promise<string[]> {
  const names: string[] = [];
  const seen = new Set<string>();
  let cursor: string | undefined;
  do {
    const result = (await listPage(cursor === undefined ? {} : { cursor })) as
      | { tools?: unknown; nextCursor?: unknown }
      | undefined;
    if (!Array.isArray(result?.tools)) throw new Error("tools/list returned no tools array");
    for (const tool of result.tools as { name?: unknown }[]) {
      if (typeof tool?.name !== "string") throw new Error("tools/list returned a tool without a name");
      names.push(tool.name);
    }
    const next = result.nextCursor;
    if (next !== undefined && typeof next !== "string") throw new Error("tools/list returned a non-string nextCursor");
    // A server that hands out the same cursor again would otherwise loop until the timeout.
    if (next !== undefined && seen.has(next)) throw new Error(`tools/list repeated the cursor ${next}`);
    if (next !== undefined) seen.add(next);
    cursor = next;
  } while (cursor !== undefined);
  return names;
}

/** Closes stdin, then terminates the server and waits for it to exit. */
async function stop(child: ChildProcessWithoutNullStreams): Promise<void> {
  child.stdin.end();
  if (child.pid !== undefined && child.exitCode === null && child.signalCode === null) {
    const exited = new Promise<void>((resolve) => child.once("exit", () => resolve()));
    child.kill();
    const killTimer = setTimeout(() => child.kill("SIGKILL"), KILL_GRACE_MS);
    await exited;
    clearTimeout(killTimer);
  }
  child.stdout.destroy();
  child.stderr.destroy();
}

/** Reads the value after `name` from the arguments; undefined when missing. */
function option(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
}

/** True when `path` exists and is a file. */
function isFile(path: string): boolean {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

/**
 * Lists the tools of the exe at `--exe` with the raw-XML tools disabled and checks them against
 * the contract (`SPEC.md` section 11.2). Returns the exit code: 0 clean, 1 findings, 2 usage or
 * server error.
 */
export async function main(
  args: string[],
  cwd: string,
  list: ListTools = listTools,
  out: (line: string) => void = console.log,
  err: (line: string) => void = console.error,
  baseEnv: NodeJS.ProcessEnv = process.env,
): Promise<number> {
  const exeArg = option(args, "--exe");
  if (exeArg === undefined) {
    err(USAGE);
    return 2;
  }
  const exe = resolve(cwd, exeArg);
  if (!isFile(exe)) {
    err(`${exe}: not a file`);
    return 2;
  }
  let tools: string[];
  try {
    tools = await list(exe, [], { ...baseEnv, ONENOTE_DISABLE_RAW_XML: "1" }, CLI_TIMEOUT_MS);
  } catch (error) {
    err(error instanceof Error ? error.message : String(error));
    return 2;
  }
  for (const name of tools) out(`tool: ${name}`);
  const findings = evaluateContract(tools, exeArg);
  for (const finding of findings) out(formatFinding(finding));
  out(`${findings.length} findings (tool contract)`);
  return findings.length > 0 ? 1 : 0;
}

/** True when this module is the process entry point rather than an import. */
function isEntryPoint(): boolean {
  const entry = process.argv[1];
  return entry !== undefined && realpathSync(entry) === realpathSync(fileURLToPath(import.meta.url));
}

if (isEntryPoint()) {
  process.exitCode = await main(process.argv.slice(2), process.cwd());
}
