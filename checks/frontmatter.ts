/** The result of parsing frontmatter: the fields and the body, or why the text has none. */
export type FrontmatterResult =
  | { ok: true; fields: Map<string, string>; body: string }
  | { ok: false; error: string };

const DELIMITER = "---";

const FIELD = /^([A-Za-z][A-Za-z0-9_-]*):(?:\s(.*))?$/;

/**
 * Parses the flat `key: value` frontmatter used by agents and skills.
 * The value is everything after the first `: `, trimmed. Blank lines inside the block are skipped.
 * The body is the text after the closing `---`, with LF line endings.
 */
export function parseFrontmatter(text: string): FrontmatterResult {
  const lines = text.split(/\r?\n/);
  if (lines[0] !== DELIMITER) return { ok: false, error: "no frontmatter: line 1 must be ---" };
  const close = lines.indexOf(DELIMITER, 1);
  if (close === -1) return { ok: false, error: "frontmatter has no closing ---" };
  const fields = new Map<string, string>();
  for (let index = 1; index < close; index++) {
    const line = lines[index];
    if (line.trim() === "") continue;
    const match = FIELD.exec(line);
    if (match === null) return { ok: false, error: `frontmatter line ${index + 1} is not key: value` };
    const [, key, value = ""] = match;
    if (fields.has(key)) return { ok: false, error: `frontmatter has duplicate key ${key}` };
    fields.set(key, value.trim());
  }
  return { ok: true, fields, body: lines.slice(close + 1).join("\n") };
}
