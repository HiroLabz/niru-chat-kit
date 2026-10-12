/**
 * The voice session contract. A transport (LiveKit, plain WebRTC, the browser) implements
 * `VoiceSession`; the kit's call screens only read its snapshot and call its methods. The kit
 * ships no voice service: `createFakeVoiceSession` stands in for tests and demos.
 */

/** Where the call is. `held` keeps the call open with the microphone, camera and screen share off. */
export type VoicePhase = "connecting" | "listening" | "thinking" | "speaking" | "held" | "ended" | "failed";

/** The steps of joining, shown while `phase` is `connecting`. */
export type VoiceJoinStep = "joining" | "connecting" | "microphone" | "audio" | "ready";

/**
 * What is wrong with the call right now. `microphone-blocked` and `connection-lost` come with
 * phase `failed`; `audio-blocked` leaves the call running (the browser will not play the agent's
 * voice until the person taps).
 */
export type VoiceProblem = "microphone-blocked" | "audio-blocked" | "connection-lost";

/** One line of the call's transcript. */
export interface VoiceTranscriptSegment {
  id: string;
  speaker: "user" | "agent";
  text: string;
  /** False while the line is still being spoken or recognised. */
  final: boolean;
  /** Milliseconds since the epoch. */
  at: number;
}

/** Two audio levels from 0 to 1. */
export interface VoiceLevelSnapshot {
  you: number;
  agent: number;
}

/**
 * The live levels. Reading and subscribing never cause a React render: read `get()` in an
 * animation frame (see `followLevels`). `subscribe` says "a level changed".
 */
export interface VoiceLevels {
  get(): VoiceLevelSnapshot;
  subscribe(listener: () => void): () => void;
}

/** What this session can do. A control is drawn only when its capability is true. */
export interface VoiceCapabilities {
  mute: boolean;
  captions: boolean;
  camera: boolean;
  screenShare: boolean;
  hold: boolean;
}

/** Why a camera or screen share did not start. */
export type VoiceDeviceError = "denied" | "unavailable";

/** One microphone the person can choose. `label` is what the browser calls it ("MacBook Pro Microphone"). */
export interface VoiceMicrophone {
  deviceId: string;
  label: string;
}

/** Everything a screen needs to draw the call, in one immutable object that changes identity on every change. */
export interface VoiceSnapshot {
  phase: VoicePhase;
  /** The join step while connecting, else null. */
  step: VoiceJoinStep | null;
  muted: boolean;
  /**
   * The microphones to choose from, when the transport can list them. Optional: a session that
   * leaves it out simply has no picker. An empty list means none was found.
   */
  microphones?: readonly VoiceMicrophone[];
  /** The `deviceId` in use; null when the browser's default is in use. */
  microphoneId?: string | null;
  captions: boolean;
  transcript: readonly VoiceTranscriptSegment[];
  capabilities: VoiceCapabilities;
  problem: VoiceProblem | null;
  cameraOn: boolean;
  screenOn: boolean;
  /** The local camera preview; null when the camera is off. Never leaves the device through the kit. */
  localVideo: MediaStream | null;
  /** The local screen share preview; null when off. */
  localScreen: MediaStream | null;
  /** The agent's video, when the transport has one. */
  remoteVideo: MediaStream | null;
  /** Why the last camera or screen share request failed; cleared by the next request. */
  deviceError: { device: "camera" | "screen"; reason: VoiceDeviceError } | null;
  /** When the call became active (ms since the epoch); null before. */
  startedAt: number | null;
  /** When the call ended or failed; null while it runs. */
  endedAt: number | null;
}

/**
 * A voice call. Implementations must switch the camera and screen share off (stop their tracks)
 * when the call is held, ended or failed. Every method is safe in any phase and never rejects.
 */
export interface VoiceSession {
  getSnapshot(): VoiceSnapshot;
  subscribe(listener: () => void): () => void;
  /** Stable for the life of the session. */
  readonly levels: VoiceLevels;
  setMuted(muted: boolean): void;
  /**
   * Switch to another microphone. Optional: the call screens show the picker only when this is
   * present (or when the screen is given its own `onSelectMicrophone`).
   */
  selectMicrophone?(deviceId: string): void;
  setCaptions(on: boolean): void;
  /** Turn the camera on or off; resolves when done, also when it failed (see `deviceError`). */
  setCamera(on: boolean): Promise<void>;
  setScreenShare(on: boolean): Promise<void>;
  /** Pause the call: microphone, camera and screen share go off. */
  hold(): void;
  resume(): void;
  /** For a browser that blocked the agent's sound: call from a tap. */
  startAudio(): Promise<void>;
  end(): void;
  /** Call again after the call failed or ended. */
  retry(): void;
}
