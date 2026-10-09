"use client";

import { useRef } from "react";

/**
 * Wires suggestion pills to the message box: `fill` puts the picked text in the
 * draft and moves focus to the textarea (it never sends). Pass `inputRef` to
 * `PromptComposer`.
 */
export function useSuggestionFill(setDraft: (text: string) => void) {
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);
  function fill(text: string) {
    setDraft(text);
    inputRef.current?.focus();
  }
  return { inputRef, fill };
}
