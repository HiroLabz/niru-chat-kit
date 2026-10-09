"use client";

import { useCallback } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { resultFields } from "../history";
import { useStepFrames } from "../stream/stream-steps";
import type { AgentStreamEvent, AgentStreamStatus, Interrupt, InvokeResponse } from "../types";
import type { RunIds } from "./use-run-ids";
import type { useStreamTranscript } from "./use-stream-transcript";

type Transcript = ReturnType<typeof useStreamTranscript>;

export type FrameConsumerDeps = {
  transcript: Transcript;
  fail: (message: string) => void;
  applyRunIds: (ids: RunIds) => void;
  setFollowUps: (items: unknown) => void;
  setStatus: Dispatch<SetStateAction<AgentStreamStatus>>;
  setInterrupt: Dispatch<SetStateAction<Interrupt | null>>;
  setResult: Dispatch<SetStateAction<InvokeResponse | null>>;
  recordLatency: () => void;
  runIdRef: MutableRefObject<string | null>;
};

/**
 * Reads one run's frames to their end, folding each into the transcript. The returned
 * `consume` resolves true when the run settled on a `result` frame. Split out of
 * `useChatStream` to keep that file under the size cap.
 */
export function useFrameConsumer({
  transcript,
  fail,
  applyRunIds,
  setFollowUps,
  setStatus,
  setInterrupt,
  setResult,
  recordLatency,
  runIdRef,
}: FrameConsumerDeps) {
  const { beginAssistant, appendToken, finishAssistant } = transcript;
  const { handleFrame, settleSteps, settleOnStreamEnd } = useStepFrames(transcript, fail);

  const consume = useCallback(
    async (frames: AsyncIterable<AgentStreamEvent>, signal: AbortSignal): Promise<boolean> => {
      setStatus("streaming");
      const messageId = beginAssistant();
      let ownRunId: string | null = null;
      let terminal: "result" | "other" | null = null;
      try {
        for await (const evt of frames) {
          if (evt.event === "status") {
            applyRunIds(evt.data);
            ownRunId = evt.data.run_id ?? null;
            runIdRef.current = ownRunId;
          } else if (evt.event === "token") {
            appendToken(messageId, evt.data.text);
          } else if (evt.event === "tool" || evt.event === "thinking" || evt.event === "reasoning") {
            handleFrame(messageId, evt);
          } else if (evt.event === "suggestions") {
            setFollowUps(evt.data.items);
          } else if (evt.event === "needs_input") {
            terminal = "other";
            finishAssistant(messageId, undefined, evt.data.interrupt?.question);
            settleSteps(messageId, "interrupted");
            setInterrupt(evt.data.interrupt);
            setStatus("needs_input");
          } else if (evt.event === "result") {
            terminal = "result";
            const data = evt.data;
            finishAssistant(messageId, (message) => resultFields(data, message.text));
            if (data.status === "stopped") settleSteps(messageId, "interrupted");
            setResult({ ...data, status: data.status === "stopped" ? "completed" : data.status });
            recordLatency();
          } else if (evt.event === "error") {
            terminal = "other";
            settleOnStreamEnd(messageId, signal.aborted, evt.data.message);
          } else if (evt.event === "done") {
            terminal = terminal ?? "other";
            setStatus((current) => (current === "needs_input" || current === "error" ? current : "done"));
          }
        }
        if (!terminal) {
          settleOnStreamEnd(messageId, signal.aborted, "The connection ended before the run finished.");
        }
      } catch (err) {
        settleOnStreamEnd(messageId, signal.aborted, err instanceof Error ? err.message : "Stream failed");
      } finally {
        if (runIdRef.current === ownRunId) runIdRef.current = null;
      }
      return terminal === "result";
    },
    [
      appendToken,
      applyRunIds,
      beginAssistant,
      finishAssistant,
      handleFrame,
      recordLatency,
      runIdRef,
      setFollowUps,
      setInterrupt,
      setResult,
      setStatus,
      settleOnStreamEnd,
      settleSteps,
    ]
  );

  return { consume };
}
