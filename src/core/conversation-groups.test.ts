import { describe, expect, it } from "vitest";
import { conversationAgeGroup, filterConversations, groupConversationsByAge } from "./conversation-groups";

// Wednesday 15 July 2026, 15:00 local time.
const now = new Date(2026, 6, 15, 15, 0, 0);
const daysAgo = (n: number, hour = 9) => new Date(2026, 6, 15 - n, hour, 0, 0);

describe("conversationAgeGroup", () => {
  it.each([
    [daysAgo(0, 1), "today"],
    [daysAgo(0, 23), "today"],
    [daysAgo(1, 23), "yesterday"],
    [daysAgo(2), "previous7"],
    [daysAgo(7), "previous7"],
    [daysAgo(8), "previous30"],
    [daysAgo(30), "previous30"],
    [daysAgo(31), "older"],
    [new Date(2026, 6, 16), "today"],
    [null, "older"],
    [undefined, "older"],
    ["not a date", "older"],
  ] as const)("puts %s in %s", (at, expected) => {
    expect(conversationAgeGroup(at, now)).toBe(expected);
  });

  it("accepts ISO strings and epoch numbers", () => {
    expect(conversationAgeGroup(daysAgo(1).toISOString(), now)).toBe("yesterday");
    expect(conversationAgeGroup(daysAgo(0).getTime(), now)).toBe("today");
  });
});

describe("groupConversationsByAge", () => {
  it("returns only non-empty groups in age order, keeping item order", () => {
    const items = [
      { id: "old", at: daysAgo(90) },
      { id: "none" },
      { id: "t1", at: daysAgo(0) },
      { id: "y", at: daysAgo(1) },
      { id: "t2", at: daysAgo(0, 2) },
    ];
    const groups = groupConversationsByAge(items, now);
    expect(groups.map((g) => g.group)).toEqual(["today", "yesterday", "older"]);
    expect(groups[0].items.map((i) => i.id)).toEqual(["t1", "t2"]);
    expect(groups[2].items.map((i) => i.id)).toEqual(["old", "none"]);
  });

  it("returns nothing for an empty list", () => {
    expect(groupConversationsByAge([], now)).toEqual([]);
  });
});

describe("filterConversations", () => {
  const items = [
    { id: "1", title: "Refund Policy", preview: "how long" },
    { id: "2", title: null, preview: "Reset my PASSWORD" },
    { id: "3" },
  ];
  it("matches title and preview without regard to case", () => {
    expect(filterConversations(items, "refund").map((i) => i.id)).toEqual(["1"]);
    expect(filterConversations(items, "password").map((i) => i.id)).toEqual(["2"]);
  });
  it("keeps everything for a blank query and nothing for no match", () => {
    expect(filterConversations(items, "  ")).toHaveLength(3);
    expect(filterConversations(items, "zzz")).toEqual([]);
  });
});
