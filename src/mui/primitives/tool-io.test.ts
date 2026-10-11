import { describe, expect, it } from "vitest";
import { formatToolValue, tokenizeJson } from "./tool-io";

describe("formatToolValue", () => {
  it("keeps strings and pretty-prints the rest", () => {
    expect(formatToolValue("hi")).toEqual({ text: "hi", json: false });
    expect(formatToolValue({ a: [1] })).toEqual({ text: '{\n  "a": [\n    1\n  ]\n}', json: true });
    expect(formatToolValue(7)).toEqual({ text: "7", json: true });
  });
  it("falls back to text for a value JSON cannot hold", () => {
    expect(formatToolValue(undefined).json).toBe(false);
    const loop: Record<string, unknown> = {};
    loop.self = loop;
    expect(formatToolValue(loop).json).toBe(false);
  });
});

describe("tokenizeJson", () => {
  it("round-trips the text and classifies the runs", () => {
    const text = JSON.stringify({ k: "v:1", n: -2.5e3, f: false, z: null }, null, 2);
    const tokens = tokenizeJson(text);
    expect(tokens.map((t) => t.text).join("")).toBe(text);
    const kinds = (kind: string) => tokens.filter((t) => t.kind === kind).map((t) => t.text);
    expect(kinds("key")).toEqual(['"k"', '"n"', '"f"', '"z"']);
    expect(kinds("string")).toEqual(['"v:1"']);
    expect(kinds("number")).toEqual(["-2500"]);
    expect(kinds("literal")).toEqual(["false", "null"]);
  });
});
