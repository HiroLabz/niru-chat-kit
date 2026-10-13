import { describe, expect, it } from "vitest";
import { applySlashCommand, matchSlashCommands, slashQuery, type SlashCommand } from "./slash-commands";

describe("slashQuery", () => {
  it("opens on a lone slash and on a typed name", () => {
    expect(slashQuery("/", 1)).toEqual({ query: "", start: 0, end: 1 });
    expect(slashQuery("/sum", 4)).toEqual({ query: "sum", start: 0, end: 4 });
  });

  it("stays open with the caret inside the token", () => {
    expect(slashQuery("/summarize", 4)).toEqual({ query: "summarize", start: 0, end: 10 });
  });

  it("ignores a slash in the middle of a sentence, a URL or a path", () => {
    expect(slashQuery("this and/or that", 8)).toBeNull();
    expect(slashQuery("see https://example.com/docs", 28)).toBeNull();
    expect(slashQuery("hello /sum", 10)).toBeNull();
    expect(slashQuery("a/b", 3)).toBeNull();
  });

  it("allows leading spaces and newlines before the slash", () => {
    expect(slashQuery("  /sum", 6)).toEqual({ query: "sum", start: 2, end: 6 });
    expect(slashQuery("\n/sum", 5)).toEqual({ query: "sum", start: 1, end: 5 });
  });

  it("is closed with the caret before the slash or at the very start", () => {
    expect(slashQuery("/sum", 0)).toBeNull();
    expect(slashQuery("  /sum", 2)).toBeNull();
    expect(slashQuery("  /sum", 1)).toBeNull();
  });

  it("ends the command at the first whitespace", () => {
    expect(slashQuery("/sum this", 4)).toEqual({ query: "sum", start: 0, end: 4 });
    expect(slashQuery("/sum this", 5)).toBeNull();
    expect(slashQuery("/sum this", 9)).toBeNull();
    expect(slashQuery("/sum\nnext", 7)).toBeNull();
  });

  it("is closed for empty text, blank text and a plain message", () => {
    expect(slashQuery("", 0)).toBeNull();
    expect(slashQuery("   ", 3)).toBeNull();
    expect(slashQuery("hello", 5)).toBeNull();
  });

  it("keeps the case and unicode of the query", () => {
    expect(slashQuery("/Résumé", 7)).toEqual({ query: "Résumé", start: 0, end: 7 });
    expect(slashQuery("/概要", 3)).toEqual({ query: "概要", start: 0, end: 3 });
  });
});

describe("matchSlashCommands", () => {
  const commands: SlashCommand[] = [
    { id: "1", name: "summarize", description: "Short version of a text", keywords: ["tldr"] },
    { id: "2", name: "translate", description: "Into another language" },
    { id: "3", name: "resume", description: "Write a CV", keywords: ["summary"] },
    { id: "4", name: "sum-up", disabled: true },
    { id: "5", name: "Résumé" },
    { id: "6", name: "概要" },
  ];
  const ids = (list: SlashCommand[]) => list.map((command) => command.id);

  it("returns every command in the given order for an empty query", () => {
    expect(ids(matchSlashCommands(commands, ""))).toEqual(["1", "2", "3", "4", "5", "6"]);
    expect(matchSlashCommands(commands, "")).not.toBe(commands);
  });

  it("ranks prefix matches, then name matches, then keyword and description matches", () => {
    expect(ids(matchSlashCommands(commands, "sum"))).toEqual(["1", "4", "3", "5"]);
    expect(ids(matchSlashCommands(commands, "esum"))).toEqual(["3"]);
    expect(ids(matchSlashCommands(commands, "language"))).toEqual(["2"]);
    expect(ids(matchSlashCommands(commands, "tldr"))).toEqual(["1"]);
  });

  it("is case-insensitive in both directions", () => {
    expect(ids(matchSlashCommands(commands, "SUM"))).toEqual(["1", "4", "3", "5"]);
    expect(ids(matchSlashCommands(commands, "résumé"))).toEqual(["5"]);
  });

  it("keeps the given order inside each rank", () => {
    const list: SlashCommand[] = [
      { id: "b", name: "beta-x" },
      { id: "a", name: "alpha-x" },
      { id: "c", name: "x-ray" },
    ];
    expect(ids(matchSlashCommands(list, "x"))).toEqual(["c", "b", "a"]);
  });

  it("keeps disabled commands in place by rank, neither promoted nor hidden", () => {
    const list: SlashCommand[] = [
      { id: "d", name: "do-it", disabled: true },
      { id: "e", name: "redo" },
      { id: "f", name: "doit-now" },
    ];
    expect(ids(matchSlashCommands(list, "do"))).toEqual(["d", "f", "e"]);
  });

  it("matches unicode names and returns nothing for no match or an empty list", () => {
    expect(ids(matchSlashCommands(commands, "概"))).toEqual(["6"]);
    expect(matchSlashCommands(commands, "zzz")).toEqual([]);
    expect(matchSlashCommands([], "a")).toEqual([]);
    expect(matchSlashCommands([], "")).toEqual([]);
  });
});

describe("applySlashCommand", () => {
  const template: SlashCommand = { id: "t", name: "sum", insert: "Summarize this: " };
  const action: SlashCommand = { id: "a", name: "clear" };

  it("replaces the token with the template and puts the caret after it", () => {
    expect(applySlashCommand("/su", { start: 0, end: 3 }, template)).toEqual({
      text: "Summarize this: ",
      caret: 16,
    });
  });

  it("keeps text after the token and a leading space before it", () => {
    expect(applySlashCommand("  /su rest", { start: 2, end: 5 }, template)).toEqual({
      text: "  Summarize this:  rest",
      caret: 18,
    });
  });

  it("removes the token for an action and trims the space it leaves", () => {
    expect(applySlashCommand("/clear", { start: 0, end: 6 }, action)).toEqual({ text: "", caret: 0 });
    expect(applySlashCommand("/clear keep this", { start: 0, end: 6 }, action)).toEqual({ text: "keep this", caret: 0 });
    expect(applySlashCommand("  /clear", { start: 2, end: 8 }, action)).toEqual({ text: "", caret: 0 });
  });

  it("treats an empty insert as an action", () => {
    expect(applySlashCommand("/x", { start: 0, end: 2 }, { id: "e", name: "x", insert: "" })).toEqual({ text: "", caret: 0 });
  });
});
