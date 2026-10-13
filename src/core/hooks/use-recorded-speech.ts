"use client";

/**
 * Voice input that records. The person speaks, the hook records with `MediaRecorder`, and on stop it
 * hands the audio to the app's `transcribe` function and gives back the text. The kit never sends
 * the audio anywhere itself, and keeps none of it once `transcribe` settles. Every stream track is
 * stopped on stop, cancel, failure and unmount.
 */

import { useCallback, useEffect, useRef, useState } from "react";

/** Idle, asking for the microphone, recording, transcribing, or failed (see `failure`). */
export type RecordedSpeechState = "idle" | "asking" | "recording" | "transcribing" | "failed";

/** Why a recording did not turn into text. `nothing-heard` is an empty result, not an error. */
export type SpeechFailure =
  | "permission-denied"
  | "no-microphone"
  | "microphone-busy"
  | "recording-failed"
  | "transcription-failed"
  | "nothing-heard";

export type TranscribeInfo = { mime: string; durationMs: number };

/** The app's speech-to-text call. Resolve with the text; reject with an Error whose message is plain words. */
export type TranscribeAudio = (audio: Blob, info: TranscribeInfo) => Promise<string>;

export type UseRecordedSpeechOptions = {
  transcribe?: TranscribeAudio;
  /** A `deviceId` from `enumerateDevices`; null or absent: the browser's default microphone. */
  microphoneId?: string | null;
  /** Recording stops by itself, and is transcribed, after this long. Default 120000. */
  maxDurationMs?: number;
  /** Called with the trimmed, non-empty text. */
  onFinal?: (text: string) => void;
};

export type UseRecordedSpeechResult = {
  /** True once `getUserMedia` and `MediaRecorder` are known to exist and `transcribe` is given. */
  supported: boolean;
  state: RecordedSpeechState;
  /** Milliseconds recorded so far; 0 outside `recording`. */
  elapsedMs: number;
  /** The input level from 0 to 1 while recording (0 where the browser cannot measure it). */
  level: number;
  failure: SpeechFailure | null;
  /** The message the app's `transcribe` rejected with, when that was the failure. */
  detail: string | null;
  start: () => void;
  /** While recording: stop and transcribe. */
  stop: () => void;
  /** Discard the recording (or the pending transcription) without adding text. */
  cancel: () => void;
};

export const DEFAULT_MAX_RECORDING_MS = 120_000;
/** Tried in this order; the first the browser can record wins. */
export const RECORDING_MIME_TYPES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"] as const;

const TICK_MS = 100;

type Run = {
  cancelled: boolean;
  stream: MediaStream | null;
  recorder: MediaRecorder | null;
  chunks: Blob[];
  mime: string;
  startedAt: number;
  tick: ReturnType<typeof setInterval> | null;
  limit: ReturnType<typeof setTimeout> | null;
  audio: AudioContext | null;
  analyser: AnalyserNode | null;
};

function canRecord(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.mediaDevices?.getUserMedia === "function" &&
    typeof MediaRecorder !== "undefined"
  );
}

function pickMime(): string {
  const supports = typeof MediaRecorder.isTypeSupported === "function" ? (type: string) => MediaRecorder.isTypeSupported(type) : () => false;
  return RECORDING_MIME_TYPES.find(supports) ?? "";
}

/** Maps a `getUserMedia` error to a failure the person can act on. */
function captureFailure(error: unknown): SpeechFailure {
  const name = (error as { name?: string } | null)?.name;
  if (name === "NotAllowedError" || name === "SecurityError" || name === "PermissionDeniedError") return "permission-denied";
  if (name === "NotFoundError" || name === "DevicesNotFoundError" || name === "OverconstrainedError") return "no-microphone";
  if (name === "NotReadableError" || name === "TrackStartError" || name === "AbortError") return "microphone-busy";
  return "recording-failed";
}

function levelOf(analyser: AnalyserNode | null): number {
  if (!analyser) return 0;
  const samples = new Uint8Array(analyser.fftSize);
  analyser.getByteTimeDomainData(samples);
  let sum = 0;
  for (const sample of samples) {
    const centred = (sample - 128) / 128;
    sum += centred * centred;
  }
  return Math.min(1, Math.sqrt(sum / samples.length) * 3);
}

function releaseRun(run: Run) {
  if (run.tick) clearInterval(run.tick);
  if (run.limit) clearTimeout(run.limit);
  run.tick = null;
  run.limit = null;
  run.stream?.getTracks().forEach((track) => track.stop());
  run.stream = null;
  void run.audio?.close?.()?.catch?.(() => undefined);
  run.audio = null;
  run.analyser = null;
}

