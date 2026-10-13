import { vi } from "vitest";
import { fakeStream, type FakeTrack } from "./media-test-kit";

/** A `MediaRecorder` stand-in: `stop()` delivers one chunk, then fires `onstop`. */
export class FakeMediaRecorder {
  static instances: FakeMediaRecorder[] = [];
  static supported = new Set<string>(["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"]);
  static isTypeSupported = (type: string) => FakeMediaRecorder.supported.has(type);
  state: "inactive" | "recording" = "inactive";
  mimeType: string;
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(
    readonly stream: MediaStream,
    readonly options?: { mimeType?: string }
  ) {
    this.mimeType = options?.mimeType ?? "";
    FakeMediaRecorder.instances.push(this);
  }
  start() {
    this.state = "recording";
  }
  stop() {
    if (this.state === "inactive") return;
    this.state = "inactive";
    this.ondataavailable?.({ data: new Blob(["voice"], { type: this.mimeType || "audio/webm" }) });
    this.onstop?.();
  }
}

/** Installs the fake recorder and a fake `getUserMedia`; returns the handles a test needs. */
export function installRecorderWorld() {
  FakeMediaRecorder.instances = [];
  FakeMediaRecorder.supported = new Set(["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"]);
  const tracks: FakeTrack[] = [];
  const gate = { reject: null as null | { name: string }, hold: null as null | Promise<void> };
  const getUserMedia = vi.fn(async (_constraints: MediaStreamConstraints) => {
    if (gate.hold) await gate.hold;
    if (gate.reject) throw gate.reject;
    const made = fakeStream();
    tracks.push(made.track);
    return made.stream;
  });
  Object.defineProperty(navigator, "mediaDevices", { value: { getUserMedia }, configurable: true });
  vi.stubGlobal("MediaRecorder", FakeMediaRecorder);
  return { getUserMedia, tracks, gate };
}

export function removeRecorderWorld() {
  Reflect.deleteProperty(navigator, "mediaDevices");
  vi.unstubAllGlobals();
  FakeMediaRecorder.instances = [];
}
