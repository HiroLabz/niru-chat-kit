import type { VoiceDeviceError } from "./voice-types";

/** What the preview controller exposes. */
export interface LocalMediaSnapshot {
  camera: MediaStream | null;
  screen: MediaStream | null;
  /** Whether the browser can do it at all (feature-detected when read, so safe on the server). */
  supported: { camera: boolean; screen: boolean };
  error: { device: "camera" | "screen"; reason: VoiceDeviceError } | null;
}

export interface LocalMedia {
  getSnapshot(): LocalMediaSnapshot;
  subscribe(listener: () => void): () => void;
  /** Resolves true when the camera is on. Never rejects. */
  startCamera(): Promise<boolean>;
  startScreen(): Promise<boolean>;
  stopCamera(): void;
  stopScreen(): void;
  /** Stops every track of both. */
  stopAll(): void;
}

type Devices = Pick<MediaDevices, "getUserMedia" | "getDisplayMedia"> | null | undefined;

export interface CreateLocalMediaOptions {
  /** Defaults to `navigator.mediaDevices`; pass one in tests. */
  mediaDevices?: Devices;
}

function browserDevices(): Devices {
  return typeof navigator === "undefined" ? null : navigator.mediaDevices;
}

function reasonOf(error: unknown): VoiceDeviceError {
  const name = (error as { name?: string } | null)?.name;
  return name === "NotAllowedError" || name === "SecurityError" || name === "PermissionDeniedError" ? "denied" : "unavailable";
}

function stopTracks(stream: MediaStream | null): void {
  stream?.getTracks().forEach((track) => track.stop());
}

/**
 * A camera and screen-share preview for the visitor's own screen. Nothing is recorded or sent
 * anywhere: the streams are only handed to a `<video>`. Features are detected on use. Every track is
 * stopped by `stopCamera`, `stopScreen` and `stopAll`, when the browser's own "stop sharing" ends a
 * track, and when a request that was still pending finishes after its stop.
 */
export function createLocalMedia(options: CreateLocalMediaOptions = {}): LocalMedia {
  const listeners = new Set<() => void>();
  const devices = (): Devices => (options.mediaDevices !== undefined ? options.mediaDevices : browserDevices());
  let camera: MediaStream | null = null;
  let screen: MediaStream | null = null;
  let error: LocalMediaSnapshot["error"] = null;
  // A counter per device: a stop bumps it, so a request that was in flight is dropped on arrival.
  const epoch = { camera: 0, screen: 0 };
  let snapshot: LocalMediaSnapshot | null = null;

  const supportOf = () => {
    const current = devices();
    return {
      camera: typeof current?.getUserMedia === "function",
      screen: typeof current?.getDisplayMedia === "function",
    };
  };
  const emit = () => {
    snapshot = null;
    for (const listener of [...listeners]) listener();
  };

  const watch = (stream: MediaStream, device: "camera" | "screen") => {
    stream.getTracks().forEach((track) =>
      track.addEventListener("ended", () => {
        if (device === "camera" && camera === stream) stop("camera");
        if (device === "screen" && screen === stream) stop("screen");
      })
    );
  };

  function stop(device: "camera" | "screen") {
    epoch[device] += 1;
    const stream = device === "camera" ? camera : screen;
    if (device === "camera") camera = null;
    else screen = null;
    stopTracks(stream);
    if (stream) emit();
  }

  async function start(device: "camera" | "screen"): Promise<boolean> {
    const current = devices();
    const open = device === "camera" ? current?.getUserMedia : current?.getDisplayMedia;
    if (!current || typeof open !== "function") {
      error = { device, reason: "unavailable" };
      emit();
      return false;
    }
    if ((device === "camera" ? camera : screen) !== null) return true;
    const mine = (epoch[device] += 1);
    error = null;
    try {
      const stream =
        device === "camera"
          ? await current.getUserMedia({ video: { facingMode: "user" }, audio: false })
          : await current.getDisplayMedia({ video: true, audio: false });
      if (mine !== epoch[device]) {
        stopTracks(stream);
        return false;
      }
      watch(stream, device);
      if (device === "camera") camera = stream;
      else screen = stream;
      emit();
      return true;
    } catch (failure) {
      if (mine === epoch[device]) {
        error = { device, reason: reasonOf(failure) };
        emit();
      }
      return false;
    }
  }

  return {
    getSnapshot() {
      snapshot ??= { camera, screen, supported: supportOf(), error };
      return snapshot;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    startCamera: () => start("camera"),
    startScreen: () => start("screen"),
    stopCamera: () => stop("camera"),
    stopScreen: () => stop("screen"),
    stopAll() {
      stop("camera");
      stop("screen");
    },
  };
}
