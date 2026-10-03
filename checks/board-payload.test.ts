import { test } from "node:test";
import assert from "node:assert/strict";
import { validateBoardPayload } from "./board-payload.ts";

/** A small valid payload; `outline` overrides the single outline. */
function payload(outline: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    page_id: "seite",
    title: "Thema",
    outlines: [
      {
        position: { x: 48, y: 24, z: 0 },
        width: 928,
        items: [{ type: "paragraph", text: "Thema", style: "h1", font_size: 32, color: "#1F4E79" }],
        ...outline,
      },
    ],
  };
}

/** A payload whose single outline holds only `item`. */
function withItem(item: unknown): Record<string, unknown> {
  return payload({ items: [item] });
}

/** Asserts exactly one error matching `pattern`. */
function assertOneError(value: unknown, pattern: RegExp): void {
  const errors = validateBoardPayload(value);
  assert.equal(errors.length, 1, JSON.stringify(errors));
  assert.match(errors[0], pattern);
}

test("validateBoardPayload accepts a valid payload", () => {
  assert.deepEqual(validateBoardPayload(payload()), []);
});

test("validateBoardPayload accepts every supported field", () => {
  const formatting = {
    bold: true,
    italic: false,
    underline: true,
    strikethrough: false,
    color: "#C00",
    highlight: "#FFFF00",
    font_size: 20.5,
    font_family: "Segoe UI, Arial",
  };
  const value = payload({
    position: { x: 0, y: 0 },
    items: [
      { type: "paragraph", segments: [{ text: "a", ...formatting }, { text: "b" }], style: "normal", ...formatting },
      { type: "paragraph", text: "", style: "h6" },
      {
        type: "list",
        style: "numbered",
        items: [
          { text: "eins", children: [{ segments: [{ text: "zwei", font_size: 20 }] }] },
          { segments: [{ text: "drei" }], children: [] },
        ],
      },
      { type: "list", style: "bullet", items: [] },
    ],
  });
  assert.deepEqual(validateBoardPayload(value), []);
});

test("validateBoardPayload accepts outlines without position and width", () => {
  const value = payload();
  const outline = (value.outlines as Record<string, unknown>[])[0];
  delete outline.position;
  delete outline.width;
  assert.deepEqual(validateBoardPayload(value), []);
});

test("validateBoardPayload rejects a non-object payload", () => {
  assertOneError([], /payload must be an object/);
  assertOneError(null, /payload must be an object/);
});

test("validateBoardPayload requires non-empty page_id and title", () => {
  assertOneError({ ...payload(), page_id: "" }, /^page_id: /);
  assertOneError({ ...payload(), title: 3 }, /^title: /);
  const { page_id: _, ...withoutId } = payload();
  assertOneError(withoutId, /^page_id: /);
});

test("validateBoardPayload requires outlines to be an array of objects", () => {
  assertOneError({ ...payload(), outlines: {} }, /^outlines: must be an array/);
  assertOneError({ ...payload(), outlines: ["x"] }, /^outlines\[0\]: must be an object/);
});

test("validateBoardPayload rejects an images key and unknown keys at the top level", () => {
  assertOneError({ ...payload(), images: [] }, /^images: .*images are a non-goal/);
  assertOneError({ ...payload(), parent_page_id: "x" }, /^parent_page_id: unknown key/);
});

test("validateBoardPayload checks the outline position", () => {
  assertOneError(payload({ position: { x: -1, y: 0 } }), /^outlines\[0\]\.position\.x: /);
  assertOneError(payload({ position: { x: 0, y: -0.5 } }), /^outlines\[0\]\.position\.y: /);
  assertOneError(payload({ position: { x: 0 } }), /^outlines\[0\]\.position\.y: /);
  assertOneError(payload({ position: { x: 0, y: 0, z: 1.5 } }), /^outlines\[0\]\.position\.z: .*integer/);
  assertOneError(payload({ position: { x: "0", y: 0 } }), /^outlines\[0\]\.position\.x: /);
  assertOneError(payload({ position: { x: 0, y: 0, w: 1 } }), /^outlines\[0\]\.position\.w: unknown key/);
  assertOneError(payload({ position: [0, 0] }), /^outlines\[0\]\.position: must be an object/);
});

test("validateBoardPayload requires a positive width", () => {
  assertOneError(payload({ width: 0 }), /^outlines\[0\]\.width: /);
  assertOneError(payload({ width: Number.NaN }), /^outlines\[0\]\.width: /);
});

test("validateBoardPayload requires a non-empty items array in an outline", () => {
  assertOneError(payload({ items: [] }), /^outlines\[0\]\.items: must be a non-empty array/);
  const value = payload();
  delete (value.outlines as Record<string, unknown>[])[0].items;
  assertOneError(value, /^outlines\[0\]\.items: must be a non-empty array/);
});

test("validateBoardPayload rejects unknown outline keys", () => {
  assertOneError(payload({ height: 100 }), /^outlines\[0\]\.height: unknown key/);
});

