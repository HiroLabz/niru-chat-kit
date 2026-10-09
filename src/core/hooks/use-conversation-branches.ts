"use client";

import { useCallback, useMemo, useState } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { ChatBranches } from "../transport";
import type { ChatMessage, ChatTurnActions } from "../types";

export type ForkKind = "regenerate" | "edit";

/** Server ids and branch positions of the newest turns, matched from the end by role. */
export function annotateFromMessages(local: ChatMessage[], rows: ChatMessage[]): ChatMessage[] {
  const next = [...local];
  let rowIndex = rows.length - 1;
  for (let index = next.length - 1; index >= 0 && rowIndex >= 0; index -= 1) {
    const row = rows[rowIndex];
    if (next[index].role !== row.role) break;
    const { serverId, status, siblingIds, siblingIndex, citationCheck } = row;
    next[index] = {
      ...next[index],
      serverId,
      status,
      siblingIds,
      siblingIndex,
      ...(citationCheck === undefined ? {} : { citationCheck }),
    };
    rowIndex -= 1;
  }
  return next;
}

export type UseConversationBranchesOptions<TParams = unknown> = {
  branches?: ChatBranches<TParams>;
  /** The app's current configuration, read when a call is made rather than captured. */
  readParams?: () => TParams | undefined;
  /** Off for a surface that shows no branch controls, so it makes no extra reads. */
  enabled: boolean;
  conversationIdRef: MutableRefObject<string | null>;
  hasConversation: boolean;
  busy: boolean;
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  adoptConversation: (conversationId: string) => void;
  /** Answers `message` on the active branch without echoing it as a new user turn. */
  answer: (message: string, regenerateMessageId?: string) => Promise<void>;
  fail: (message: string, replay: BranchReplay) => void;
};

/** A branch call that failed, as data, so Retry can make it again. */
export type BranchReplay =
  | { kind: "fork"; fork: ForkKind; messageId: string; content?: string }
  | { kind: "branch"; messageId: string };

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong. Try again.";
}

/**
 * Regenerate, edit and branch switching for a streamed chat.
 *
 * The server owns the tree: a fork records the question and hands back the branch to
 * show plus the message to run, and a switch hands back the branch outright. This hook
 * renders what it is given and never builds a branch locally.
 */
export function useConversationBranches<TParams = unknown>({
  branches,
  readParams,
  enabled,
  conversationIdRef,
  hasConversation,
  busy,
  setMessages,
  adoptConversation,
  answer,
  fail,
}: UseConversationBranchesOptions<TParams>) {
  const [pending, setPending] = useState(false);
  const active = enabled && branches !== undefined;

  const reload = useCallback(async () => {
    const conversationId = conversationIdRef.current;
    if (!active || !branches || !conversationId) return;
    try {
      const rows = await branches.load(conversationId, readParams?.());
      setMessages((prev) => annotateFromMessages(prev, rows));
    } catch {
      return;
    }
  }, [active, branches, conversationIdRef, readParams, setMessages]);

  const fork = useCallback(
    async (kind: ForkKind, messageId: string, content?: string) => {
      const conversationId = conversationIdRef.current;
      if (!conversationId || !branches) return;
      if (!branches.fork) {
        setMessages((prev) => {
          const at = prev.findIndex((message) => message.serverId === messageId);
          return at < 0 ? prev : prev.slice(0, at);
        });
        await answer("", messageId);
        return;
      }
      setPending(true);
      try {
        const out = await branches.fork(kind, conversationId, messageId, content, readParams?.());
        adoptConversation(out.conversationId);
        setMessages(out.messages);
        setPending(false);
        await answer(out.message);
      } catch (error) {
        setPending(false);
        fail(errorText(error), { kind: "fork", fork: kind, messageId, content });
      }
    },
    [adoptConversation, answer, branches, conversationIdRef, fail, readParams, setMessages]
  );

  const showSibling = useCallback(
    async (messageId: string) => {
      const conversationId = conversationIdRef.current;
      if (!conversationId || !branches) return;
      setPending(true);
      try {
        setMessages(await branches.switchTo(conversationId, messageId, readParams?.()));
      } catch (error) {
        fail(errorText(error), { kind: "branch", messageId });
      } finally {
        setPending(false);
      }
    },
    [branches, conversationIdRef, fail, readParams, setMessages]
  );

  const disabled = busy || pending;
  const canEdit = branches?.canEdit;
  const turnActions = useMemo<ChatTurnActions | null>(
    () =>
      active && hasConversation
        ? {
            disabled,
            onRegenerate: (messageId) => void fork("regenerate", messageId),
            onEdit: (messageId, content) => void fork("edit", messageId, content),
            ...(canEdit === false ? { canEdit: false } : {}),
            onSwitchBranch: (messageId) => void showSibling(messageId),
          }
        : null,
    [active, canEdit, disabled, fork, hasConversation, showSibling]
  );

  return { reload, pending, turnActions, fork, showSibling };
}
