import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { createFakeVoiceSession } from "./fake-voice-session";
import { useVoiceSession } from "./use-voice-session";

describe("useVoiceSession", () => {
  it("re-renders on every change of the session", () => {
    const session = createFakeVoiceSession();
    const { result } = renderHook(() => useVoiceSession(session));
    expect(result.current.phase).toBe("listening");
    act(() => session.script.setPhase("thinking"));
    expect(result.current.phase).toBe("thinking");
    act(() => session.setMuted(true));
    expect(result.current.muted).toBe(true);
  });

  it("switches a camera or screen share off when the call is held, ended or failed, even if the transport did not", async () => {
    const session = createFakeVoiceSession({ capabilities: { camera: true, screenShare: true } });
    // A transport that forgot the contract: the phase changes but the devices stay flagged on.
    const lazy = Object.create(session) as typeof session;
    let held = false;
    let cache: { base: unknown; held: boolean; value: ReturnType<typeof session.getSnapshot> } | null = null;
    lazy.getSnapshot = () => {
      const base = session.getSnapshot();
      if (!cache || cache.base !== base || cache.held !== held) {
        cache = { base, held, value: held ? { ...base, phase: "held" } : base };
      }
      return cache.value;
    };
    const { result } = renderHook(() => useVoiceSession(lazy));
    await act(async () => {
      await session.setCamera(true);
      await session.setScreenShare(true);
    });
    expect(result.current).toMatchObject({ cameraOn: true, screenOn: true });
    held = true;
    act(() => session.setCaptions(false));
    expect(result.current.phase).toBe("held");
    expect(session.calls).toContain("setCamera(false)");
    expect(session.calls).toContain("setScreenShare(false)");
  });
});