test("validateBoardPayload rejects images and tables as item types", () => {
  assertOneError(withItem({ type: "image_placeholder", text: "x" }), /^outlines\[0\]\.items\[0\]\.type: .*image_placeholder/);
  assertOneError(withItem({ type: "inline_image", handle: "x" }), /^outlines\[0\]\.items\[0\]\.type: .*inline_image/);
  assertOneError(withItem({ type: "table" }), /^outlines\[0\]\.items\[0\]\.type: /);
  assertOneError(withItem({ text: "x" }), /^outlines\[0\]\.items\[0\]\.type: /);
  assertOneError(withItem("x"), /^outlines\[0\]\.items\[0\]: must be an object/);
});

test("validateBoardPayload requires exactly one of text or segments in a paragraph", () => {
  assertOneError(withItem({ type: "paragraph" }), /^outlines\[0\]\.items\[0\]: exactly one of text or segments/);
  assertOneError(
    withItem({ type: "paragraph", text: "a", segments: [] }),
    /^outlines\[0\]\.items\[0\]: exactly one of text or segments/,
  );
  assertOneError(withItem({ type: "paragraph", text: 1 }), /^outlines\[0\]\.items\[0\]\.text: must be a string/);
  assertOneError(withItem({ type: "paragraph", segments: "a" }), /^outlines\[0\]\.items\[0\]\.segments: must be an array/);
});

test("validateBoardPayload checks the paragraph style", () => {
  assertOneError(withItem({ type: "paragraph", text: "a", style: "h7" }), /^outlines\[0\]\.items\[0\]\.style: /);
  assertOneError(withItem({ type: "paragraph", text: "a", style: "bullet" }), /^outlines\[0\]\.items\[0\]\.style: /);
});

test("validateBoardPayload checks the formatting fields of a paragraph", () => {
  const item = (fields: Record<string, unknown>) => withItem({ type: "paragraph", text: "a", ...fields });
  assertOneError(item({ bold: "true" }), /\.bold: must be a boolean/);
  assertOneError(item({ italic: 1 }), /\.italic: must be a boolean/);
  assertOneError(item({ underline: null }), /\.underline: must be a boolean/);
  assertOneError(item({ strikethrough: "no" }), /\.strikethrough: must be a boolean/);
  assertOneError(item({ color: "red" }), /\.color: /);
  assertOneError(item({ color: "#12345" }), /\.color: /);
  assertOneError(item({ highlight: "#GGG" }), /\.highlight: /);
  assertOneError(item({ font_size: 0 }), /\.font_size: /);
  assertOneError(item({ font_size: "20" }), /\.font_size: /);
  assertOneError(item({ font_family: "Arial; color: red" }), /\.font_family: /);
  assertOneError(item({ font_family: "A".repeat(65) }), /\.font_family: .*64/);
  assert.deepEqual(validateBoardPayload(item({ font_family: "A".repeat(64) })), []);
});

test("validateBoardPayload checks runs", () => {
  const item = (run: unknown) => withItem({ type: "paragraph", segments: [run] });
  assertOneError(item({ bold: true }), /^outlines\[0\]\.items\[0\]\.segments\[0\]\.text: must be a string/);
  assertOneError(item({ text: "a", color: "blue" }), /^outlines\[0\]\.items\[0\]\.segments\[0\]\.color: /);
  assertOneError(item({ text: "a", style: "h1" }), /^outlines\[0\]\.items\[0\]\.segments\[0\]\.style: unknown key/);
  assertOneError(item("a"), /^outlines\[0\]\.items\[0\]\.segments\[0\]: must be an object/);
});

test("validateBoardPayload checks lists recursively", () => {
  const list = (fields: Record<string, unknown>) => withItem({ type: "list", style: "bullet", items: [], ...fields });
  assertOneError(list({ style: "dashed" }), /^outlines\[0\]\.items\[0\]\.style: /);
  assertOneError(list({ style: undefined }), /^outlines\[0\]\.items\[0\]\.style: /);
  assertOneError(list({ items: "a" }), /^outlines\[0\]\.items\[0\]\.items: must be an array/);
  assertOneError(list({ items: [{}] }), /^outlines\[0\]\.items\[0\]\.items\[0\]: exactly one of text or segments/);
  assertOneError(
    list({ items: [{ text: "a", children: [{ text: "b", bold: true }] }] }),
    /^outlines\[0\]\.items\[0\]\.items\[0\]\.children\[0\]\.bold: unknown key/,
  );
  assertOneError(
    list({ items: [{ text: "a", children: [{ segments: [{ text: "b", font_size: -1 }] }] }] }),
    /^outlines\[0\]\.items\[0\]\.items\[0\]\.children\[0\]\.segments\[0\]\.font_size: /,
  );
  assertOneError(list({ items: [{ text: "a", children: {} }] }), /\.children: must be an array/);
  assertOneError(list({ bold: true }), /^outlines\[0\]\.items\[0\]\.bold: unknown key/);
});

test("validateBoardPayload reports every error, not only the first", () => {
  const value = { page_id: "", title: "", outlines: [{ width: -1, items: [] }], images: [] };
  assert.equal(validateBoardPayload(value).length, 5);
});
