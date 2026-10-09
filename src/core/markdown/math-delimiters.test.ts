import { describe, expect, it } from "vitest";
import {
  hasMathDelimiter,
  joinMathBlocks,
  normalizeMathDelimiters,
} from "./math-delimiters";

describe("normalizeMathDelimiters", () => {
  it("rewrites inline \\( \\) to $$", () => {
    expect(normalizeMathDelimiters("so \\(a\\) here")).toBe("so $$a$$ here");
    expect(normalizeMathDelimiters("\\( 9 + 18 = \\mathbf{27} \\)")).toBe(
      "$$9 + 18 = \\mathbf{27}$$"
    );
  });

  it("rewrites \\[ \\] to a display block on its own lines", () => {
    expect(normalizeMathDelimiters("x \\[a\\] y")).toBe("x \n\n$$\na\n$$\n\n y");
  });

  it("leaves fenced code untouched, including an unclosed fence", () => {
    const fenced = "```\n\\(a\\)\n```";
    expect(normalizeMathDelimiters(fenced)).toBe(fenced);
    const open = "~~~tex\n\\[a\\]";
    expect(normalizeMathDelimiters(open)).toBe(open);
  });

  it("leaves inline code untouched but converts maths next to it", () => {
    expect(normalizeMathDelimiters("`\\(a\\)` and \\(b\\)")).toBe("`\\(a\\)` and $$b$$");
  });

  it("leaves unclosed delimiters exactly as written", () => {
    for (const text of ["half \\(2 \\times", "half \\[ x", "ok \\(a\\) then \\(b"]) {
      const out = normalizeMathDelimiters(text);
      expect(out.endsWith(text.slice(text.lastIndexOf("\\")))).toBe(true);
    }
    expect(normalizeMathDelimiters("half \\(2 \\times")).toBe("half \\(2 \\times");
  });

  it("leaves currency and escaped backslashes untouched", () => {
    expect(normalizeMathDelimiters("$5 and $10")).toBe("$5 and $10");
    expect(normalizeMathDelimiters("a \\\\(b\\\\)")).toBe("a \\\\(b\\\\)");
  });
});

describe("hasMathDelimiter", () => {
  it("detects maths delimiters only", () => {
    expect(hasMathDelimiter("\\(a\\)")).toBe(true);
    expect(hasMathDelimiter("$$a$$")).toBe(true);
    expect(hasMathDelimiter("$5 and $10")).toBe(false);
  });
});

describe("joinMathBlocks", () => {
  it("keeps a display block with blank lines as one block", () => {
    const tokens = [
      { type: "paragraph", raw: "$$\na\n" },
      { type: "space", raw: "\n" },
      { type: "paragraph", raw: "b\n$$\n\n" },
      { type: "paragraph", raw: "after" },
    ];
    expect(joinMathBlocks(tokens)).toEqual(["$$\na\n\nb\n$$\n\n", "after"]);
  });
});
