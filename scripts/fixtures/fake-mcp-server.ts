/**
 * A fake MCP server for the tool contract tests. Speaks newline-delimited JSON-RPC 2.0 on stdio
 * and is strict about the handshake, so a client that skips a step gets an error response.
 *
 * Environment:
 * - `FAKE_MCP_TOOLS`: comma-separated tool names for `tools/list`.
 * - `FAKE_MCP_PAGE_SIZE`: tools per `tools/list` page; pages are linked by `nextCursor`.
 * - `FAKE_MCP_MODE`: `silent` never answers, `exit` exits on `initialize`, `error` answers
 *   `tools/list` with an error.
 * - `FAKE_MCP_PID_FILE`: a file the fake writes its process ID to at start, so a test can check
 *   that the client stopped it.
 */
import { writeFileSync } from "node:fs";
import { createInterface } from "node:readline";

const PROTOCOL_VERSION = "2025-06-18";
const CLIENT_NAME = "unterricht-tool-contract";

const tools = (process.env["FAKE_MCP_TOOLS"] ?? "").split(",").filter((name) => name !== "");
const pageSize = Number(process.env["FAKE_MCP_PAGE_SIZE"] ?? tools.length) || tools.length || 1;
const mode = process.env["FAKE_MCP_MODE"] ?? "";

let initializeAnswered = false;
let initialized = false;

/** A JSON-RPC message as far as this fake reads it. */
interface Message {
  id?: number | string;
  method?: string;
  params?: Record<string, unknown>;
}

/** Writes one JSON-RPC message as a line. */
function send(message: object): void {
  process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", ...message })}\n`);
}

/** Answers `id` with a JSON-RPC error. */
function fail(id: number | string | undefined, message: string): void {
  send({ id, error: { code: -32600, message } });
}

/** Answers `initialize` when the client sends the expected handshake. */
function onInitialize(message: Message): void {
  const params = message.params ?? {};
  const clientInfo = params["clientInfo"] as { name?: unknown } | undefined;
  const capabilities = params["capabilities"];
  if (params["protocolVersion"] !== PROTOCOL_VERSION) return fail(message.id, "wrong protocolVersion");
  if (clientInfo?.name !== CLIENT_NAME) return fail(message.id, "wrong clientInfo");
  if (typeof capabilities !== "object" || capabilities === null || Object.keys(capabilities).length > 0) {
    return fail(message.id, "capabilities must be empty");
  }
  initializeAnswered = true;
  send({
    id: message.id,
    result: {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: { tools: {} },
      serverInfo: { name: "fake-mcp-server", version: "0.0.0" },
    },
  });
}

/** Answers `tools/list` with the page that starts at the cursor. */
function onToolsList(message: Message): void {
  if (!initialized) return fail(message.id, "tools/list before notifications/initialized");
  if (mode === "error") return fail(message.id, "tools unavailable");
  const cursor = message.params?.["cursor"];
  const start = typeof cursor === "string" ? Number(cursor) : 0;
  const page = tools.slice(start, start + pageSize);
  const next = start + pageSize;
  send({
    id: message.id,
    result: {
      tools: page.map((name) => ({ name, inputSchema: { type: "object" } })),
      ...(next < tools.length ? { nextCursor: String(next) } : {}),
    },
  });
}

/** Dispatches one incoming line. */
function onLine(line: string): void {
  if (mode === "silent" || line.trim() === "") return;
  const message = JSON.parse(line) as Message;
  if (message.method === "initialize") {
    if (mode === "exit") process.exit(3);
    onInitialize(message);
  } else if (message.method === "notifications/initialized") {
    initialized = initializeAnswered;
  } else if (message.method === "tools/list") {
    onToolsList(message);
  } else if (message.id !== undefined) {
    send({ id: message.id, error: { code: -32601, message: "method not found" } });
  }
}

const pidFile = process.env["FAKE_MCP_PID_FILE"];
if (pidFile !== undefined) writeFileSync(pidFile, String(process.pid));

createInterface({ input: process.stdin }).on("line", onLine);
