/**
 * A small, closed JSX reader for model-written markup. It parses tags, attributes and
 * text and nothing else: no expression is ever evaluated, no script runs, and anything
 * outside the caller's allowlist and a fixed set of plain HTML tags comes out as inert text.
 */

export const SAFE_HTML_TAGS: ReadonlySet<string> = new Set([
  "p", "span", "div", "strong", "em", "ul", "ol", "li", "h1", "h2", "h3", "h4",
  "code", "pre", "table", "thead", "tbody", "tr", "th", "td", "br", "hr",
]);

const VOID_TAGS: ReadonlySet<string> = new Set(["br", "hr"]);
const HTML_ATTRIBUTES: ReadonlySet<string> = new Set(["className", "style", "title", "colSpan", "rowSpan"]);
const ATTRIBUTE_ALIASES: Readonly<Record<string, string>> = {
  class: "className",
  colspan: "colSpan",
  rowspan: "rowSpan",
};
const FORBIDDEN_ATTRIBUTES: ReadonlySet<string> = new Set([
  "dangerouslySetInnerHTML", "ref", "key", "children", "__proto__", "constructor", "prototype",
]);
const URL_ATTRIBUTE = /href|src|url|action|poster/i;
const UNSAFE_URL = /^(javascript|data|vbscript):/i;
const UNSAFE_STYLE_VALUE = /url\s*\(|expression\s*\(|javascript:|data:|@import|var\s*\(|[\\{}<>]/i;
const ATTRIBUTE_NAME = /^[A-Za-z_][A-Za-z0-9_:.-]*$/;
const TAG_NAME = /^[A-Za-z][A-Za-z0-9]*/;
const MAX_NODES = 2000;
const MAX_DEPTH = 40;
const MAX_SPAN = 1000;
const ENTITIES: Readonly<Record<string, string>> = {
  "&lt;": "<", "&gt;": ">", "&amp;": "&", "&quot;": '"', "&#39;": "'", "&nbsp;": "\u00a0",
};

export type AttributeValue = string | number | boolean;
export type RawAttribute = { name: string; value: AttributeValue | undefined };

export type JsxNode =
  | { type: "text"; text: string }
  | { type: "element"; name: string; component: boolean; props: Record<string, AttributeValue | Record<string, string>>; children: JsxNode[] };

type Token =
  | { kind: "text"; text: string }
  | { kind: "open"; name: string; attributes: RawAttribute[]; selfClosing: boolean; raw: string }
  | { kind: "close"; name: string; raw: string };

function decode(text: string): string {
  return text.replace(/&(?:lt|gt|amp|quot|#39|nbsp);/g, (entity) => ENTITIES[entity] ?? entity);
}

/** Reads a `{...}` value to its matching brace, skipping quoted strings; null when unbalanced. */
function readBraces(source: string, start: number): { body: string; end: number } | null {
  let depth = 0;
  let quote: string | null = null;
  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (char === "\\") index += 1;
      else if (char === quote) quote = null;
    } else if (char === '"' || char === "'" || char === "`") quote = char;
    else if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) return { body: source.slice(start + 1, index), end: index + 1 };
    }
  }
  return null;
}

/** Only a bare number, boolean or plain string literal is accepted; anything else is an expression and is dropped. */
function readLiteral(body: string): AttributeValue | undefined {
  const text = body.trim();
  if (/^-?\d+(\.\d+)?$/.test(text)) return Number(text);
  if (text === "true") return true;
  if (text === "false") return false;
  const quoted = /^(["'])([^"'\\`$]*)\1$/.exec(text);
  return quoted ? quoted[2] : undefined;
}

function readTag(source: string, start: number): { token: Token; end: number } | null {
  const closing = source[start + 1] === "/";
  const nameStart = start + (closing ? 2 : 1);
  const name = TAG_NAME.exec(source.slice(nameStart))?.[0];
  if (!name) return null;
  let index = nameStart + name.length;
  if (closing) {
    while (/\s/.test(source[index] ?? "")) index += 1;
    if (source[index] !== ">") return null;
    return { token: { kind: "close", name, raw: source.slice(start, index + 1) }, end: index + 1 };
  }
  const attributes: RawAttribute[] = [];
  while (index < source.length) {
    while (/\s/.test(source[index] ?? "")) index += 1;
    if (source[index] === ">") {
      return { token: { kind: "open", name, attributes, selfClosing: false, raw: source.slice(start, index + 1) }, end: index + 1 };
    }
    if (source[index] === "/" && source[index + 1] === ">") {
      return { token: { kind: "open", name, attributes, selfClosing: true, raw: source.slice(start, index + 2) }, end: index + 2 };
    }
    const attributeName = /^[^\s=/>]+/.exec(source.slice(index))?.[0];
    if (!attributeName) return null;
    index += attributeName.length;
    while (/\s/.test(source[index] ?? "")) index += 1;
    let value: AttributeValue | undefined = true;
    if (source[index] === "=") {
      index += 1;
      while (/\s/.test(source[index] ?? "")) index += 1;
      const lead = source[index];
      if (lead === '"' || lead === "'") {
        const close = source.indexOf(lead, index + 1);
        if (close < 0) return null;
        value = decode(source.slice(index + 1, close));
        index = close + 1;
      } else if (lead === "{") {
        const braces = readBraces(source, index);
        if (!braces) return null;
        value = readLiteral(braces.body);
        index = braces.end;
      } else {
        const bare = /^[^\s>]+/.exec(source.slice(index))?.[0] ?? "";
        value = decode(bare);
        index += bare.length;
      }
    }
    attributes.push({ name: attributeName, value });
  }
  return null;
}

function tokenize(source: string, isStreaming: boolean): Token[] {
  const tokens: Token[] = [];
  let index = 0;
  let text = "";
  const flush = () => {
    if (text) tokens.push({ kind: "text", text: decode(text) });
    text = "";
  };
  while (index < source.length) {
    if (source[index] !== "<") {
      text += source[index];
      index += 1;
      continue;
    }
    const tag = readTag(source, index);
    if (tag) {
      flush();
      tokens.push(tag.token);
      index = tag.end;
    } else if (isStreaming && source.indexOf(">", index) < 0) {
      break;
    } else {
      text += "<";
      index += 1;
    }
  }
  flush();
  return tokens;
}

/** Turns `style="a: b; c: d"` into a style object, dropping any declaration that could load or run something. */
export function parseStyle(value: string): Record<string, string> {
  const style: Record<string, string> = {};
  for (const declaration of value.split(";")) {
    const colon = declaration.indexOf(":");
    if (colon < 0) continue;
    const property = declaration.slice(0, colon).trim();
    const setting = declaration.slice(colon + 1).trim();
    if (!/^[a-zA-Z-]+$/.test(property) || !setting || UNSAFE_STYLE_VALUE.test(setting)) continue;
    const camel = property.replace(/-([a-z])/g, (_match, letter: string) => letter.toUpperCase());
    style[camel] = setting;
  }
  return style;
}

function span(value: AttributeValue): number | undefined {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= MAX_SPAN ? parsed : undefined;
}

function sanitizeProps(component: boolean, attributes: RawAttribute[]): Record<string, AttributeValue | Record<string, string>> {
  const props: Record<string, AttributeValue | Record<string, string>> = {};
  for (const { name: rawName, value } of attributes) {
    if (value === undefined || !ATTRIBUTE_NAME.test(rawName) || /^on/i.test(rawName)) continue;
    const name = ATTRIBUTE_ALIASES[rawName] ?? rawName;
    if (FORBIDDEN_ATTRIBUTES.has(name) || (!component && !HTML_ATTRIBUTES.has(name))) continue;
    if (name === "style") {
      if (typeof value === "string") props.style = parseStyle(value);
    } else if (name === "colSpan" || name === "rowSpan") {
      const parsed = span(value);
      if (parsed !== undefined) props[name] = parsed;
    } else if (typeof value === "string" && URL_ATTRIBUTE.test(name) && UNSAFE_URL.test(value.replace(/[\s\u0000-\u001f]/g, ""))) {
      continue;
    } else {
      props[name] = value;
    }
  }
  return props;
}

/** Builds the node tree for `source`; `allowed` lists the component names the caller permits. */
export function parseJsx(source: string, allowed: ReadonlySet<string>, isStreaming = false): JsxNode[] {
  const root: JsxNode[] = [];
  const stack: Array<{ name: string; children: JsxNode[] }> = [{ name: "", children: root }];
  let nodes = 0;
  const current = () => stack[stack.length - 1].children;
  const pushText = (text: string) => {
    if (!text) return;
    const siblings = current();
    const last = siblings[siblings.length - 1];
    if (last?.type === "text") last.text += text;
    else siblings.push({ type: "text", text });
  };

  for (const token of tokenize(source, isStreaming)) {
    nodes += 1;
    if (nodes > MAX_NODES) break;
    if (token.kind === "text") {
      pushText(token.text);
    } else if (token.kind === "close") {
      let depth = stack.length - 1;
      while (depth > 0 && stack[depth].name !== token.name) depth -= 1;
      if (depth > 0) stack.length = depth;
      else pushText(token.raw);
    } else {
      const component = allowed.has(token.name);
      if (!component && !SAFE_HTML_TAGS.has(token.name)) {
        pushText(token.raw);
        continue;
      }
      const opens = !token.selfClosing && !(VOID_TAGS.has(token.name) && !component);
      if (opens && stack.length > MAX_DEPTH) {
        pushText(token.raw);
        continue;
      }
      const element: JsxNode = { type: "element", name: token.name, component, props: sanitizeProps(component, token.attributes), children: [] };
      current().push(element);
      if (opens) stack.push({ name: token.name, children: element.children });
    }
  }
  return root;
}
