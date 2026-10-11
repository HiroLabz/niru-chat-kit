import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { createLevels } from "../../core/voice/voice-levels";
import { frames, resetWorld, runFrames } from "./call-orb-test-kit";
import { VoiceLevelPill } from "./voice-level-pill";

beforeEach(() => resetWorld());
afterEach(() => vi.unstubAllGlobals());

const pill = () => screen.getByTestId("voice-level-pill");
const level = () => Number(pill().style.getPropertyValue("--nck-call-level"));

describe("VoiceLevelPill", () => {
  it("raises its glow with the followed level, in frames, and settles at rest", () => {
    const levels = createLevels();
    render(<VoiceLevelPill levels={levels} source="agent" />);
    expect(level()).toBe(0);
    levels.set({ agent: 0.8 });
    runFrames(40);
    expect(level()).toBeCloseTo(0.8, 2);
    levels.set({ agent: 0 });
    runFrames(60);
    expect(level()).toBe(0);
    expect(frames.pending.size).toBe(0);
  });

  it("ignores the other side's level", () => {
    const levels = createLevels();
    render(<VoiceLevelPill levels={levels} source="you" />);
    levels.set({ agent: 1 });
    runFrames(10);
    expect(level()).toBe(0);
  });

  it("holds at zero with source none and is decorative for a screen reader", () => {
    const levels = createLevels();
    render(<VoiceLevelPill levels={levels} source="none" />);
    levels.set({ you: 1, agent: 1 });
    runFrames(10);
    expect(level()).toBe(0);
    expect(pill()).toHaveAttribute("aria-hidden", "true");
  });

  it("with reduced motion sets a fixed glow, follows nothing and asks for no frames", () => {
    resetWorld({ reduced: true });
    const levels = createLevels();
    render(<VoiceLevelPill levels={levels} source="agent" />);
    expect(pill()).toHaveAttribute("data-motion", "still");
    levels.set({ agent: 1 });
    expect(frames.requested).toBe(0);
    expect(level()).toBeCloseTo(0.4);
  });

  it("stops its loop on unmount", () => {
    const levels = createLevels();
    const { unmount } = render(<VoiceLevelPill levels={levels} source="you" />);
    levels.set({ you: 1 });
    unmount();
    expect(frames.pending.size).toBe(0);
  });
});
