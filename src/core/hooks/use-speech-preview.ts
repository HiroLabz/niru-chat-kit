"use client";

/**
 * A live preview of what is being said, from the browser's own speech recognition. It is only ever
 * shown: it is never sent anywhere and never becomes the final text. Where the browser has no
 * recognition it stays empty and raises nothing.
 */

import { useEffect, useState } from "react";

type RecognitionResult = ArrayLike<{ transcript: string }> & { isFinal: boolean };
type PreviewRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: { results: ArrayLike<RecognitionResult> }) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onend: ((event: unknown) => void) | null;
  start: () => void;
  abort: () => void;
};

function recognitionConstructor(): (new () => PreviewRecognition) | null {
  if (typeof window === "undefined") return null;
  const scope = window as unknown as { SpeechRecognition?: new () => PreviewRecognition; webkitSpeechRecognition?: new () => PreviewRecognition };
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null;
}

/** The words heard so far while `active`; cleared as soon as it is not. */
export function useSpeechPreview(active: boolean, lang?: string): string {
  const [preview, setPreview] = useState("");
  useEffect(() => {
    const Recognition = active ? recognitionConstructor() : null;
    if (!Recognition) {
      setPreview("");
      return;
    }
    let live = true;
    let session: PreviewRecognition | null = null;
    const begin = () => {
      const recognition = new Recognition();
      if (lang) recognition.lang = lang;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.onresult = (event) => {
        let text = "";
        for (let i = 0; i < event.results.length; i += 1) text += event.results[i][0]?.transcript ?? "";
        if (live) setPreview(text.trim());
      };
      recognition.onerror = () => undefined;
      recognition.onend = () => {
        if (!live || session !== recognition) return;
        try {
          begin();
        } catch {
          session = null;
        }
      };
      session = recognition;
      recognition.start();
    };
    try {
      begin();
    } catch {
      session = null;
    }
    return () => {
      live = false;
      const current = session;
      session = null;
      if (current) {
        current.onresult = null;
        current.onerror = null;
        current.onend = null;
        try {
          current.abort();
        } catch {
          return;
        }
      }
      setPreview("");
    };
  }, [active, lang]);
  return preview;
}
