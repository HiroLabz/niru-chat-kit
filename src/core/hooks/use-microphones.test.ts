import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { microphonesOf, useMicrophones } from "./use-microphones";

const dev = (deviceId: string, label: string, kind = "audioinput") => ({ deviceId, label, kind }) as MediaDeviceInfo;

describe("microphonesOf", () => {
  it("keeps inputs only, drops the communications alias and duplicates, puts the default first", () => {
    const list = microphonesOf([dev("a", "USB"), dev("communications", "Comms"), dev("default", "Default"), dev("a", "USB again"), dev("s", "Speaker", "audiooutput"), dev("", "x")]);
    expect(list).toEqual([{ deviceId: "default", label: "Default" }, { deviceId: "a", label: "USB" }]);
  });
  it("numbers microphones whose names are still hidden", () => {
    expect(microphonesOf([dev("a", ""), dev("b", " ")]).map((m) => m.label)).toEqual(["Microphone 1", "Microphone 2"]);
  });
});

describe("useMicrophones", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("lists on mount, follows devicechange and stops listening on unmount", async () => {
    let devices = [dev("a", "USB")];
    const listeners = new Set<() => void>();
    vi.stubGlobal("navigator", {
      mediaDevices: {
        enumerateDevices: async () => devices,
        addEventListener: (_: string, l: () => void) => listeners.add(l),
        removeEventListener: (_: string, l: () => void) => listeners.delete(l),
      },
    });
    const { result, unmount } = renderHook(() => useMicrophones());
    await act(async () => {});
    expect(result.current.microphones).toEqual([{ deviceId: "a", label: "USB" }]);
    devices = [dev("a", "USB"), dev("b", "Headset")];
    await act(async () => [...listeners].forEach((l) => l()));
    expect(result.current.microphones.map((m) => m.label)).toEqual(["USB", "Headset"]);
    unmount();
    expect(listeners.size).toBe(0);
  });
  it("stays empty where the browser cannot list devices", async () => {
    vi.stubGlobal("navigator", {});
    const { result } = renderHook(() => useMicrophones());
    await act(async () => {});
    expect(result.current.microphones).toEqual([]);
  });
});
