"use client";

/**
 * Voice input from the browser's own speech recognition (no paid service). Feature-detected
 * after mount, so it is safe to render on the server: `supported` is false until the
 * browser is known to have `SpeechRecognition` or `webkitSpeechRecognition`.
 */

import { useCallback, useEffect, useRef, useState } from "react";

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
};

export type UseSpeechInputResult = {
  supported: boolean;
  listening: boolean;
  interim: string;
  /** The recognition error code (`not-allowed`, `no-speech`, ...) of the last session, or null. */
  error: string | null;
  start: () => void;
  stop: () => void;
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
    case "network":
      return "Voice input needs a network connection.";
    default:
      return "Voice input stopped. Try again.";
  }
}

export function useSpeechInput(options: UseSpeechInputOptions = {}): UseSpeechInputResult {
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
