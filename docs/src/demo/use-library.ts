import { useCallback, useEffect, useState } from "react";
import type { SavedItem } from "@hiro/niru-chat-kit/mui";
import type { DemoLibrary } from "./conversations";

/** The one key the demo keeps pins and saved items under. */
export const LIBRARY_KEY = "niru-chat-kit-demo:pin-and-save:v1";

function isSavedItem(value: unknown): value is SavedItem {
  const item = value as Partial<SavedItem> | null;
  return (
    typeof item === "object" &&
    item !== null &&
    typeof item.id === "string" &&
    (item.kind === "conversation" || item.kind === "message") &&
    typeof item.conversationId === "string" &&
    typeof item.title === "string" &&
    item.at !== undefined
  );
}

/** Reads the stored library; anything missing or damaged gives null, and the seed is used instead. */
function readLibrary(): DemoLibrary | null {
  try {
    const raw = window.localStorage.getItem(LIBRARY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DemoLibrary>;
    if (!Array.isArray(parsed.pinned) || !Array.isArray(parsed.saved)) return null;
    return { pinned: parsed.pinned.filter((id) => typeof id === "string"), saved: parsed.saved.filter(isSavedItem) };
  } catch {
    return null;
  }
}

export function resetLibrary(): void {
  try {
    window.localStorage.removeItem(LIBRARY_KEY);
  } catch {
    // Storage can be blocked; the page reload that follows then simply starts from the seed.
  }
}

/**
 * Pinned chats and saved chats and messages for the demo. The kit only draws and reports these,
 * so the demo keeps them here and in localStorage, and restores them on reload.
 */
export function useLibrary(seed: () => DemoLibrary) {
  const [library, setLibrary] = useState<DemoLibrary>(() => readLibrary() ?? seed());

  useEffect(() => {
    try {
      window.localStorage.setItem(LIBRARY_KEY, JSON.stringify(library));
    } catch {
      // Storage can be full or blocked; the demo still works for this visit.
    }
  }, [library]);

  const setPinned = useCallback((id: string, pinned: boolean) => {
    // The newest pin goes first.
    setLibrary((current) => ({
      ...current,
      pinned: pinned ? [id, ...current.pinned.filter((item) => item !== id)] : current.pinned.filter((item) => item !== id),
    }));
  }, []);

  const toggleSavedChat = useCallback((conversationId: string, title: string) => {
    setLibrary((current) => {
      const existing = current.saved.find((item) => item.kind === "conversation" && item.conversationId === conversationId);
      if (existing) return { ...current, saved: current.saved.filter((item) => item !== existing) };
      const item: SavedItem = { id: `chat-${conversationId}-${Date.now()}`, kind: "conversation", conversationId, title, at: Date.now() };
      return { ...current, saved: [item, ...current.saved] };
    });
  }, []);

  const toggleSavedMessage = useCallback((conversationId: string, title: string, messageId: string, text: string) => {
    setLibrary((current) => {
      const existing = current.saved.find((item) => item.kind === "message" && item.messageId === messageId);
      if (existing) return { ...current, saved: current.saved.filter((item) => item !== existing) };
      const preview = text.replace(/\s+/g, " ").trim();
      const item: SavedItem = {
        id: `message-${messageId}-${Date.now()}`,
        kind: "message",
        conversationId,
        messageId,
        title,
        text: preview.length > 140 ? `${preview.slice(0, 140)}...` : preview,
        at: Date.now(),
      };
      return { ...current, saved: [item, ...current.saved] };
    });
  }, []);

  const unsave = useCallback((target: SavedItem) => {
    setLibrary((current) => ({ ...current, saved: current.saved.filter((item) => item.id !== target.id) }));
  }, []);

  return { pinned: library.pinned, saved: library.saved, setPinned, toggleSavedChat, toggleSavedMessage, unsave };
}
