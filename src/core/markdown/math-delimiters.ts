/**
 * Pure pre-processing for maths in chat markdown. Models write `\( x \)` and
 * `\[ x \]`, but markdown treats `\(` / `\[` as escaped punctuation and the
 * delimiters vanish. `remark-math` only understands `$$`, so these are rewritten
 * to it before parsing. Single dollars are never maths ("$5 and $10" is text).
 */

/** True when the source contains something that may be a maths delimiter. */
export function hasMathDelimiter(source: string): boolean {
  return /\\\(|\\\[|\$\$/.test(source);
}

// Alternatives, in order: escaped backslash (consumed so `\\(` is not a
// delimiter), inline code span (not across a blank line), `\( … \)`, `\[ … \]`.
// An opening delimiter with no close matches nothing and is left as written,
// which is what a half-streamed reply needs.
const TOKEN =
  /\\\\|(`+)(?:(?!\n[ \t]*\n)[\s\S])*?\1|\\\(([\s\S]*?)\\\)|\\\[([\s\S]*?)\\\]/g;

function rewriteChunk(chunk: string): string {
  return chunk.replace(
    TOKEN,
    (match: string, _ticks: string | undefined, inline: string | undefined, display: string | undefined) => {
      if (inline !== undefined) {
        return inline.trim() === "" ? match : `$$${inline.trim()}$$`;
      }
      if (display !== undefined) {
        return display.trim() === "" ? match : `\n\n$$\n${display.trim()}\n$$\n\n`;
      }
      return match;
    }
  );
}

const FENCE = /^ {0,3}(`{3,}|~{3,})/;

/**
 * Rewrites `\( … \)` to `$$…$$` and `\[ … \]` to a `$$` display block, leaving
 * fenced code (including an unclosed fence still streaming) and inline code
 * spans untouched.
 */
export function normalizeMathDelimiters(source: string): string {
  if (!/\\[([]/.test(source)) return source;
  const lines = source.split("\n");
  const out: string[] = [];
  let chunk: string[] = [];
  let fence: string | null = null;

  const flush = () => {
    if (chunk.length > 0) out.push(rewriteChunk(chunk.join("\n")));
    chunk = [];
  };

  for (const line of lines) {
    const match = FENCE.exec(line);
    if (fence === null) {
      if (match) {
        flush();
        fence = match[1];
        out.push(line);
      } else {
        chunk.push(line);
      }
    } else {
      out.push(line);
      const closes = match && match[1][0] === fence[0] && match[1].length >= fence.length;
      if (closes && line.trim() === match[1]) fence = null;
    }
  }
  flush();
  return out.join("\n");
}

/**
 * Re-joins `marked` blocks so a `$$ … $$` display block with blank lines in it
 * stays one block: while the accumulated text holds an odd number of `$$`
 * (outside code tokens), the next block is merged in. An unclosed `$$` while
 * streaming therefore keeps growing the last block only.
 */
export function joinMathBlocks(tokens: { type: string; raw: string }[]): string[] {
  const blocks: string[] = [];
  let buffer = "";
  let open = false;
  for (const token of tokens) {
    buffer += token.raw;
    if (token.type !== "code") {
      const count = token.raw.split("$$").length - 1;
      if (count % 2 === 1) open = !open;
    }
    if (!open) {
      blocks.push(buffer);
      buffer = "";
    }
  }
  if (buffer !== "") blocks.push(buffer);
  return blocks;
}
