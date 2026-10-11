import type { LocalMedia } from "./local-media";
import { createLevels, SILENT_LEVELS } from "./voice-levels";
import { wobbleLevel, type FakeScriptStep } from "./fake-voice-script";
import type {
  VoiceCapabilities,
  VoiceJoinStep,
  VoiceLevelSnapshot,
  VoicePhase,
  VoiceProblem,
  VoiceSession,
  VoiceSnapshot,
  VoiceTranscriptSegment,
} from "./voice-types";

export type { FakeScriptStep } from "./fake-voice-script";

const DEFAULT_CAPABILITIES: VoiceCapabilities = { mute: true, captions: true, camera: false, screenShare: false, hold: false };
const LEVEL_TICK_MS = 50;
const DEFAULT_JOIN_MS = 400;
const IDLE_PHASES: readonly VoicePhase[] = ["held", "ended", "failed"];

export interface FakeVoiceSessionOptions {
  /** Where the call starts. Default `listening`. */
  phase?: VoicePhase;
  step?: VoiceJoinStep;
  capabilities?: Partial<VoiceCapabilities>;
  captions?: boolean;
  muted?: boolean;
  transcript?: readonly VoiceTranscriptSegment[];
  problem?: VoiceProblem;
  /**
   * A local media controller (`createLocalMedia()` or `useLocalMedia().controller`). With it the
   * camera and screen share are real local previews; without it they are only flags.
   */
  media?: LocalMedia;
  /** The clock; default `Date.now`. */
  now?: () => number;
  /** How long `retry()` stays on "connecting" before listening. Default 400; `null` leaves the script in charge. */
  joinMs?: number | null;
}

/** The hands of the person writing the script: they change the call as a transport would. */
export interface FakeVoiceScript {
  setPhase(phase: VoicePhase, step?: VoiceJoinStep): void;
  setStep(step: VoiceJoinStep | null): void;
  setLevels(levels: Partial<VoiceLevelSnapshot>): void;
  /** Add a line (or an interim one with `final: false`); returns its id. */
  say(speaker: VoiceTranscriptSegment["speaker"], text: string, options?: { final?: boolean; id?: string }): string;
  /** Replace the text of a line and mark it final. */
  settle(id: string, text?: string): void;
  setCapabilities(capabilities: Partial<VoiceCapabilities>): void;
  /** Raise a problem: microphone and connection problems fail the call, an audio problem leaves it running. */
  fail(problem: VoiceProblem): void;
  clearProblem(): void;
  setRemoteVideo(stream: MediaStream | null): void;
  /** The next camera or screen request fails with this reason (or succeeds again with null). */
  failDevices(reason: "denied" | "unavailable" | null): void;
  /** Move the levels like a voice while the phase is listening or speaking. Returns nothing; `stop()` ends it. */
  simulateLevels(on: boolean): void;
  /** Run timed steps; returns a cancel function. */
  play(steps: readonly FakeScriptStep[]): () => void;
  /** Cancel every pending timer of the script and of `retry`. */
  stop(): void;
}

export interface FakeVoiceSession extends VoiceSession {
  readonly script: FakeVoiceScript;
  /** Every session method called, in order, as `name` or `name(arg)`; for assertions. */
  readonly calls: readonly string[];
}

/**
 * A scriptable `VoiceSession` for tests and docs: it changes state, levels, transcript lines,
 * problems and capabilities only when its `script` says so, and records the calls it receives.
 * It keeps the real contract: hold, end and failure switch the camera and screen share off.
 */
