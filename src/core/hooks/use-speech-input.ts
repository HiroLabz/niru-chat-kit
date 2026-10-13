"use client";

/**
 * Voice input from the browser's own speech recognition (no paid service). Feature-detected
 * after mount, so it is safe to render on the server: `supported` is false until the
 * browser is known to have `SpeechRecognition` or `webkitSpeechRecognition`.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useRecordedSpeech, type TranscribeAudio, type UseRecordedSpeechResult } from "./use-recorded-speech";

type RecognitionResult = ArrayLike<{ transcript: string }> & { isFinal: boolean };
type RecognitionEvent = { resultIndex: number; results: ArrayLike<RecognitionResult> };

/** The slice of the Web Speech API this hook uses. */
export type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: ((event: unknown) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type RecognitionConstructor = new () => SpeechRecognitionLike;

export type UseSpeechInputOptions = {
  /** BCP 47 language tag, for example `en-PH`. Absent: the browser's language. */
  lang?: string;
  /** Called with each settled phrase. */
  onFinal?: (text: string) => void;
  /** Called with the phrase still being recognised. */
  onInterim?: (text: string) => void;
  /**
   * Records instead of using the browser's speech recognition: the audio is handed here when the
   * person stops, and the text it resolves with goes to `onFinal`. Absent: browser recognition, as before.
   */
  transcribe?: TranscribeAudio;
  /** With `transcribe`: a `deviceId` to record from; null or absent: the default microphone. */
  microphoneId?: string | null;
  /** With `transcribe`: recording stops by itself and is transcribed after this long. Default 120000. */
  maxDurationMs?: number;
  /** With `transcribe`: set while voice input must not start (for example during a call). `start` does nothing. */
  disabledReason?: string | null;
};

export type UseSpeechInputResult = {
  supported: boolean;
  listening: boolean;
  interim: string;
  /** The recognition error code (`not-allowed`, `no-speech`, ...) of the last session, or null. */
  error: string | null;
  start: () => void;
  stop: () => void;
  /** Set when `transcribe` was given: the recorder's own state (elapsed time, level, failure). Null otherwise. */
  recorded: UseRecordedSpeechResult | null;
  /** The `disabledReason` that was passed, or null. */
  disabledReason: string | null;
};

function recognitionConstructor(): RecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const scope = window as unknown as {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null;
}

/** A short sentence for a recognition error code; empty when there is no error. */
export function speechErrorMessage(code: string | null): string {
  switch (code) {
    case null:
    case "":
      return "";
    case "not-allowed":
    case "service-not-allowed":
      return "Microphone access was blocked. Allow it in your browser to dictate.";
    case "no-speech":
      return "I did not hear anything. Try again.";
    case "audio-capture":
      return "No microphone was found.";
    case "permission-denied":
      return "Microphone access was blocked. Allow it in your browser to record.";
    case "no-microphone":
      return "No microphone was found.";
    case "microphone-busy":
      return "The microphone is in use by something else.";
    case "recording-failed":
      return "The recording stopped. Try again.";
    case "transcription-failed":
      return "The recording could not be turned into text. Try again.";
    case "nothing-heard":
      return "I did not hear anything. Try again.";
    case "network":
      return "Voice input needs a network connection.";
    default:
      return "Voice input stopped. Try again.";
  }
}

export function useSpeechInput(options: UseSpeechInputOptions = {}): UseSpeechInputResult {
  const recorded = useRecordedSpeech({
    transcribe: options.transcribe,
    microphoneId: options.microphoneId,
    maxDurationMs: options.maxDurationMs,
    onFinal: options.onFinal,
  });
  const recognition = useBrowserSpeech(options);
  const disabledReason = options.disabledReason?.trim() || null;
  const { start: startRecording } = recorded;
  const startUnlessDisabled = useCallback(() => {
    if (!disabledReason) startRecording();
  }, [disabledReason, startRecording]);
  if (!options.transcribe) return { ...recognition, recorded: null, disabledReason: null };
  return {
    supported: recorded.supported,
    listening: recorded.state === "recording",
    interim: "",
    error: recorded.failure,
    start: startUnlessDisabled,
    stop: recorded.stop,
    recorded,
    disabledReason,
  };
}

function useBrowserSpeech(options: UseSpeechInputOptions): Omit<UseSpeechInputResult, "recorded" | "disabledReason"> {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const session = useRef<SpeechRecognitionLike | null>(null);
  const latest = useRef(options);
  latest.current = options;

  useEffect(() => {
    setSupported(recognitionConstructor() !== null);
    return () => {
      const current = session.current;
      session.current = null;
      if (current) {
        current.onresult = null;
        current.onerror = null;
        current.onend = null;
        current.abort();
      }
    };
  }, []);

  const start = useCallback(() => {
    const Recognition = recognitionConstructor();
    if (!Recognition || session.current) return;
    const recognition = new Recognition();
    if (latest.current.lang) recognition.lang = latest.current.lang;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let live = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const text = result[0]?.transcript ?? "";
        if (result.isFinal) {
          const settled = text.trim();
          if (settled) latest.current.onFinal?.(settled);
        } else {
          live += text;
        }
      }
      setInterim(live);
      latest.current.onInterim?.(live);
    };
    recognition.onerror = (event) => {
      // "aborted" is our own stop, not a failure the person needs to read.
      if (event.error && event.error !== "aborted") setError(event.error);
    };
    recognition.onend = () => {
      if (session.current === recognition) session.current = null;
      setListening(false);
      setInterim("");
    };
    session.current = recognition;
    setError(null);
    try {
      recognition.start();
      setListening(true);
    } catch {
      session.current = null;
      setError("unknown");
    }
  }, []);

  const stop = useCallback(() => {
    session.current?.stop();
  }, []);

  return { supported, listening, interim, error, start, stop };
}
