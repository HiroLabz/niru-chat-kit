import { describe, expect, it } from "vitest";
import { isQuestionInterrupt, replyEndsWithQuestion } from "./question";

describe("isQuestionInterrupt", () => {
  it("is true for any pause but an approval", () => {
    expect(isQuestionInterrupt({ kind: "clarify", question: "Where?" })).toBe(true);
    expect(isQuestionInterrupt({ kind: "ask_user", question: "Where?" })).toBe(true);
    expect(isQuestionInterrupt({ kind: "tool_approval", question: "Approve?" })).toBe(false);
    expect(isQuestionInterrupt(null)).toBe(false);
  });
});

describe("replyEndsWithQuestion", () => {
  it("matches a reply that ends with the question, ignoring case, markdown and spacing", () => {
    expect(replyEndsWithQuestion("Quick check.\n\n**Where will you be staying?**", "Where will you be  staying?")).toBe(true);
    expect(replyEndsWithQuestion("Where will you be staying", "Where will you be staying?")).toBe(true);
  });
  it("does not match a reply that only mentions it, or an empty one", () => {
    expect(replyEndsWithQuestion("Where will you be staying? I ask so I can plan.", "Where will you be staying?")).toBe(false);
    expect(replyEndsWithQuestion("", "Where?")).toBe(false);
    expect(replyEndsWithQuestion(undefined, "Where?")).toBe(false);
    expect(replyEndsWithQuestion("Hello", "")).toBe(false);
  });
});
