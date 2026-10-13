import { describe, expect, it } from "vitest";
import { applyMention, matchMentions, mentionQuery, mentionsIn, type ComposerMention } from "./mentions";

const items: ComposerMention[] = [
  { id: "gmail", label: "Gmail", description: "Read and send email", group: "Apps", keywords: ["mail"] },
  { id: "cal", label: "Calendar", description: "Your events", group: "Apps" },
  { id: "files", label: "Read file", description: "Open a file", group: "Niru" },
  { id: "ann", label: "Ann", group: "People" },
  { id: "anna", label: "Anna", group: "People" },
  { id: "jp", label: "日本語ツール" },
];

describe("mentionQuery", () => {
  it("finds an @ at the start of the text", () => {
    expect(mentionQuery("@gm", 3)).toEqual({ query: "gm", start: 0, end: 3 });
    expect(mentionQuery("@", 1)).toEqual({ query: "", start: 0, end: 1 });
  });

  it("finds an @ after a space or a newline, and takes the nearest one", () => {
    expect(mentionQuery("hello @ca", 9)).toEqual({ query: "ca", start: 6, end: 9 });
    expect(mentionQuery("line one\n@ca", 12)).toEqual({ query: "ca", start: 9, end: 12 });
    expect(mentionQuery("@gmail then @ca", 15)).toEqual({ query: "ca", start: 12, end: 15 });
  });

  it("ignores an email address and an @ inside a word", () => {
    expect(mentionQuery("write to me@example.com", 23)).toBeNull();
    expect(mentionQuery("a@b", 3)).toBeNull();
    expect(mentionQuery("me@", 3)).toBeNull();
  });

  it("does not reach back over a line break or past an invalid @", () => {
    expect(mentionQuery("@gm\nnext line", 13)).toBeNull();
    expect(mentionQuery("@x foo@bar", 10)).toBeNull();
  });

  it("is null without an @, or when whitespace follows it directly", () => {
    expect(mentionQuery("plain text", 5)).toBeNull();
    expect(mentionQuery("@ later", 7)).toBeNull();
  });

  it("uses the text up to the caret and takes the rest of the word into the range", () => {
    expect(mentionQuery("hi @calendar there", 7)).toEqual({ query: "cal", start: 3, end: 12 });
    expect(mentionQuery("hi @ca", 0)).toBeNull();
  });

  it("keeps spaces in the query for labels that have them", () => {
    expect(mentionQuery("ask @Read fi", 12)).toEqual({ query: "Read fi", start: 4, end: 12 });
  });

  it("works with non-Latin text", () => {
    expect(mentionQuery("你好 @日本", 6)).toEqual({ query: "日本", start: 3, end: 6 });
    expect(mentionQuery("你好@日", 4)).toBeNull();
  });
});

describe("matchMentions", () => {
  it("returns everything for an empty query, grouped in first-seen order", () => {
    expect(matchMentions(items, "").map((item) => item.id)).toEqual(["gmail", "cal", "files", "ann", "anna", "jp"]);
  });

  it("matches label, keywords and description case-insensitively, label first", () => {
    expect(matchMentions(items, "MAIL").map((item) => item.id)).toEqual(["gmail"]);
    expect(matchMentions(items, "file").map((item) => item.id)).toEqual(["files"]);
    expect(matchMentions(items, "events").map((item) => item.id)).toEqual(["cal"]);
    expect(matchMentions(items, "zzz")).toEqual([]);
  });

  it("keeps items of one group together", () => {
    const mixed: ComposerMention[] = [
      { id: "a1", label: "Alpha", group: "A" },
      { id: "b1", label: "Alps", group: "B" },
      { id: "a2", label: "Also", group: "A" },
    ];
    expect(matchMentions(mixed, "al").map((item) => item.id)).toEqual(["a1", "a2", "b1"]);
  });

  it("finds a non-Latin label", () => {
    expect(matchMentions(items, "日本").map((item) => item.id)).toEqual(["jp"]);
  });
});

describe("applyMention", () => {
  it("replaces the @query with @Label and a space, caret after it", () => {
    expect(applyMention("hi @ca", { start: 3, end: 6 }, items[1])).toEqual({ value: "hi @Calendar ", caret: 13 });
  });

  it("replaces the rest of the word when the caret was in the middle", () => {
    expect(applyMention("hi @calen now", { start: 3, end: 9 }, items[1])).toEqual({ value: "hi @Calendar now", caret: 13 });
  });

  it("does not double an existing space", () => {
    expect(applyMention("@g later", { start: 0, end: 2 }, items[0])).toEqual({ value: "@Gmail later", caret: 7 });
  });

  it("writes labels with spaces and non-Latin labels as given", () => {
    expect(applyMention("@Read f", { start: 0, end: 7 }, items[2])).toEqual({ value: "@Read file ", caret: 11 });
    expect(applyMention("@日", { start: 0, end: 2 }, items[5]).value).toBe("@日本語ツール ");
  });
});

describe("mentionsIn", () => {
  it("returns the items still in the text, in the order they appear, once each", () => {
    expect(mentionsIn("use @Gmail and @Calendar then @Gmail", items).map((item) => item.id)).toEqual(["gmail", "cal"]);
    expect(mentionsIn("@Calendar first, @Gmail", items).map((item) => item.id)).toEqual(["cal", "gmail"]);
  });

  it("drops one that was edited away or only partly kept", () => {
    expect(mentionsIn("use @Gmai please", items)).toEqual([]);
    expect(mentionsIn("use Gmail please", items)).toEqual([]);
  });

  it("counts whole tokens only", () => {
    expect(mentionsIn("hi @Anna", items).map((item) => item.id)).toEqual(["anna"]);
    expect(mentionsIn("mail@Ann", items)).toEqual([]);
    expect(mentionsIn("@Annabelle", items)).toEqual([]);
  });

  it("allows closing punctuation, brackets before, labels with spaces and non-Latin labels", () => {
    expect(mentionsIn("ask (@Ann), then @Read file.", items).map((item) => item.id)).toEqual(["ann", "files"]);
    expect(mentionsIn("你好 @日本語ツール で", items).map((item) => item.id)).toEqual(["jp"]);
  });

  it("finds a later whole token after an earlier partial one", () => {
    expect(mentionsIn("@Annabelle and @Ann", items).map((item) => item.id)).toEqual(["ann"]);
  });
});
