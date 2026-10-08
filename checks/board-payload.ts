import { isNonEmptyString, isObject, type JsonObject } from "./rules/json.ts";

/**
 * Validates a `replace_page` payload `{ page_id, title, outlines, images? }` against the OneNote MCP server's
 * page model, restricted to what the plugin uses: outlines with paragraphs, lists, and image placeholders,
 * and floating images. Tables and inline images are not supported, so their item types are errors.
 * Returns every error as `<path>: <message>`; an empty array means the payload is valid.
 */
export function validateBoardPayload(value: unknown): string[] {
  return checkPayload(value, []);
}

/**
 * Validates a `tafelbild_vN.json`: the payload plus `image_labels`, which is never sent to the server.
 * `image_labels` holds one `{ handle, template, label }` per floating image, in the order of `images`,
 * and is present exactly when `images` is. Returns every error as `<path>: <message>`.
 */
export function validateBoardFile(value: unknown): string[] {
  const errors = checkPayload(value, ["image_labels"]);
  if (isObject(value)) checkImageLabels(value, errors);
  return errors;
}

/** Hex colors as the server accepts them: `#RGB` or `#RRGGBB`. */
const COLOR = /^#(?:[0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

/** Font families the server accepts. */
const FONT_FAMILY = /^[A-Za-z0-9 ,.\-]+$/;

const FONT_FAMILY_MAX = 64;

const PARAGRAPH_STYLES = ["normal", "h1", "h2", "h3", "h4", "h5", "h6"];

const LIST_STYLES = ["bullet", "numbered"];

/** Inline formatting fields shared by paragraphs and runs. */
const FORMATTING_KEYS = ["bold", "italic", "underline", "strikethrough", "color", "highlight", "font_size", "font_family"];

/** The prefix of every image handle the server hands out. */
const HANDLE_PREFIX = "mcpref:";

/** The template pages a floating image comes from. */
const IMAGE_TEMPLATES = ["banner", "symbol"];

/** Checks a payload, allowing `extraKeys` at the top level besides the payload's own keys. */
function checkPayload(value: unknown, extraKeys: string[]): string[] {
  if (!isObject(value)) return ["payload must be an object with page_id, title, and outlines"];
  const errors: string[] = [];
  unknownKeys(value, ["page_id", "title", "outlines", "images", ...extraKeys], "", errors);
  if (!isNonEmptyString(value.page_id)) errors.push("page_id: must be a non-empty string");
  if (!isNonEmptyString(value.title)) errors.push("title: must be a non-empty string");
  if (!Array.isArray(value.outlines)) {
    errors.push("outlines: must be an array");
  } else {
    value.outlines.forEach((outline, index) => checkOutline(outline, `outlines[${index}]`, errors));
  }
  if (value.images !== undefined) checkImages(value.images, errors);
  return errors;
}

/** Checks one outline: optional position and width, a non-empty items array. */
function checkOutline(outline: unknown, path: string, errors: string[]): void {
  if (!isObject(outline)) {
    errors.push(`${path}: must be an object`);
    return;
  }
  unknownKeys(outline, ["position", "width", "items"], path, errors);
  if (outline.position !== undefined) checkPosition(outline.position, `${path}.position`, errors);
  if (outline.width !== undefined && !isPositive(outline.width)) {
    errors.push(`${path}.width: must be a number greater than 0`);
  }
  if (!Array.isArray(outline.items) || outline.items.length === 0) {
    errors.push(`${path}.items: must be a non-empty array`);
    return;
  }
  outline.items.forEach((item, index) => checkItem(item, `${path}.items[${index}]`, errors));
  checkPlaceholdersLast(outline.items, `${path}.items`, errors);
}

/** Checks `{ x, y, z? }`: non-negative coordinates (a negative one makes `get_page` fail on that page), integer z. */
function checkPosition(position: unknown, path: string, errors: string[]): void {
  if (!isObject(position)) {
    errors.push(`${path}: must be an object with x and y`);
    return;
  }
  unknownKeys(position, ["x", "y", "z"], path, errors);
  for (const axis of ["x", "y"]) {
    const coordinate = position[axis];
    if (!(isNumber(coordinate) && coordinate >= 0)) errors.push(`${path}.${axis}: must be a number of at least 0`);
  }
  if (position.z !== undefined && !Number.isInteger(position.z)) errors.push(`${path}.z: must be an integer`);
}

