"use client";

import { useCallback, useRef, useState } from "react";

export type RunIds = {
  conversation_id?: string | null;
  thread_id?: string | null;
  principal_id?: string | null;
};

/**
 * The conversation, thread and principal a chat is talking on. Held as state for the
 * surface and as refs for the next request, which must never wait for a re-render.
 */
export function useRunIds(initialConversationId?: string | null, initialThreadId?: string | null) {
  const [conversationId, setConversationId] = useState<string | null>(initialConversationId ?? null);
  const [threadId, setThreadId] = useState<string | null>(initialThreadId ?? null);
  const [principalId, setPrincipalId] = useState<string | null>(null);
  const conversationIdRef = useRef<string | null>(initialConversationId ?? null);
  const threadIdRef = useRef<string | null>(initialThreadId ?? null);

  const adoptConversation = useCallback((id: string) => {
    conversationIdRef.current = id;
    setConversationId(id);
  }, []);

  const applyRunIds = useCallback(
    (ids: RunIds) => {
      if (ids.conversation_id) adoptConversation(ids.conversation_id);
      if (ids.thread_id) {
        threadIdRef.current = ids.thread_id;
        setThreadId(ids.thread_id);
      }
      if (ids.principal_id) setPrincipalId(ids.principal_id);
    },
    [adoptConversation]
  );

  return {
    conversationId,
    threadId,
    principalId,
    conversationIdRef,
    threadIdRef,
    adoptConversation,
    applyRunIds,
  };
}
