/**
 * Long pasted text in a message box. The box does not take a very long paste into its text
 * field: it hands the text to the app, which holds it and shows it as a chip. These are the
 * pure parts, so any skin and any app can use them.
 */

/** A long paste an app is holding for the person, drawn as a chip above the text field. */
export type ComposerPastedText = {
  id: string;
  text: string;
  /** The chip's title; default `pastedTextTitle(text)`. */
  title?: string;
};

/** A paste at or over either limit is long. */
export type LongPasteThreshold = { characters?: number; lines?: number };

export const DEFAULT_LONG_PASTE_CHARACTERS = 2000;
export const DEFAULT_LONG_PASTE_LINES = 40;

/** The number of lines in `text`, not counting one trailing line break. */
function lineCount(text: string): number {
  const trimmed = text.replace(/\r\n?/g, "\n").replace(/\n$/, "");
  return trimmed.split("\n").length;
}

/** True when `text` is at or over the character limit (default 2000) or the line limit (default 40). */
export function isLongPaste(text: string, threshold?: LongPasteThreshold): boolean {
  const characters = threshold?.characters ?? DEFAULT_LONG_PASTE_CHARACTERS;
  const lines = threshold?.lines ?? DEFAULT_LONG_PASTE_LINES;
  return text.length >= characters || lineCount(text) >= lines;
}

const TITLE_LIMIT = 80;

/** The first non-empty line of `text`, trimmed and cut with an ellipsis when long. Empty text gives "". */
export function pastedTextTitle(text: string): string {
  const line = text.split(/\r\n|\r|\n/).find((candidate) => candidate.trim().length > 0)?.trim() ?? "";
  return line.length > TITLE_LIMIT ? `${line.slice(0, TITLE_LIMIT - 1).trimEnd()}…` : line;
}