/** Checks one outline item: a paragraph, a list, or an image placeholder, nothing else. */
function checkItem(item: unknown, path: string, errors: string[]): void {
  if (!isObject(item)) {
    errors.push(`${path}: must be an object`);
    return;
  }
  if (item.type === "paragraph") {
    checkParagraph(item, path, errors);
  } else if (item.type === "list") {
    checkList(item, path, errors);
  } else if (item.type === "image_placeholder") {
    checkImagePlaceholder(item, path, errors);
  } else {
    errors.push(
      `${path}.type: ${JSON.stringify(item.type)} is not allowed, only "paragraph", "list", and "image_placeholder" ` +
        "(tables and inline images are not supported)",
    );
  }
}

/** Reports every image placeholder that is not the last item of its outline. */
function checkPlaceholdersLast(items: unknown[], path: string, errors: string[]): void {
  items.slice(0, -1).forEach((item, index) => {
    if (isObject(item) && item.type === "image_placeholder") {
      errors.push(`${path}[${index}]: an image_placeholder must be the last item of its outline`);
    }
  });
}

/** Checks a paragraph: text or segments, an optional style, and the formatting fields. */
function checkParagraph(item: JsonObject, path: string, errors: string[]): void {
  unknownKeys(item, ["type", "text", "segments", "style", ...FORMATTING_KEYS], path, errors);
  checkContent(item, path, errors);
  if (item.style !== undefined && !PARAGRAPH_STYLES.includes(item.style as string)) {
    errors.push(`${path}.style: must be one of ${PARAGRAPH_STYLES.join(", ")}`);
  }
  checkFormatting(item, path, errors);
}

/** Checks a list: a bullet or numbered style and an array of list items. */
function checkList(item: JsonObject, path: string, errors: string[]): void {
  unknownKeys(item, ["type", "style", "items"], path, errors);
  if (!LIST_STYLES.includes(item.style as string)) errors.push(`${path}.style: must be one of ${LIST_STYLES.join(", ")}`);
  checkListItems(item.items, `${path}.items`, errors);
}

/** Checks an image placeholder: a non-empty description and the size of the space it keeps free. */
function checkImagePlaceholder(item: JsonObject, path: string, errors: string[]): void {
  unknownKeys(item, ["type", "description", "width", "height"], path, errors);
  if (!isNonEmptyString(item.description)) errors.push(`${path}.description: must be a non-empty string`);
  checkSize(item, path, errors);
}

/** Checks an array of list items `{ text | segments, children? }`, recursively. */
function checkListItems(items: unknown, path: string, errors: string[]): void {
  if (!Array.isArray(items)) {
    errors.push(`${path}: must be an array`);
    return;
  }
  items.forEach((entry, index) => {
    const entryPath = `${path}[${index}]`;
    if (!isObject(entry)) {
      errors.push(`${entryPath}: must be an object`);
      return;
    }
    unknownKeys(entry, ["text", "segments", "children"], entryPath, errors);
    checkContent(entry, entryPath, errors);
    if (entry.children !== undefined) checkListItems(entry.children, `${entryPath}.children`, errors);
  });
}

/** Checks that exactly one of `text` (a string) or `segments` (an array of runs) is present. */
function checkContent(item: JsonObject, path: string, errors: string[]): void {
  const hasText = item.text !== undefined;
  const hasSegments = item.segments !== undefined;
  if (hasText === hasSegments) {
    errors.push(`${path}: exactly one of text or segments is required`);
    return;
  }
  if (hasText) {
    if (typeof item.text !== "string") errors.push(`${path}.text: must be a string`);
    return;
  }
  if (!Array.isArray(item.segments)) {
    errors.push(`${path}.segments: must be an array of runs`);
    return;
  }
  item.segments.forEach((run, index) => checkRun(run, `${path}.segments[${index}]`, errors));
}

/** Checks a run: a string `text` and the formatting fields. */
function checkRun(run: unknown, path: string, errors: string[]): void {
  if (!isObject(run)) {
    errors.push(`${path}: must be an object`);
    return;
  }
  unknownKeys(run, ["text", ...FORMATTING_KEYS], path, errors);
  if (typeof run.text !== "string") errors.push(`${path}.text: must be a string`);
  checkFormatting(run, path, errors);
}

