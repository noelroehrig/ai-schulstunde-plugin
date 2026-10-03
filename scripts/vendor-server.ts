import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const USAGE = "usage: vendor-server.ts --tag <vX.Y.Z> --from <dir> [--root <repo>]";

const EXE_NAME = "onenote-mcp.exe";
const SHA_NAME = `${EXE_NAME}.sha256`;

const SERVER_DIR = "plugin/server";
const MANIFEST = "plugin/.claude-plugin/plugin.json";
const CHANGELOG = "CHANGELOG.md";
const CHANGELOG_HEADING = "# Änderungen";

const TAG = /^v\d+\.\d+\.\d+$/;
const VERSION = /^(\d+)\.(\d+)\.(\d+)$/;

/**
 * The format `sha256sum` writes and the server's release publishes, as one line. The `*` is the
 * binary marker `sha256sum` writes on Windows, where the release is built.
 */
const CHECKSUM_LINE = /^([0-9A-Fa-f]{64}) [ *]onenote-mcp\.exe(\r?\n)?$/;

/** True when `tag` is a release tag like `v1.0.1` and nothing else. */
export function isValidTag(tag: string): boolean {
  return TAG.test(tag);
}

/** Reads the lowercase hex hash from a `.sha256` file; undefined when it is not one such line. */
export function parseChecksumLine(text: string): string | undefined {
  return CHECKSUM_LINE.exec(text)?.[1]?.toLowerCase();
}

/** Raises the patch part of an `X.Y.Z` version; throws for anything else. */
export function bumpPatch(version: string): string {
  const match = VERSION.exec(version);
  if (!match) throw new Error(`version "${version}" is not X.Y.Z`);
  return `${match[1]}.${match[2]}.${Number(match[3]) + 1}`;
}

/** Formats `date` as `YYYY-MM-DD` in UTC, the date the workflow runner sees. */
export function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Adds the German entry for a server update directly under `# Änderungen`, keeping the file's
 * line ends. Throws when the heading is missing.
 */
export function insertChangelogEntry(changelog: string, version: string, date: string, tag: string): string {
  const eol = changelog.includes("\r\n") ? "\r\n" : "\n";
  const lines = changelog.split(/\r?\n/);
  const heading = lines.indexOf(CHANGELOG_HEADING);
  if (heading === -1) throw new Error(`${CHANGELOG}: no "${CHANGELOG_HEADING}" heading`);
  const rest = lines.slice(heading + 1);
  if (rest[0] !== "") rest.unshift("");
  const entry = ["", `## ${version} (${date})`, "", `- Server aktualisiert auf ${tag}.`];
  return [...lines.slice(0, heading + 1), ...entry, ...rest].join(eol);
}

/** The SHA-256 of `bytes` as lowercase hex. */
function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/** Reads the value after `name` from the arguments; undefined when missing. */
function option(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
}

/** Throws unless `path` exists and is a directory (or a file when `kind` says so). */
function requireExisting(path: string, kind: "directory" | "file"): void {
  let stats;
  try {
    stats = statSync(path);
  } catch {
    throw new Error(`${path}: not found`);
  }
  if (kind === "directory" ? !stats.isDirectory() : !stats.isFile()) throw new Error(`${path}: not a ${kind}`);
}

/** Every file the vendoring writes, computed before anything is written. */
interface VendorPlan {
  exe: Buffer;
  checksum: string;
  manifest: string;
  changelog: string;
  version: string;
}

/** Reads and verifies the release in `from` and prepares the new repository files in `root`. */
function planVendoring(root: string, from: string, tag: string, today: Date): VendorPlan {
  requireExisting(root, "directory");
  requireExisting(from, "directory");
  requireExisting(join(from, EXE_NAME), "file");
  requireExisting(join(from, SHA_NAME), "file");
  const expected = parseChecksumLine(readFileSync(join(from, SHA_NAME), "utf8"));
  if (expected === undefined) throw new Error(`${SHA_NAME}: checksum file must be one line: <64 hex>  ${EXE_NAME} or <64 hex> *${EXE_NAME}`);
  const exe = readFileSync(join(from, EXE_NAME));
  const actual = sha256(exe);
  if (actual !== expected) throw new Error(`${EXE_NAME}: checksum mismatch, expected ${expected}, got ${actual}`);

  const manifest = JSON.parse(readFileSync(join(root, MANIFEST), "utf8")) as { version?: unknown };
  if (typeof manifest.version !== "string") throw new Error(`${MANIFEST}: no string version`);
  const version = bumpPatch(manifest.version);
  manifest.version = version;
  const changelog = insertChangelogEntry(readFileSync(join(root, CHANGELOG), "utf8"), version, formatDate(today), tag);
  return {
    exe,
    checksum: `${actual}  ${EXE_NAME}\n`,
    manifest: `${JSON.stringify(manifest, null, 2)}\n`,
    changelog,
    version,
  };
}

/** Writes the prepared files into `root`. */
function writeVendoring(root: string, tag: string, plan: VendorPlan): void {
  const server = join(root, SERVER_DIR);
  mkdirSync(server, { recursive: true });
  writeFileSync(join(server, EXE_NAME), plan.exe);
  writeFileSync(join(server, SHA_NAME), plan.checksum);
  writeFileSync(join(server, "VERSION"), `${tag}\n`);
  writeFileSync(join(root, MANIFEST), plan.manifest);
  writeFileSync(join(root, CHANGELOG), plan.changelog);
}

/**
 * Vendors the server release in `--from` into the repository at `--root` (`SPEC.md` section 11.2).
 * Returns the exit code: 0 done, 1 when the release or the repository is not usable, 2 usage error.
 */
export function main(
  args: string[],
  cwd: string,
  out: (line: string) => void = console.log,
  err: (line: string) => void = console.error,
  today: Date = new Date(),
): number {
  const tag = option(args, "--tag");
  const from = option(args, "--from");
  if (tag === undefined || from === undefined || !isValidTag(tag)) {
    err(USAGE);
    return 2;
  }
  const root = resolve(cwd, option(args, "--root") ?? ".");
  try {
    const plan = planVendoring(root, resolve(root, from), tag, today);
    writeVendoring(root, tag, plan);
    out(`vendored onenote-mcp ${tag}, plugin version ${plan.version}`);
    return 0;
  } catch (error) {
    err(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

/** True when this module is the process entry point rather than an import. */
function isEntryPoint(): boolean {
  const entry = process.argv[1];
  return entry !== undefined && realpathSync(entry) === realpathSync(fileURLToPath(import.meta.url));
}

if (isEntryPoint()) {
  process.exitCode = main(process.argv.slice(2), process.cwd());
}
