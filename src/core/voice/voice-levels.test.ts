import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createLevels, followLevels } from "./voice-levels";
import { formatCallDuration, summariseCall } from "./voice-summary";

let pending: Map<number, FrameRequestCallback>;
let next: number;
const runFrame = () => {
  const due = [...pending.values()];
  pending.clear();
  due.forEach((callback) => callback(0));
};

beforeEach(() => {
  pending = new Map();
  next = 1;
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    pending.set(next, callback);
    return next++;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => pending.delete(id));
});
afterEach(() => vi.unstubAllGlobals());

describe("followLevels", () => {
  it("eases toward the level in animation frames and stops asking for frames at rest", () => {
    const levels = createLevels();
    const seen: number[] = [];
    const stop = followLevels({ levels, source: "agent", onLevel: (level) => seen.push(level) });
    levels.set({ agent: 1 });
    for (let index = 0; index < 60 && pending.size > 0; index += 1) runFrame();
    expect(seen.at(-1)).toBe(1);
    expect(seen[1]).toBeLessThan(1);
    expect(pending.size).toBe(0);
    stop();
  });

  it("holds at zero for the none source and cancels its frame and subscription on stop", () => {
    const levels = createLevels();
    const seen: number[] = [];
    const stop = followLevels({ levels, source: "none", onLevel: (level) => seen.push(level) });
    levels.set({ you: 1, agent: 1 });
    runFrame();
    expect(Math.max(...seen)).toBe(0);
    levels.set({ you: 0.5 });
    stop();
    expect(pending.size).toBe(0);
  });
});

describe("createLevels", () => {
  it("clamps to 0..1 and tells listeners", () => {
    const levels = createLevels();
    const listener = vi.fn();
    const off = levels.subscribe(listener);
    levels.set({ you: 3, agent: -1 });
    expect(levels.get()).toEqual({ you: 1, agent: 0 });
    off();
    levels.set({ you: 0.2 });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe("call summary", () => {
  it("keeps settled lines and measures the duration", () => {
    const line = (id: string, final: boolean) => ({ id, speaker: "user" as const, text: id, final, at: 0 });
    const summary = summariseCall({ transcript: [line("a", true), line("b", false)], startedAt: 1000, endedAt: 248000 });
    expect(summary.transcript.map((item) => item.id)).toEqual(["a"]);
    expect(summary.durationMs).toBe(247000);
    expect(formatCallDuration(summary.durationMs)).toBe("4:07");
    expect(formatCallDuration(3723000)).toBe("1:02:03");
    expect(summariseCall({ transcript: [], startedAt: null, endedAt: null }).durationMs).toBe(0);
  });
});
