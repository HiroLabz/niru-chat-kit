/** Groups a conversation list by how long ago each one was active. No UI library. */

export type ConversationAgeGroup = "today" | "yesterday" | "previous7" | "previous30" | "older";

export const CONVERSATION_AGE_GROUPS: readonly ConversationAgeGroup[] = [
  "today",
  "yesterday",
  "previous7",
  "previous30",
  "older",
];

export const DEFAULT_AGE_GROUP_LABELS: Record<ConversationAgeGroup, string> = {
  today: "Today",
  yesterday: "Yesterday",
  previous7: "Previous 7 days",
  previous30: "Previous 30 days",
  older: "Older",
};

export type ConversationTime = string | number | Date | null | undefined;

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/**
 * Which group a time falls in, by calendar day against `now`: the same day is Today, the
 * day before Yesterday, then up to 7 and up to 30 days back. A missing or unreadable time
 * is Older; a time in the future counts as Today.
 */
export function conversationAgeGroup(at: ConversationTime, now: Date | number = Date.now()): ConversationAgeGroup {
  if (at === null || at === undefined) return "older";
  const date = new Date(at);
  if (Number.isNaN(date.getTime())) return "older";
  const today = startOfDay(new Date(now));
  const days = Math.round((today - startOfDay(date)) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days <= 7) return "previous7";
  if (days <= 30) return "previous30";
  return "older";
}

export type ConversationGroup<T> = { group: ConversationAgeGroup; items: T[] };

/** The non-empty groups in age order, each keeping the order its items came in. */
export function groupConversationsByAge<T extends { at?: ConversationTime }>(
  items: readonly T[],
  now: Date | number = Date.now()
): ConversationGroup<T>[] {
  const buckets = new Map<ConversationAgeGroup, T[]>();
  for (const item of items) {
    const group = conversationAgeGroup(item.at, now);
    const bucket = buckets.get(group);
    if (bucket) bucket.push(item);
    else buckets.set(group, [item]);
  }
  return CONVERSATION_AGE_GROUPS.filter((group) => buckets.has(group)).map((group) => ({
    group,
    items: buckets.get(group) ?? [],
  }));
}

/** Items whose title or preview contains the query, ignoring case. A blank query keeps everything. */
export function filterConversations<T extends { title?: string | null; preview?: string | null }>(
  items: readonly T[],
  query: string
): T[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [...items];
  return items.filter(
    (item) =>
      (item.title ?? "").toLowerCase().includes(needle) || (item.preview ?? "").toLowerCase().includes(needle)
  );
}
