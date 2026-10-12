"use client";

import { useLayoutEffect, useState, type RefObject } from "react";

/**
 * True while the element is measured and narrower than `below` px. Measures the element itself,
 * not the screen, so a composer in a narrow side panel collapses too. Before the first
 * measurement, where nothing can be measured (a server render, jsdom) and without
 * `ResizeObserver`, it is false: the wide layout.
 */
export function useNarrowBox(ref: RefObject<HTMLElement | null>, below: number): boolean {
  const [narrow, setNarrow] = useState(false);
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const measure = () => {
      const width = node.getBoundingClientRect().width;
      setNarrow(width > 0 && width < below);
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref, below]);
  return narrow;
}
