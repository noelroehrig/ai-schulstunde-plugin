import { test } from "node:test";
import assert from "node:assert/strict";
import { validateBoardFile, validateBoardPayload } from "./board-payload.ts";

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

/** A valid image placeholder; `fields` override its fields. */
function placeholder(fields: Record<string, unknown> = {}): Record<string, unknown> {
  return { type: "image_placeholder", description: "Screenshot S. 152, Nr. 3 hier einfügen", width: 928, height: 200, ...fields };
}

/** A valid floating image; `fields` override its fields. */
function image(fields: Record<string, unknown> = {}): Record<string, unknown> {
  return { handle: "mcpref:a", width: 940, height: 88, position: { x: 36, y: 71 }, ...fields };
}

/** The `image_labels` entry of `image()`; `fields` override its fields. */
function label(fields: Record<string, unknown> = {}): Record<string, unknown> {
  return { handle: "mcpref:a", template: "banner", label: "Einstieg", ...fields };
}

/** A valid payload with `images` as its floating images. */
function withImages(images: unknown): Record<string, unknown> {
  return { ...payload(), images };
}

/** Asserts exactly one error of `validate` matching `pattern`. */
function assertOneError(value: unknown, pattern: RegExp, validate = validateBoardPayload): void {
  const errors = validate(value);
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

test("validateBoardPayload rejects unknown keys at the top level, image_labels included", () => {
  assertOneError({ ...payload(), parent_page_id: "x" }, /^parent_page_id: unknown key/);
  assertOneError({ ...withImages([image()]), image_labels: [label()] }, /^image_labels: unknown key/);
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

test("validateBoardPayload rejects inline images, tables, and other item types", () => {
  assertOneError(
    withItem({ type: "inline_image", handle: "mcpref:a" }),
    /^outlines\[0\]\.items\[0\]\.type: "inline_image" is not allowed, only "paragraph", "list", and "image_placeholder" \(tables and inline images are not supported\)$/,
  );
  assertOneError(withItem({ type: "table" }), /^outlines\[0\]\.items\[0\]\.type: "table" is not allowed/);
  assertOneError(withItem({ text: "x" }), /^outlines\[0\]\.items\[0\]\.type: undefined is not allowed/);
  assertOneError(withItem("x"), /^outlines\[0\]\.items\[0\]: must be an object/);
});

test("validateBoardPayload accepts an image placeholder as the last item of an outline", () => {
  const value = payload({ items: [{ type: "paragraph", text: "S. 152, Nr. 3", font_size: 20 }, placeholder()] });
  assert.deepEqual(validateBoardPayload(value), []);
  assert.deepEqual(validateBoardPayload(withItem(placeholder())), []);
});

test("validateBoardPayload rejects an image placeholder that is not the last item of its outline", () => {
  const value = payload({ items: [placeholder(), { type: "paragraph", text: "a" }] });
  assertOneError(value, /^outlines\[0\]\.items\[0\]: an image_placeholder must be the last item of its outline$/);
});

test("validateBoardPayload checks the fields of an image placeholder", () => {
  assertOneError(withItem(placeholder({ description: "" })), /^outlines\[0\]\.items\[0\]\.description: must be a non-empty string/);
  assertOneError(withItem(placeholder({ description: undefined })), /^outlines\[0\]\.items\[0\]\.description: /);
  assertOneError(withItem(placeholder({ width: 0 })), /^outlines\[0\]\.items\[0\]\.width: must be a number greater than 0/);
  assertOneError(withItem(placeholder({ width: undefined })), /^outlines\[0\]\.items\[0\]\.width: /);
  assertOneError(withItem(placeholder({ height: "200" })), /^outlines\[0\]\.items\[0\]\.height: must be a number greater than 0/);
  assertOneError(withItem(placeholder({ height: undefined })), /^outlines\[0\]\.items\[0\]\.height: /);
  assertOneError(withItem(placeholder({ text: "x" })), /^outlines\[0\]\.items\[0\]\.text: unknown key/);
  assertOneError(withItem(placeholder({ font_size: 20 })), /^outlines\[0\]\.items\[0\]\.font_size: unknown key/);
});

test("validateBoardPayload accepts floating images", () => {
  const value = withImages([image(), image({ handle: "mcpref:b", position: { x: 48, y: 183, z: 2 } })]);
  assert.deepEqual(validateBoardPayload(value), []);
});

test("validateBoardPayload requires images to be a non-empty array when present", () => {
  assertOneError(withImages([]), /^images: must be a non-empty array, omit it/);
  assertOneError(withImages({}), /^images: must be a non-empty array/);
  assertOneError(withImages(["x"]), /^images\[0\]: must be an object/);
});

test("validateBoardPayload requires a handle that starts with mcpref:", () => {
  assertOneError(withImages([image({ handle: "ref:a" })]), /^images\[0\]\.handle: must be a string starting with mcpref:/);
  assertOneError(withImages([image({ handle: "Mcpref:a" })]), /^images\[0\]\.handle: /);
  assertOneError(withImages([image({ handle: 1 })]), /^images\[0\]\.handle: /);
});

test("validateBoardPayload requires every field of a floating image", () => {
  for (const key of ["handle", "width", "height"]) {
    assertOneError(withImages([image({ [key]: undefined })]), new RegExp(`^images\\[0\\]\\.${key}: `));
  }
  assertOneError(withImages([image({ position: undefined })]), /^images\[0\]\.position: must be an object with x and y/);
});

test("validateBoardPayload checks the size, position, and keys of a floating image", () => {
  assertOneError(withImages([image({ width: 0 })]), /^images\[0\]\.width: must be a number greater than 0/);
  assertOneError(withImages([image({ height: -1 })]), /^images\[0\]\.height: must be a number greater than 0/);
  assertOneError(withImages([image({ position: { x: -1, y: 0 } })]), /^images\[0\]\.position\.x: /);
  assertOneError(withImages([image({ position: { x: 0, y: 0, z: 0.5 } })]), /^images\[0\]\.position\.z: .*integer/);
  assertOneError(withImages([image({ label: "Merke" })]), /^images\[0\]\.label: unknown key/);
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

/** A valid `tafelbild_vN.json` with two floating images and their labels. */
function boardFile(): Record<string, unknown> {
  return {
    ...withImages([image(), image({ handle: "mcpref:b", width: 40, height: 40, position: { x: 48, y: 183 } })]),
    image_labels: [label(), label({ handle: "mcpref:b", template: "symbol", label: "Merke" })],
  };
}

/** Asserts exactly one error of `validateBoardFile` matching `pattern`. */
function assertOneFileError(value: unknown, pattern: RegExp): void {
  assertOneError(value, pattern, validateBoardFile);
}

test("validateBoardFile accepts a file with images and their labels, and one without either", () => {
  assert.deepEqual(validateBoardFile(boardFile()), []);
  assert.deepEqual(validateBoardFile(payload()), []);
});

test("validateBoardFile reports every payload error", () => {
  assertOneFileError([], /payload must be an object/);
  assertOneFileError({ ...boardFile(), title: "" }, /^title: /);
  assertOneFileError({ ...boardFile(), parent_page_id: "x" }, /^parent_page_id: unknown key/);
  assertOneFileError(withItem({ type: "inline_image", handle: "mcpref:a" }), /^outlines\[0\]\.items\[0\]\.type: "inline_image" is not allowed/);
  assertOneFileError(payload({ items: [placeholder(), placeholder()] }), /^outlines\[0\]\.items\[0\]: an image_placeholder must be the last/);
});

test("validateBoardFile requires image_labels when images is present", () => {
  const { image_labels: _, ...withoutLabels } = boardFile();
  assertOneFileError(withoutLabels, /^image_labels: required when images is present/);
  assertOneFileError({ ...boardFile(), image_labels: {} }, /^image_labels: must be an array/);
});

test("validateBoardFile rejects image_labels without images", () => {
  assertOneFileError({ ...payload(), image_labels: [] }, /^image_labels: not allowed without images/);
  assertOneFileError({ ...payload(), image_labels: [label()] }, /^image_labels: not allowed without images/);
});

test("validateBoardFile requires one label per floating image", () => {
  const value = boardFile();
  (value.image_labels as unknown[]).pop();
  assertOneFileError(value, /^image_labels: has 1 entries, images has 2$/);
  const longer = boardFile();
  (longer.image_labels as unknown[]).push(label({ handle: "mcpref:c" }));
  assertOneFileError(longer, /^image_labels: has 3 entries, images has 2$/);
});

/** `boardFile()` with its first label replaced by `entry`. */
function withFirstLabel(entry: unknown): Record<string, unknown> {
  const value = boardFile();
  (value.image_labels as unknown[])[0] = entry;
  return value;
}

test("validateBoardFile requires each label's handle to equal the handle of the image at the same index", () => {
  const sameIndex = /^image_labels\[0\]\.handle: must equal the handle of the floating image at the same index$/;
  assertOneFileError(withFirstLabel(label({ handle: "mcpref:b" })), sameIndex);
  assertOneFileError(withFirstLabel(label({ handle: undefined })), sameIndex);
  const swapped = boardFile();
  (swapped.image_labels as unknown[]).reverse();
  assert.deepEqual(validateBoardFile(swapped), [
    "image_labels[0].handle: must equal the handle of the floating image at the same index",
    "image_labels[1].handle: must equal the handle of the floating image at the same index",
  ]);
});

test("validateBoardFile checks the template, the label, and the keys of an entry", () => {
  assertOneFileError(withFirstLabel(label({ template: "vorbild" })), /^image_labels\[0\]\.template: must be one of banner, symbol$/);
  assertOneFileError(withFirstLabel(label({ template: undefined })), /^image_labels\[0\]\.template: /);
  assertOneFileError(withFirstLabel(label({ label: " " })), /^image_labels\[0\]\.label: must be a non-empty string$/);
  assertOneFileError(withFirstLabel(label({ label: undefined })), /^image_labels\[0\]\.label: /);
  assertOneFileError(withFirstLabel(label({ page: "Banner" })), /^image_labels\[0\]\.page: unknown key$/);
  assertOneFileError(withFirstLabel("x"), /^image_labels\[0\]: must be an object$/);
});
