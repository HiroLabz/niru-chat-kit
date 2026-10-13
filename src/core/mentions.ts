/**
 * `@` mentions in a message box: type `@` at the start of the text or after whitespace and
 * a list opens, typing filters it, picking one writes `@Label ` into the text. The app
 * supplies the items; the kit ships none. Pure functions over text, so any skin can use them.
 */

import type { ReactNode } from "react";

export type ComposerMention = {
  id: string;
  /** Written after the `@` when picked, as given (spaces and non-Latin letters are fine). */
  label: string;
  description?: string;
  icon?: ReactNode;
  /** A heading the item is listed under, for example an app's name. */
  group?: string;
  /** Extra words that find this item. */
  keywords?: string[];
};

/** The mention being typed: the text after the `@` up to the caret, and the range of the whole `@word` to replace. */
export type MentionQuery = { query: string; start: number; end: number };

/** How far back from the caret an `@` can sit and still be the start of a mention. */
const MAX_QUERY_LENGTH = 64;
/** Characters that may come right before an `@` besides whitespace, so "(@tool)" and a quoted mention work. */
const OPENERS = new Set(["(", "[", "{", '"', "'"]);
/** Characters that may follow a finished mention besides whitespace. */
const CLOSERS = new Set([".", ",", ";", ":", "!", "?", ")", "]", "}", '"', "'"]);

function startsToken(text: string, at: number): boolean {
  if (at === 0) return true;
  const before = text[at - 1];
  return /\s/.test(before) || OPENERS.has(before);
}

/**
 * The mention being typed, or null. The `@` must be at the start of the text or right after
 * whitespace (so an email address, or an `@` inside a word, never counts), on the line the
 * caret is on, and the text between it and the caret must not start with whitespace. The
 * query may hold spaces (a label can); the app of this function decides when to give up.
 * `end` runs on over the rest of the word the caret is in, so a pick replaces all of it.
 */
export function mentionQuery(text: string, caret: number): MentionQuery | null {
  const at = Math.max(0, Math.min(caret, text.length));
  const floor = Math.max(0, at - MAX_QUERY_LENGTH);
  for (let i = at - 1; i >= floor; i -= 1) {
    const char = text[i];
    if (char === "\n" || char === "\r") return null;
    if (char !== "@") continue;
    if (!startsToken(text, i)) return null;
    const query = text.slice(i + 1, at);
    if (/^\s/.test(query)) return null;
    let end = at;
    while (end < text.length && !/\s/.test(text[end])) end += 1;
    return { query, start: i, end };
  }
  return null;
}

function rank(item: ComposerMention, needle: string): number {
  const label = item.label.toLowerCase();
  if (label.startsWith(needle)) return 0;
  if (label.includes(needle)) return 1;
  const extras = [...(item.keywords ?? []), item.description ?? ""];
  return extras.some((extra) => extra.toLowerCase().includes(needle)) ? 2 : -1;
}

/**
 * The items that match `query` (label first, then keywords and description; case-insensitive),
 * with items of one `group` kept together in the order their group first appears. An empty
 * query returns all of them.
 */
export function matchMentions(items: ComposerMention[], query: string): ComposerMention[] {
  const needle = query.toLowerCase();
  const ranked = needle
    ? items
        .map((item, index) => ({ item, index, rank: rank(item, needle) }))
        .filter((entry) => entry.rank >= 0)
        .sort((a, b) => a.rank - b.rank || a.index - b.index)
        .map((entry) => entry.item)
    : [...items];
  const order: (string | undefined)[] = [];
  for (const item of ranked) if (!order.includes(item.group)) order.push(item.group);
  return order.flatMap((group) => ranked.filter((item) => item.group === group));
}

/**
 * The text and caret after picking `item`: the `@query` word replaced by `@Label ` with the
 * caret after it. When a space already follows, it is reused rather than doubled.
 */
export function applyMention(
  text: string,
  range: { start: number; end: number },
  item: ComposerMention
): { value: string; caret: number } {
  const before = text.slice(0, range.start);
  const after = text.slice(range.end);
  const token = `@${item.label}`;
  if (after.startsWith(" ")) return { value: before + token + after, caret: before.length + token.length + 1 };
  return { value: `${before}${token} ${after}`, caret: before.length + token.length + 1 };
}

/**
 * The items whose `@Label` is still in `text` as a whole token (after the start or whitespace,
 * before the end, whitespace or closing punctuation), in the order they appear, once each.
 * "@Ann" does not count for the label "Anna", and "mail@Ann" does not count for "Ann".
 */
export function mentionsIn(text: string, items: ComposerMention[]): ComposerMention[] {
  const found: { item: ComposerMention; at: number }[] = [];
  for (const item of items) {
    const token = `@${item.label}`;
    let from = 0;
    for (;;) {
      const at = text.indexOf(token, from);
      if (at < 0) break;
      const next = text[at + token.length];
      if (startsToken(text, at) && (next === undefined || /\s/.test(next) || CLOSERS.has(next))) {
        found.push({ item, at });
        break;
      }
      from = at + 1;
    }
  }
  return found.sort((a, b) => a.at - b.at).map((entry) => entry.item);
}
