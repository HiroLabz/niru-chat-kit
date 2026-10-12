import { describe, expect, it } from "vitest";
import { filterSaved, sortSavedNewestFirst, splitPinned } from "./saved-items";

describe("sortSavedNewestFirst", () => {
  it("puts the newest first, keeps ties in order, sends unreadable times last, and does not mutate", () => {
    const list = [
      { id: "a", at: 1000 },
      { id: "b", at: "2026-01-02T00:00:00Z" },
      { id: "c", at: 1000 },
      { id: "d", at: "nonsense" },
      { id: "e", at: new Date("2026-03-01T00:00:00Z") },
    ];
    const copy = [...list];
    expect(sortSavedNewestFirst(list).map((item) => item.id)).toEqual(["e", "b", "a", "c", "d"]);
    expect(list).toEqual(copy);
  });
});

describe("filterSaved", () => {
  const list = [
    { title: "Refund policy", text: undefined },
    { title: "Trip", text: "Book the FERRY early" },
  ];
  it("matches title or text, ignoring case, and keeps everything for a blank query", () => {
    expect(filterSaved(list, "refund")).toHaveLength(1);
    expect(filterSaved(list, "ferry")).toEqual([list[1]]);
    expect(filterSaved(list, "  ")).toHaveLength(2);
    expect(filterSaved(list, "zzz")).toEqual([]);
  });
});

describe("splitPinned", () => {
  it("splits and keeps each side's order", () => {
    const { pinned, rest } = splitPinned([
      { id: "1" },
      { id: "2", pinned: true },
      { id: "3" },
      { id: "4", pinned: true },
    ]);
    expect(pinned.map((item) => item.id)).toEqual(["2", "4"]);
    expect(rest.map((item) => item.id)).toEqual(["1", "3"]);
  });
});
