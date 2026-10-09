"use client";

import { useCallback, useRef, useState } from "react";
import type { ChatMessage } from "../types";
import { appendTokenPart } from "../stream/turn-parts";

export function newId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

/**
 * The transcript a streamed chat renders, and the edits a run makes to it.
 *
 * Every edit preserves the identity of the turns it does not touch: `MessageBubble` is
 * memoized on that, and streaming calls `appendToken` once per SSE token.
 */
export function useStreamTranscript(initialMessages?: ChatMessage[]) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => initialMessages ?? []);
  const pendingIdRef = useRef<string | null>(null);

  const appendTurn = useCallback((message: Omit<ChatMessage, "id" | "at">) => {
    setMessages((prev) => [...prev, { id: newId(), at: Date.now(), ...message }]);
  }, []);

  const beginAssistant = useCallback(() => {
    const id = newId();
    pendingIdRef.current = id;
    setMessages((prev) => [
      ...prev,
      { id, role: "assistant", text: "", pending: true, at: Date.now() },
    ]);
    return id;
  }, []);

  const appendToken = useCallback((id: string, text: string) => {
    setMessages((prev) =>
      prev.map((message) =>
        message.id === id
          ? { ...message, text: message.text + text, parts: appendTokenPart(message.parts, id, text) }
          : message
      )
    );
  }, []);

  /**
   * Settles the in-flight bubble. `fallbackText` fills a bubble that streamed nothing: a
   * model that pauses on `needs_input` with no narration would otherwise render blank
   * above the interrupt banner that carries the real question (21-2).
   */
  const finishAssistant = useCallback(
    (id: string, patch?: (message: ChatMessage) => Partial<ChatMessage>, fallbackText?: string) => {
      setMessages((prev) =>
        prev.map((message) =>
          message.id === id
            ? {
                ...message,
                pending: false,
                settledAt: Date.now(),
                text: message.text || fallbackText || message.text,
                ...(patch ? patch(message) : {}),
              }
            : message
        )
      );
      if (pendingIdRef.current === id) pendingIdRef.current = null;
    },
    []
  );

  /**
   * An aborted or superseded bubble keeps what it streamed, marked as stopped (the server
   * stores the same partial answer), and disappears when it streamed nothing.
   */
  const dropPending = useCallback((id: string) => {
    setMessages((prev) =>
      prev.flatMap((message) => {
        if (message.id !== id) return [message];
        return message.text ? [{ ...message, pending: false, settledAt: Date.now(), status: "stopped" as const }] : [];
      })
    );
    if (pendingIdRef.current === id) pendingIdRef.current = null;
  }, []);

  return {
    messages,
    setMessages,
    pendingIdRef,
    appendTurn,
    beginAssistant,
    appendToken,
    finishAssistant,
    dropPending,
  };
}
