import { useCallback, useMemo, useRef, useState } from "react";
import type { ChatHistoryItem } from "@hiro/niru-chat-kit/mui";
import { createConversation, seededConversations, seededLibrary, type DemoConversation } from "./conversations";

/**
 * The demo's conversations: a few past ones, plus whatever the visitor starts. Each has its own
 * in-memory transport, so switching back to one reopens exactly what was said.
 */
export function useWorkspace(speed: () => number) {
  const store = useRef<Map<string, DemoConversation>>(new Map());
  const [listed, setListed] = useState<string[]>(() => {
    const seeded = seededConversations(speed);
    seeded.forEach((conv) => store.current.set(conv.id, conv));
    return seeded.map((conv) => conv.id);
  });
  const [activeId, setActiveId] = useState<string>(() => {
    const fresh = createConversation(speed);
    store.current.set(fresh.id, fresh);
    return fresh.id;
  });
  const [version, bump] = useState(0);

  const active = store.current.get(activeId) as DemoConversation;

  const newChat = useCallback(() => {
    const current = store.current.get(activeId);
    // An empty draft is reused rather than piling up unused chats.
    if (current && !listed.includes(current.id) && current.transport.snapshot().length === 0) return;
    const fresh = createConversation(speed);
    store.current.set(fresh.id, fresh);
    setActiveId(fresh.id);
  }, [activeId, listed, speed]);

  /** Lists a draft once it has a first question. */
  const adopt = useCallback((id: string, firstQuestion: string) => {
    const conv = store.current.get(id);
    if (!conv) return;
    conv.title = conv.title || (firstQuestion.length > 40 ? `${firstQuestion.slice(0, 40)}...` : firstQuestion);
    conv.at = Date.now();
    setListed((ids) => (ids.includes(id) ? ids : [id, ...ids]));
  }, []);

  const rename = useCallback((id: string, title: string) => {
    const conv = store.current.get(id);
    if (conv) conv.title = title;
    bump((n) => n + 1);
  }, []);

  const remove = useCallback(
    (id: string) => {
      store.current.delete(id);
      setListed((ids) => ids.filter((item) => item !== id));
      if (id === activeId) {
        const fresh = createConversation(speed);
        store.current.set(fresh.id, fresh);
        setActiveId(fresh.id);
      }
    },
    [activeId, speed]
  );

  /** The pins and saved items the demo starts with, built from the seeded chats. */
  const seedLibrary = useCallback(() => seededLibrary(listed.map((id) => store.current.get(id)).filter((conv): conv is DemoConversation => Boolean(conv))), [listed]);
  /** Whether a conversation exists in this visit. */
  const knows = useCallback((id: string) => store.current.has(id), []);

  const items: ChatHistoryItem[] = useMemo(
    () =>
      listed.flatMap((id) => {
        const conv = store.current.get(id);
        return conv ? [{ id, title: conv.title, at: conv.at }] : [];
      }),
    // `version` changes after a rename; the store itself is a ref.
    [listed, activeId, version]
  );

  return { active, activeId, items, select: setActiveId, newChat, adopt, rename, remove, seedLibrary, knows };
}