/** Checks the optional inline formatting fields of a paragraph or run. */
function checkFormatting(item: JsonObject, path: string, errors: string[]): void {
  for (const key of ["bold", "italic", "underline", "strikethrough"]) {
    if (key in item && typeof item[key] !== "boolean") errors.push(`${path}.${key}: must be a boolean`);
  }
  for (const key of ["color", "highlight"]) {
    if (item[key] !== undefined && !(typeof item[key] === "string" && COLOR.test(item[key]))) {
      errors.push(`${path}.${key}: must be #RGB or #RRGGBB`);
    }
  }
  if (item.font_size !== undefined && !isPositive(item.font_size)) {
    errors.push(`${path}.font_size: must be a number greater than 0`);
  }
  const family = item.font_family;
  if (family !== undefined) {
    if (typeof family !== "string" || !FONT_FAMILY.test(family)) {
      errors.push(`${path}.font_family: must match ${FONT_FAMILY.source}`);
    } else if (family.length > FONT_FAMILY_MAX) {
      errors.push(`${path}.font_family: must have at most ${FONT_FAMILY_MAX} characters`);
    }
  }
}

/** Checks the floating images: a non-empty array, because a page without floating images omits the key. */
function checkImages(images: unknown, errors: string[]): void {
  if (!Array.isArray(images) || images.length === 0) {
    errors.push("images: must be a non-empty array, omit it when the page has no floating images");
    return;
  }
  images.forEach((image, index) => checkImage(image, `images[${index}]`, errors));
}

/** Checks a floating image `{ handle, width, height, position }`, all four required. */
function checkImage(image: unknown, path: string, errors: string[]): void {
  if (!isObject(image)) {
    errors.push(`${path}: must be an object`);
    return;
  }
  unknownKeys(image, ["handle", "width", "height", "position"], path, errors);
  if (!(typeof image.handle === "string" && image.handle.startsWith(HANDLE_PREFIX))) {
    errors.push(`${path}.handle: must be a string starting with ${HANDLE_PREFIX}`);
  }
  checkSize(image, path, errors);
  checkPosition(image.position, `${path}.position`, errors);
}

/** Checks the required `width` and `height` of a floating image or an image placeholder. */
function checkSize(element: JsonObject, path: string, errors: string[]): void {
  for (const key of ["width", "height"]) {
    if (!isPositive(element[key])) errors.push(`${path}.${key}: must be a number greater than 0`);
  }
}

/** Checks that `image_labels` is present exactly when `images` is, with one entry per floating image. */
function checkImageLabels(file: JsonObject, errors: string[]): void {
  const labels = file.image_labels;
  if (file.images === undefined) {
    if (labels !== undefined) errors.push("image_labels: not allowed without images");
    return;
  }
  if (labels === undefined) {
    errors.push("image_labels: required when images is present");
    return;
  }
  if (!Array.isArray(labels)) {
    errors.push("image_labels: must be an array");
    return;
  }
  const images = Array.isArray(file.images) ? file.images : [];
  if (labels.length !== images.length) {
    errors.push(`image_labels: has ${labels.length} entries, images has ${images.length}`);
  }
  labels.forEach((entry, index) => checkImageLabel(entry, images[index], `image_labels[${index}]`, errors));
}

/** Checks one `{ handle, template, label }` entry against the floating image at the same index. */
function checkImageLabel(entry: unknown, image: unknown, path: string, errors: string[]): void {
  if (!isObject(entry)) {
    errors.push(`${path}: must be an object`);
    return;
  }
  unknownKeys(entry, ["handle", "template", "label"], path, errors);
  if (isObject(image) && entry.handle !== image.handle) {
    errors.push(`${path}.handle: must equal the handle of the floating image at the same index`);
  }
  if (!IMAGE_TEMPLATES.includes(entry.template as string)) {
    errors.push(`${path}.template: must be one of ${IMAGE_TEMPLATES.join(", ")}`);
  }
  if (!isNonEmptyString(entry.label)) errors.push(`${path}.label: must be a non-empty string`);
}

/** Reports every key of `object` that is not in `allowed`. */
function unknownKeys(object: JsonObject, allowed: string[], path: string, errors: string[]): void {
  for (const key of Object.keys(object)) {
    if (!allowed.includes(key)) errors.push(`${path === "" ? key : `${path}.${key}`}: unknown key`);
  }
}

/** True for a finite number. */
function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/** True for a finite number greater than 0. */
function isPositive(value: unknown): value is number {
  return isNumber(value) && value > 0;
}
