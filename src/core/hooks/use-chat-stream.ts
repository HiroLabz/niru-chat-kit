"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { APPROVAL_INTERRUPT_KIND, approvalAnswerLabel } from "../approval-answers";
import { filesFromRow, readCitationCheck } from "../history";
import { shapingFromResult } from "../stream/parse-sse";
import { ChatTransportError } from "../transport";
import type { ChatTransport } from "../transport";
import {
  type AgentStreamStatus,
  type Interrupt,
  type InvokeResponse,
} from "../types";
import type { ChatReplay, UseChatStreamOptions } from "./chat-stream-options";
import { useFollowUps } from "./use-follow-ups";
import { useConversationBranches } from "./use-conversation-branches";
import { useFrameConsumer } from "./use-frame-consumer";
import { useRunIds } from "./use-run-ids";
import { useStreamFailure } from "./use-stream-failure";
import { useStreamTranscript } from "./use-stream-transcript";

export type { UseChatStreamOptions, ChatReplay };

/**
 * A streamed chat over any {@link ChatTransport}: the transcript, run state, follow-ups,
 * retry, stop and, with `branching`, regenerate, edit and version switching. It knows
 * no URL; everything that leaves the page goes through `transport`.
 */
export function useChatStream<TParams extends object = Record<string, unknown>>(
  transport: ChatTransport<TParams>,
  {
    params,
    initialMessages,
    initialConversationId,
    initialThreadId,
    branching = false,
  }: UseChatStreamOptions<TParams> = {}
) {
  const transcript = useStreamTranscript(initialMessages);
  const { setMessages, pendingIdRef, appendTurn, dropPending } = transcript;
  const failure = useStreamFailure();
  const { record: recordFailure, clear: clearFailure } = failure;
  const [status, setStatus] = useState<AgentStreamStatus>("idle");
  const [interrupt, setInterrupt] = useState<Interrupt | null>(null);
  const [result, setResult] = useState<InvokeResponse | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const { followUps, setFollowUps, clearFollowUps } = useFollowUps();
  const ids = useRunIds(initialConversationId, initialThreadId);
  const { conversationIdRef, threadIdRef, adoptConversation, applyRunIds } = ids;

  const startedAtRef = useRef<number | null>(null);
  const runIdRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  /**
   * Replays the turn that failed, whole: an approval carries the values typed into
   * the form, and replaying only the answer once turned "approve the 250 refund"
   * into a bare `ask_user` "approve" with the amounts silently dropped.
   */
  const replayRef = useRef<ChatReplay<TParams> | null>(null);
  const paramsRef = useRef(params);
  useEffect(() => {
    paramsRef.current = params;
  }, [params]);

  const fail = useCallback(
    (message: string, replay?: ChatReplay<TParams>, cause?: unknown) => {
      if (cause instanceof ChatTransportError) recordFailure(message, cause.code, cause.status);
      else recordFailure(message);
      if (replay) replayRef.current = replay;
      setStatus("error");
    },
    [recordFailure]
  );

  const recordLatency = useCallback(() => {
    if (startedAtRef.current != null) {
      setLatencyMs(Math.round(performance.now() - startedAtRef.current));
    }
  }, []);

  const { consume } = useFrameConsumer({
    transcript,
    fail,
    applyRunIds,
    setFollowUps,
    setStatus,
    setInterrupt,
    setResult,
    recordLatency,
    runIdRef,
  });

  const beginTurn = useCallback(
    (replay: ChatReplay<TParams>) => {
      clearFailure();
      setLatencyMs(null);
      startedAtRef.current = performance.now();
      replayRef.current = replay;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setStatus("connecting");
      return controller;
    },
    [clearFailure]
  );

  const applyInvokeResponse = useCallback(
    (data: InvokeResponse) => {
      applyRunIds(data);
      const text = data.message || data.interrupt?.question || "";
      appendTurn({
        role: "assistant",
        text,
        citations: data.citations,
        citationCheck: readCitationCheck(data.citation_check),
        ...shapingFromResult(data),
        ...filesFromRow(data.files),
      });
      setResult(data);
      recordLatency();
      if (data.status === "needs_input" && data.interrupt) {
        setInterrupt(data.interrupt);
        setStatus("needs_input");
      } else {
        setStatus("done");
      }
    },
    [appendTurn, applyRunIds, recordLatency]
  );

  const reloadRef = useRef<() => Promise<void>>(async () => undefined);

  /**
   * `echo` adds the message as a user turn; a regenerated or edited question is already
   * on the branch the server returned, so it runs without one.
   */
  const run = useCallback(
    async (message: string, overrides?: Partial<TParams>, echo = true, regenerateId?: string) => {
      setInterrupt(null);
      setResult(null);
      clearFollowUps();
      const controller = beginTurn({ kind: "run", message, overrides, echo, regenerateId });
      if (echo) appendTurn({ role: "user", text: message });
      try {
        const turn = {
          message,
          conversationId: conversationIdRef.current,
          startNewConversation: conversationIdRef.current === null,
          params: { ...paramsRef.current, ...overrides } as TParams,
        };
        const regenerating = regenerateId ? { ...turn, regenerate: { messageId: regenerateId } } : null;
        const frames = regenerating
          ? await (transport.regenerate
              ? transport.regenerate(regenerating, controller.signal)
              : transport.send(regenerating, controller.signal))
          : await transport.send(turn, controller.signal);
        if (await consume(frames, controller.signal)) await reloadRef.current();
      } catch (err) {
        if (!controller.signal.aborted) {
          fail(err instanceof Error ? err.message : "Connection failed", undefined, err);
        }
      }
    },
    [appendTurn, beginTurn, clearFollowUps, consume, conversationIdRef, fail, transport]
  );

  /**
   * `overrides` apply to this turn only, so a one-click re-run with a different response
   * schema does not wait for the settings state it also updates to land.
   */
  const send = useCallback(
    (message: string, overrides?: Partial<TParams>) => run(message, overrides),
    [run]
  );

  const answerOnBranch = useCallback(
    (message: string, regenerateId?: string) => run(message, undefined, false, regenerateId),
    [run]
  );

  /**
   * `interruptKind` is passed by a replay alone: it runs long after `setInterrupt(null)`
   * below, so this callback's own `interrupt` is null by then and a replayed approval
   * would be re-sent as a bare `ask_user` answer against a paused approval.
   */
  const resume = useCallback(
    async (answer: string, values?: Record<string, unknown>, interruptKind?: string) => {
      const activeConversation = conversationIdRef.current;
      if (!activeConversation || !transport.resume) return;
      const kind = interruptKind ?? interrupt?.kind ?? "ask_user";
      const controller = beginTurn({ kind: "resume", answer, values, interruptKind: kind });
      clearFollowUps();
      setInterrupt(null);
      appendTurn({
        role: "user",
        text: kind === APPROVAL_INTERRUPT_KIND ? approvalAnswerLabel(answer) : answer,
      });
      try {
        const data = await transport.resume(
          {
            conversationId: activeConversation,
            threadId: threadIdRef.current,
            interruptKind: kind,
            answer,
            values,
          },
          controller.signal
        );
        applyInvokeResponse(data);
        await reloadRef.current();
      } catch (err) {
        if (!controller.signal.aborted) {
          fail(err instanceof Error ? err.message : "Connection failed", undefined, err);
        }
      }
    },
    [appendTurn, applyInvokeResponse, beginTurn, clearFollowUps, conversationIdRef, fail, interrupt, threadIdRef, transport]
  );

  /**
   * Aborts an in-flight turn when the surface unmounts, so an orphaned request does not
   * keep streaming tokens into a dead component. Deliberately not `abort()`, which also
   * touches state.
   */
  useEffect(() => () => abortRef.current?.abort(), []);

  const abort = useCallback(() => {
    abortRef.current?.abort();
    const id = pendingIdRef.current;
    if (id) dropPending(id);
    setStatus("idle");
  }, [dropPending, pendingIdRef]);

  /**
   * Stops the run and keeps its partial answer. With a run id the server is asked to
   * stop and the stream stays open for its `stopped` result frame; without one, or when
   * the server cannot stop it, the connection is dropped instead.
   */
  const stop = useCallback(async () => {
    const runId = runIdRef.current;
    if (runId && (await transport.stop(runId))) return;
    if (runIdRef.current === runId) abort();
  }, [abort, transport]);

  const busy = status === "connecting" || status === "streaming";
  const readParams = useCallback(() => paramsRef.current, []);
  const branches = useConversationBranches({
    branches: transport.branches,
    readParams,
    enabled: branching,
    conversationIdRef,
    hasConversation: ids.conversationId !== null,
    busy,
    setMessages,
    adoptConversation,
    answer: answerOnBranch,
    fail,
  });
  useEffect(() => {
    reloadRef.current = branches.reload;
  }, [branches.reload]);

  const { fork } = branches;
  const { turnActions: branchActions, showSibling: switchSibling } = branches;
  /** Follow-ups belonged to the reply that was on screen; another sibling gets none. */
  const showSibling = useCallback(
    async (messageId: string) => {
      clearFollowUps();
      await switchSibling(messageId);
    },
    [clearFollowUps, switchSibling]
  );
  const turnActions = useMemo(
    () => (branchActions ? { ...branchActions, onSwitchBranch: (id: string) => void showSibling(id) } : null),
    [branchActions, showSibling]
  );
  const retry = useCallback(() => {
    const replay = replayRef.current;
    if (replay?.kind === "run") void run(replay.message, replay.overrides, replay.echo, replay.regenerateId);
    else if (replay?.kind === "resume") void resume(replay.answer, replay.values, replay.interruptKind);
    else if (replay?.kind === "fork") void fork(replay.fork, replay.messageId, replay.content);
    else if (replay?.kind === "branch") void showSibling(replay.messageId);
  }, [fork, resume, run, showSibling]);

  return {
    messages: transcript.messages,
    status,
    interrupt,
    error: failure.error,
    errorCode: failure.errorCode,
    errorStatus: failure.errorStatus,
    result,
    latencyMs,
    followUps,
    conversationId: ids.conversationId,
    threadId: ids.threadId,
    principalId: ids.principalId,
    send,
    resume,
    retry,
    abort,
    stop,
    turnActions,
    branchPending: branches.pending,
  };
}
