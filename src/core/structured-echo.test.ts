import { describe, expect, it } from "vitest";
import { isStructuredEcho } from "./structured-echo";

/**
 * Tickets 86d4aq124 and 86d4aq12d, reproduced on the dev server against the Rhysand
 * agent: with `letter_schema` set as the agent default, "Who is Shin" rendered the raw
 * `{"letter":"…"}` in the bubble AND the same content again in the schema block, which
 * read as a duplicate reply and as a schema firing unprompted.
 *
 * The risk in suppressing the bubble is suppressing a real one, so the negative cases
 * matter more than the positive: prose alongside a payload must survive.
 */
describe("isStructuredEcho", () => {
  const output = { letter: "I don't have enough context to identify which Shin you mean." };
  const echo = JSON.stringify(output);

  it("detects the serialised payload the shaped turn repeats", () => {
    expect(isStructuredEcho(echo, output, "applied")).toBe(true);
  });

  it("treats a repaired turn the same as an applied one", () => {
    expect(isStructuredEcho(echo, output, "repaired")).toBe(true);
  });

  it("ignores whitespace and key order the serialiser may differ on", () => {
    expect(isStructuredEcho(`\n  {"b":2,"a":1}  `, { a: 1, b: 2 }, "applied")).toBe(true);
  });

  it("keeps prose that merely accompanies a structured payload", () => {
    expect(isStructuredEcho("Here is the letter you asked for.", output, "applied")).toBe(false);
  });

  it("keeps text that is JSON but not this turn's payload", () => {
    expect(isStructuredEcho('{"letter":"something else"}', output, "applied")).toBe(false);
  });

  it("keeps the bubble when the schema never applied", () => {
    expect(isStructuredEcho(echo, output, "failed")).toBe(false);
    expect(isStructuredEcho(echo, output, "draft_not_applied")).toBe(false);
    expect(isStructuredEcho(echo, output, "none")).toBe(false);
    expect(isStructuredEcho(echo, output, undefined)).toBe(false);
  });

  it("keeps the bubble when there is no payload to render instead", () => {
    expect(isStructuredEcho(echo, null, "applied")).toBe(false);
    expect(isStructuredEcho(echo, {}, "applied")).toBe(false);
  });

  it("does not choke on text that only looks like JSON", () => {
    expect(isStructuredEcho("{not json", output, "applied")).toBe(false);
  });
});
