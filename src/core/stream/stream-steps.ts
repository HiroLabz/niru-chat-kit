"use client";

import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import {
  applyThinkingFrame,
  applyToolFrame,
  settleRunningSteps,
} from "./apply-tool-frame";
import type { ChatMessage, AgentStreamEvent } from "../types";
import {
  applyThinkingFrameToParts,
  applyToolFrameToParts,
  appendReasoningPart,
  settleRunningParts,
} from "./turn-parts";
import type { TurnPart } from "./turn-parts";
import type { WorkingStep } from "../working-process";

/**
 * Keeps one streamed message's `steps` in sync with incoming `tool` and `thinking`
 * frames, and settles them when the stream itself ends. Split out of
 * `use-agent-stream.ts` to keep that file under the file-size cap (apps/web/CLAUDE.md)
 * — behaviour is unchanged, just relocated.
 *
 * Every callback here only ever touches the message it is given, preserving every
 * other turn's identity so `MessageBubble`'s memo is undisturbed.
 */
export function useStepFrames(
  transcript: {
    setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
    dropPending: (id: string) => void;
    finishAssistant: (id: string) => void;
  },
  fail: (message: string) => void
) {
  const { setMessages, dropPending, finishAssistant } = transcript;
  const applyStep = useCallback(
    (
      messageId: string,
      reduce: (steps: WorkingStep[]) => WorkingStep[],
      reduceParts: (parts: TurnPart[] | undefined) => TurnPart[]
    ) =>
      setMessages((prev) =>
        prev.map((message) =>
          message.id === messageId
            ? { ...message, steps: reduce(message.steps ?? []), parts: reduceParts(message.parts) }
            : message
        )
      ),
    [setMessages]
  );

  /** Folds a `reasoning` delta into the message's parts only; `text` and `steps` never see it. */
  const appendReasoning = useCallback(
    (messageId: string, frame: { id: string; text: string }) =>
      setMessages((prev) =>
        prev.map((message) =>
          message.id === messageId
            ? { ...message, parts: appendReasoningPart(message.parts, frame) }
            : message
        )
      ),
    [setMessages]
  );

  /** Folds a `tool` or `thinking` frame into `messageId`'s steps; a no-op otherwise. */
  const handleFrame = useCallback(
    (messageId: string, evt: AgentStreamEvent) => {
      if (evt.event === "tool") {
        const data = evt.data;
        applyStep(
          messageId,
          (steps) => applyToolFrame(steps, data),
          (parts) => applyToolFrameToParts(parts, messageId, data)
        );
      } else if (evt.event === "reasoning") {
        appendReasoning(messageId, evt.data);
      } else if (evt.event === "thinking") {
        const data = evt.data;
        applyStep(
          messageId,
          (steps) => applyThinkingFrame(steps, data),
          (parts) => applyThinkingFrameToParts(parts, messageId, data)
        );
      }
    },
    [appendReasoning, applyStep]
  );

  /**
   * Settles whatever step is still `running` on one message, so a run that ends in
   * `needs_input`, Stop or an error never leaves a tool spinning. No-ops (same message
   * reference) when nothing is running, so `MessageBubble`'s memo is undisturbed.
   */
  const settleSteps = useCallback(
    (id: string, status: "interrupted" | "error") => {
      setMessages((prev) =>
        prev.map((message) => {
          if (message.id !== id || !message.steps) return message;
          const steps = settleRunningSteps(message.steps, status);
          const parts = message.parts ? settleRunningParts(message.parts, status) : message.parts;
          return steps === message.steps && parts === message.parts ? message : { ...message, steps, parts };
        })
      );
    },
    [setMessages]
  );

  /**
   * An error, a dropped connection or a stream that ends with no terminal frame all
   * leave the run unfinished — any step still `running` settles to `error` too.
   */
  const settleOnStreamEnd = useCallback(
    (messageId: string, aborted: boolean, message: string | null) => {
      if (aborted) return dropPending(messageId);
      finishAssistant(messageId);
      settleSteps(messageId, "error");
      if (message) fail(message);
    },
    [dropPending, fail, finishAssistant, settleSteps]
  );

  return { handleFrame, settleSteps, settleOnStreamEnd };
}