export function useRecordedSpeech(options: UseRecordedSpeechOptions = {}): UseRecordedSpeechResult {
  const [supported, setSupported] = useState(false);
  const [state, setState] = useState<RecordedSpeechState>("idle");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [level, setLevel] = useState(0);
  const [failure, setFailure] = useState<SpeechFailure | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const current = useRef<Run | null>(null);
  const latest = useRef(options);
  latest.current = options;
  const enabled = Boolean(options.transcribe);

  const settle = useCallback((run: Run, next: RecordedSpeechState, why: SpeechFailure | null = null, message: string | null = null) => {
    releaseRun(run);
    if (current.current === run) current.current = null;
    setState(next);
    setFailure(why);
    setDetail(message);
    setElapsedMs(0);
    setLevel(0);
  }, []);

  const cancel = useCallback(() => {
    const run = current.current;
    if (!run) return;
    run.cancelled = true;
    if (run.recorder) {
      run.recorder.ondataavailable = null;
      run.recorder.onstop = null;
      run.recorder.onerror = null;
      if (run.recorder.state !== "inactive") {
        try {
          run.recorder.stop();
        } catch {
          // already stopped
        }
      }
    }
    run.chunks = [];
    settle(run, "idle");
  }, [settle]);

  useEffect(() => {
    setSupported(enabled && canRecord());
  }, [enabled]);

  // Unmount (or `transcribe` removed): release the microphone and drop the audio.
  useEffect(() => cancel, [cancel]);

  const transcribeRun = useCallback(
    async (run: Run) => {
      const transcribe = latest.current.transcribe;
      const durationMs = Date.now() - run.startedAt;
      const mime = run.recorder?.mimeType || run.mime || "audio/webm";
      let audio: Blob | null = new Blob(run.chunks, { type: mime });
      run.chunks = [];
      releaseRun(run);
      if (!transcribe) return settle(run, "idle");
      setState("transcribing");
      setElapsedMs(0);
      setLevel(0);
      let text: string;
      try {
        text = await transcribe(audio, { mime, durationMs });
      } catch (error) {
        audio = null;
        if (run.cancelled) return;
        const message = error instanceof Error ? error.message.trim() : "";
        return settle(run, "failed", "transcription-failed", message || null);
      }
      audio = null;
      if (run.cancelled) return;
      const heard = typeof text === "string" ? text.trim() : "";
      if (!heard) return settle(run, "failed", "nothing-heard");
      settle(run, "idle");
      latest.current.onFinal?.(heard);
    },
    [settle]
  );

  const start = useCallback(() => {
    if (!latest.current.transcribe || !canRecord() || current.current) return;
    const run: Run = { cancelled: false, stream: null, recorder: null, chunks: [], mime: "", startedAt: 0, tick: null, limit: null, audio: null, analyser: null };
    current.current = run;
    setFailure(null);
    setDetail(null);
    setState("asking");
    const microphoneId = latest.current.microphoneId;
    const request = navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
        ...(microphoneId ? { deviceId: { exact: microphoneId } } : {}),
      },
    });
    request.then(
      (stream) => {
        run.stream = stream;
        if (run.cancelled) return releaseRun(run);
        try {
          run.mime = pickMime();
          const recorder = run.mime ? new MediaRecorder(stream, { mimeType: run.mime }) : new MediaRecorder(stream);
          run.recorder = recorder;
          recorder.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) run.chunks.push(event.data);
          };
          recorder.onerror = () => settle(run, "failed", "recording-failed");
          recorder.onstop = () => void transcribeRun(run);
          try {
            const Context = (window as unknown as { AudioContext?: typeof AudioContext }).AudioContext;
            if (Context) {
              run.audio = new Context();
              run.analyser = run.audio.createAnalyser();
              run.audio.createMediaStreamSource(stream).connect(run.analyser);
            }
          } catch {
            run.analyser = null;
          }
          recorder.start();
          run.startedAt = Date.now();
          setState("recording");
          run.tick = setInterval(() => {
            setElapsedMs(Date.now() - run.startedAt);
            setLevel(levelOf(run.analyser));
          }, TICK_MS);
          run.limit = setTimeout(() => {
            if (recorder.state !== "inactive") recorder.stop();
          }, latest.current.maxDurationMs ?? DEFAULT_MAX_RECORDING_MS);
        } catch {
          settle(run, "failed", "recording-failed");
        }
      },
      (error) => {
        if (!run.cancelled) settle(run, "failed", captureFailure(error));
      }
    );
  }, [settle, transcribeRun]);

  const stop = useCallback(() => {
    const run = current.current;
    if (!run || run.cancelled) return;
    if (run.recorder && run.recorder.state !== "inactive") {
      if (run.tick) clearInterval(run.tick);
      if (run.limit) clearTimeout(run.limit);
      run.tick = null;
      run.limit = null;
      run.recorder.stop();
    } else if (!run.recorder) {
      cancel();
    }
  }, [cancel]);

  return { supported, state, elapsedMs, level, failure, detail, start, stop, cancel };
}
