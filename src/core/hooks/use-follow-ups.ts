"use client";

import { useCallback, useState } from "react";

const MAX_FOLLOW_UPS = 3;

/**
 * The AI follow-ups for the newest settled assistant reply, from the `suggestions`
 * frame. Held outside the transcript so history loaded from the server never has any,
 * and cleared the moment the next message is sent.
 */
export function useFollowUps() {
  const [followUps, setItems] = useState<string[]>([]);
  const setFollowUps = useCallback((items: unknown) => {
    const list = Array.isArray(items) ? items : [];
    setItems(
      list
        .filter((item): item is string => typeof item === "string" && item.trim() !== "")
        .slice(0, MAX_FOLLOW_UPS)
    );
  }, []);
  const clearFollowUps = useCallback(() => setItems((prev) => (prev.length ? [] : prev)), []);
  return { followUps, setFollowUps, clearFollowUps };
}
