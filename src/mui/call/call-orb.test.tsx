import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { createLevels } from "../../core/voice/voice-levels";
import { CallOrb } from "./call-orb";
import { orbStateOf } from "./call-orb-state";
import { fakeGl, frames, resetWorld, stubWebGl } from "./call-orb-test-kit";

beforeEach(() => resetWorld());
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const orb = () => screen.getByTestId("call-orb");

describe("orbStateOf", () => {
  it("maps every phase", () => {
    expect(orbStateOf({ phase: "connecting", muted: false, problem: null })).toBe("connecting");
    expect(orbStateOf({ phase: "listening", muted: false, problem: null })).toBe("listening");
    expect(orbStateOf({ phase: "listening", muted: true, problem: null })).toBe("muted");
    expect(orbStateOf({ phase: "thinking", muted: false, problem: null })).toBe("thinking");
    expect(orbStateOf({ phase: "speaking", muted: false, problem: null })).toBe("speaking");
    expect(orbStateOf({ phase: "speaking", muted: true, problem: null })).toBe("speaking-muted");
    expect(orbStateOf({ phase: "held", muted: false, problem: null })).toBe("muted");
    expect(orbStateOf({ phase: "failed", muted: false, problem: "connection-lost" })).toBe("problem");
    expect(orbStateOf({ phase: "ended", muted: false, problem: null })).toBe("idle");
  });
});

describe("CallOrb", () => {
  it("draws with WebGL in a canvas and runs one animation loop", () => {
    const gl = fakeGl();
    stubWebGl(gl);
    render(<CallOrb state="listening" levels={createLevels()} size={120} />);
    expect(orb()).toHaveAttribute("data-orb-render", "webgl");
    expect(orb().querySelector("canvas")).not.toBeNull();
    expect(getComputedStyle(orb()).width).toBe("120px");
    expect(frames.pending.size).toBe(1);
  });

  it("reads the level of the person while listening and of the agent while speaking", () => {
    const gl = fakeGl();
    stubWebGl(gl);
    const levels = createLevels();
    const { rerender } = render(<CallOrb state="listening" levels={levels} />);
    levels.set({ you: 1, agent: 0 });
    for (let index = 0; index < 20; index += 1) {
      const due = [...frames.pending.values()];
      frames.pending.clear();
      due.forEach((callback) => callback(index * 16 + 16));
    }
    const heardYou = gl.uniforms.get("uLevel")?.[0] ?? 0;
    expect(heardYou).toBeGreaterThan(0.3);
    rerender(<CallOrb state="thinking" levels={levels} />);
    expect(orb()).toHaveAttribute("data-orb-state", "thinking");
  });

  it("holds still with reduced motion: it draws once and asks for no frames", () => {
    resetWorld({ reduced: true });
    const gl = fakeGl();
    stubWebGl(gl);
    render(<CallOrb state="speaking" levels={createLevels()} />);
    expect(orb()).toHaveAttribute("data-orb-motion", "still");
    expect(frames.requested).toBe(0);
    expect(gl.draws()).toBeGreaterThan(0);
  });

  it.each([
    ["WebGL is missing", () => stubWebGl(null)],
    ["the shader does not compile", () => stubWebGl(fakeGl({ compiles: false }))],
    ["the program does not link", () => stubWebGl(fakeGl({ links: false }))],
  ])("shows the CSS circle without a canvas or a loop when %s", (_name, arrange) => {
    arrange();
    render(<CallOrb state="listening" levels={createLevels()} />);
    expect(orb()).toHaveAttribute("data-orb-render", "fallback");
    expect(orb().querySelector("canvas")).toBeNull();
    expect(frames.requested).toBe(0);
    expect(getComputedStyle(orb()).backgroundImage).toContain("radial-gradient");
  });

  it("is hidden from assistive tech unless it has a label", () => {
    stubWebGl(null);
    const { unmount } = render(<CallOrb state="idle" levels={createLevels()} />);
    expect(orb()).toHaveAttribute("aria-hidden", "true");
    unmount();
    render(<CallOrb state="idle" levels={createLevels()} label="Assistant" />);
    expect(screen.getByRole("img", { name: "Assistant" })).toBeInTheDocument();
  });

  it("releases the context and takes the canvas away on unmount", () => {
    const gl = fakeGl();
    stubWebGl(gl);
    const { unmount } = render(<CallOrb state="listening" levels={createLevels()} />);
    unmount();
    expect(gl.loseContext).toHaveBeenCalled();
    expect(frames.pending.size).toBe(0);
  });
});
