/** Saved chats and messages, and pinned conversations: the pure sorting and filtering. No UI library. */

import type { ConversationTime } from "./conversation-groups";

/** What was saved: a whole conversation, or one message inside a conversation. */
export type SavedKind = "conversation" | "message";

/** One saved chat or saved message. The app keeps these; the kit only draws and reports them. */
export type SavedItem = {
  id: string;
  kind: SavedKind;
  /** The conversation the item belongs to (for a saved chat, the chat itself). */
  conversationId: string;
  /** The saved message; set when `kind` is "message". */
  messageId?: string;
  /** The chat's title, or for a message the title of the chat it came from. */
  title: string;
  /** The message text, for a one-line preview. */
  text?: string;
  /** When it was saved. */
  at: string | number | Date;
};

function time(at: ConversationTime): number {
  if (at === null || at === undefined) return 0;
  const value = new Date(at).getTime();
  return Number.isNaN(value) ? 0 : value;
}

/** A copy of the list with the most recently saved first. Equal times keep their order; unreadable times go last. */
export function sortSavedNewestFirst<T extends { at: ConversationTime }>(items: readonly T[]): T[] {
  return items
    .map((item, index) => ({ item, index, at: time(item.at) }))
    .sort((a, b) => b.at - a.at || a.index - b.index)
    .map(({ item }) => item);
}

/** Saved items whose title or text contains the query, ignoring case. A blank query keeps everything. */
export function filterSaved<T extends { title?: string | null; text?: string | null }>(
  items: readonly T[],
  query: string
): T[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [...items];
  return items.filter(
    (item) => (item.title ?? "").toLowerCase().includes(needle) || (item.text ?? "").toLowerCase().includes(needle)
  );
}

/**
 * Splits a list into the pinned items and the rest. Each side keeps the order it came in,
 * so the pinned ones stay in the order the app listed them (pin order).
 */
export function splitPinned<T extends { pinned?: boolean }>(items: readonly T[]): { pinned: T[]; rest: T[] } {
  const pinned: T[] = [];
  const rest: T[] = [];
  for (const item of items) (item.pinned ? pinned : rest).push(item);
  return { pinned, rest };
}
