import { vi } from "vitest";

/** A track that records `stop()` and lets a test fire the browser's own "ended" event. */
export function fakeTrack() {
  const listeners = new Map<string, Set<() => void>>();
  return {
    stop: vi.fn(),
    addEventListener: (type: string, listener: () => void) => {
      const set = listeners.get(type) ?? new Set();
      set.add(listener);
      listeners.set(type, set);
    },
    removeEventListener: (type: string, listener: () => void) => listeners.get(type)?.delete(listener),
    end() {
      listeners.get("ended")?.forEach((listener) => listener());
    },
  };
}

export type FakeTrack = ReturnType<typeof fakeTrack>;

/** A stream with one track, typed as a `MediaStream`. */
export function fakeStream() {
  const track = fakeTrack();
  const stream = { getTracks: () => [track], id: Math.random().toString(36).slice(2) } as unknown as MediaStream;
  return { stream, track };
}

/** `navigator.mediaDevices` stand-in; every request hands out a new stream, recorded in `streams`. */
export function fakeMediaDevices(options: { camera?: boolean; screen?: boolean } = {}) {
  const streams: Array<{ kind: "camera" | "screen"; track: FakeTrack; stream: MediaStream }> = [];
  const gate = { reject: null as null | { name: string }, hold: null as null | Promise<void> };
  const open = (kind: "camera" | "screen") =>
    vi.fn(async () => {
      if (gate.hold) await gate.hold;
      if (gate.reject) throw gate.reject;
      const made = fakeStream();
      streams.push({ kind, ...made });
      return made.stream;
    });
  const devices: Partial<MediaDevices> = {};
  if (options.camera !== false) devices.getUserMedia = open("camera");
  if (options.screen !== false) devices.getDisplayMedia = open("screen");
  return { devices: devices as MediaDevices, streams, gate };
}