export function createFakeVoiceSession(options: FakeVoiceSessionOptions = {}): FakeVoiceSession {
  const clock = options.now ?? Date.now;
  const media = options.media;
  const levels = createLevels();
  const listeners = new Set<() => void>();
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const calls: string[] = [];
  let counter = 0;
  let deviceFailure: "denied" | "unavailable" | null = null;
  let resumeTo: VoicePhase = "listening";
  let simulation: ReturnType<typeof setInterval> | null = null;
  const startPhase = options.phase ?? "listening";

  let snapshot: VoiceSnapshot = {
    phase: startPhase,
    step: startPhase === "connecting" ? options.step ?? "joining" : null,
    muted: options.muted ?? false,
    captions: options.captions ?? true,
    transcript: options.transcript ?? [],
    capabilities: { ...DEFAULT_CAPABILITIES, ...options.capabilities },
    problem: options.problem ?? null,
    cameraOn: false,
    screenOn: false,
    localVideo: null,
    localScreen: null,
    remoteVideo: null,
    deviceError: null,
    startedAt: startPhase === "connecting" ? null : clock(),
    endedAt: IDLE_PHASES.includes(startPhase) && startPhase !== "held" ? clock() : null,
  };

  const set = (patch: Partial<VoiceSnapshot>) => {
    snapshot = { ...snapshot, ...patch };
    for (const listener of [...listeners]) listener();
  };
  const record = (name: string, arg?: unknown) => calls.push(arg === undefined ? name : `${name}(${String(arg)})`);
  const later = (ms: number, run: () => void) => {
    const id = setTimeout(() => {
      timers.delete(id);
      run();
    }, ms);
    timers.add(id);
  };

  // Real previews follow the media controller (for example the browser's own "stop sharing").
  const syncMedia = () => {
    if (!media) return;
    const now = media.getSnapshot();
    const idle = IDLE_PHASES.includes(snapshot.phase);
    if (idle && (now.camera || now.screen)) media.stopAll();
    const same =
      snapshot.localVideo === now.camera &&
      snapshot.localScreen === now.screen &&
      snapshot.cameraOn === (now.camera !== null) &&
      snapshot.screenOn === (now.screen !== null) &&
      snapshot.deviceError === now.error;
    if (same) return;
    set({
      cameraOn: now.camera !== null,
      screenOn: now.screen !== null,
      localVideo: now.camera,
      localScreen: now.screen,
      deviceError: now.error,
    });
  };
  media?.subscribe(syncMedia);

  const devicesOff = (): Partial<VoiceSnapshot> => {
    media?.stopAll();
    return { cameraOn: false, screenOn: false, localVideo: null, localScreen: null };
  };

  const setPhase = (phase: VoicePhase, step?: VoiceJoinStep) => {
    const idle = IDLE_PHASES.includes(phase);
    const joining = phase === "connecting";
    if (phase === "listening" || phase === "thinking" || phase === "speaking") resumeTo = phase;
    set({
      phase,
      step: joining ? step ?? "joining" : null,
      startedAt: snapshot.startedAt ?? (joining ? null : clock()),
      endedAt: phase === "ended" || phase === "failed" ? clock() : idle ? snapshot.endedAt : null,
      ...(idle ? devicesOff() : {}),
    });
    if (idle) levels.set(SILENT_LEVELS);
  };

  async function toggleDevice(device: "camera" | "screen", on: boolean): Promise<void> {
    record(device === "camera" ? "setCamera" : "setScreenShare", on);
    const allowed = device === "camera" ? snapshot.capabilities.camera : snapshot.capabilities.screenShare;
    if (!allowed) return;
    const flag = device === "camera" ? "cameraOn" : "screenOn";
    if (!on) {
      if (media) device === "camera" ? media.stopCamera() : media.stopScreen();
      if (snapshot[flag]) set(device === "camera" ? { cameraOn: false, localVideo: null } : { screenOn: false, localScreen: null });
      return;
    }
    if (IDLE_PHASES.includes(snapshot.phase)) return;
    if (deviceFailure) {
      set({ deviceError: { device, reason: deviceFailure } });
      return;
    }
    if (!media) {
      set({ [flag]: true, deviceError: null });
      return;
    }
    set({ deviceError: null });
    const ok = await (device === "camera" ? media.startCamera() : media.startScreen());
    // The call may have been held or ended while the browser was asking.
    if (ok && IDLE_PHASES.includes(snapshot.phase)) media.stopAll();
    syncMedia();
  }

  const script: FakeVoiceScript = {
    setPhase,
    setStep: (step) => set({ step }),
    setLevels: (next) => levels.set(next),
    say(speaker, text, opts = {}) {
      counter += 1;
      const id = opts.id ?? `fake-${counter}`;
      const line: VoiceTranscriptSegment = { id, speaker, text, final: opts.final ?? true, at: clock() };
      const exists = snapshot.transcript.some((item) => item.id === id);
      set({ transcript: exists ? snapshot.transcript.map((item) => (item.id === id ? line : item)) : [...snapshot.transcript, line] });
      return id;
    },
    settle(id, text) {
      set({ transcript: snapshot.transcript.map((item) => (item.id === id ? { ...item, text: text ?? item.text, final: true } : item)) });
    },
    setCapabilities: (capabilities) => set({ capabilities: { ...snapshot.capabilities, ...capabilities } }),
    fail(problem) {
      if (problem === "audio-blocked") {
        set({ problem });
        return;
      }
      set({ problem });
      setPhase("failed");
    },
    clearProblem: () => set({ problem: null }),
    setRemoteVideo: (stream) => set({ remoteVideo: stream }),
    failDevices: (reason) => {
      deviceFailure = reason;
    },
    simulateLevels(on) {
      if (simulation !== null) clearInterval(simulation);
      simulation = null;
      if (!on) return;
      const origin = clock();
      simulation = setInterval(() => {
        const ms = clock() - origin;
        if (snapshot.phase === "speaking") levels.set({ agent: wobbleLevel(ms, 1), you: 0 });
        else if (snapshot.phase === "listening" && !snapshot.muted) levels.set({ you: wobbleLevel(ms, 4) * 0.8, agent: 0 });
        else levels.set(SILENT_LEVELS);
      }, LEVEL_TICK_MS);
    },
    play(steps) {
      const mine = new Set<ReturnType<typeof setTimeout>>();
      for (const item of steps) {
        const id = setTimeout(() => {
          mine.delete(id);
          timers.delete(id);
          if ("phase" in item) setPhase(item.phase, item.step);
          else if ("say" in item) script.say(item.say.speaker, item.say.text, { final: item.say.final });
          else if ("levels" in item) levels.set(item.levels);
          else if ("fail" in item) script.fail(item.fail);
          else item.run();
        }, item.at);
        mine.add(id);
        timers.add(id);
      }
      return () =>
        mine.forEach((id) => {
          clearTimeout(id);
          timers.delete(id);
        });
    },
    stop() {
      timers.forEach((id) => clearTimeout(id));
      timers.clear();
      script.simulateLevels(false);
    },
  };

  return {
    script,
    get calls() {
      return calls;
    },
    levels,
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setMuted(muted) {
      record("setMuted", muted);
      if (snapshot.capabilities.mute && !IDLE_PHASES.includes(snapshot.phase)) set({ muted });
    },
    setCaptions(on) {
      record("setCaptions", on);
      if (snapshot.capabilities.captions) set({ captions: on });
    },
    setCamera: (on) => toggleDevice("camera", on),
    setScreenShare: (on) => toggleDevice("screen", on),
    hold() {
      record("hold");
      if (!snapshot.capabilities.hold || IDLE_PHASES.includes(snapshot.phase) || snapshot.phase === "connecting") return;
      setPhase("held");
    },
    resume() {
      record("resume");
      if (snapshot.phase === "held") setPhase(resumeTo);
    },
    async startAudio() {
      record("startAudio");
      if (snapshot.problem === "audio-blocked") set({ problem: null });
    },
    end() {
      record("end");
      if (snapshot.phase === "ended") return;
      script.stop();
      set({ problem: null });
      setPhase("ended");
    },
    retry() {
      record("retry");
      if (snapshot.phase !== "failed" && snapshot.phase !== "ended") return;
      set({ problem: null, endedAt: null, startedAt: null, transcript: snapshot.phase === "ended" ? [] : snapshot.transcript });
      setPhase("connecting", "joining");
      const wait = options.joinMs === undefined ? DEFAULT_JOIN_MS : options.joinMs;
      if (wait !== null) later(wait, () => setPhase("listening"));
    },
  };
}
