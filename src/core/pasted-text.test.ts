import { describe, expect, it } from "vitest";
import { isLongPaste, pastedTextTitle } from "./pasted-text";

describe("isLongPaste", () => {
  it("is long at 2000 characters or 40 lines by default, and not below", () => {
    expect(isLongPaste("a".repeat(1999))).toBe(false);
    expect(isLongPaste("a".repeat(2000))).toBe(true);
    expect(isLongPaste(Array(39).fill("x").join("\n"))).toBe(false);
    expect(isLongPaste(Array(40).fill("x").join("\n"))).toBe(true);
  });

  it("does not count one trailing line break, and counts CRLF as one", () => {
    expect(isLongPaste(Array(39).fill("x").join("\n") + "\n")).toBe(false);
    expect(isLongPaste(Array(40).fill("x").join("\r\n"))).toBe(true);
  });

  it("takes either limit from the threshold", () => {
    expect(isLongPaste("hello world", { characters: 11 })).toBe(true);
    expect(isLongPaste("hello world", { characters: 12 })).toBe(false);
    expect(isLongPaste("a\nb\nc", { lines: 3 })).toBe(true);
    expect(isLongPaste("a\nb\nc", { lines: 4 })).toBe(false);
    expect(isLongPaste("a".repeat(100), { lines: 2 })).toBe(false);
  });
});

describe("pastedTextTitle", () => {
  it("is the first non-empty line, trimmed", () => {
    expect(pastedTextTitle("\n\n   Dear team,  \nsecond")).toBe("Dear team,");
  });

  it("cuts a long first line with an ellipsis", () => {
    const title = pastedTextTitle("w".repeat(200));
    expect(title.length).toBeLessThanOrEqual(80);
    expect(title.endsWith("…")).toBe(true);
  });

  it("is empty for empty or blank text", () => {
    expect(pastedTextTitle("")).toBe("");
    expect(pastedTextTitle("  \n \n")).toBe("");
  });
});
