"use client";

import { useEffect, useRef, type RefObject } from "react";

/**
 * Calls `dismiss` when the pointer goes down anywhere outside `rootRef` while `active`,
 * like any combobox popup. A ref keeps the listener current without re-subscribing.
 */
export function useDismissOnOutsidePointer(rootRef: RefObject<HTMLElement | null>, active: boolean, dismiss: () => void): void {
  const latest = useRef(dismiss);
  useEffect(() => {
    latest.current = dismiss;
  }, [dismiss]);
  useEffect(() => {
    if (!active) return;
    function handlePointerDown(event: MouseEvent) {
      if (rootRef.current?.contains(event.target as Node)) return;
      latest.current();
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [active, rootRef]);
}
