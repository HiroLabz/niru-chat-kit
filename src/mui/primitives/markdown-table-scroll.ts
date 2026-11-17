"use client";

import { useCallback, useLayoutEffect, useState, type RefObject } from "react";

/** A table this tall (px) or taller also gets a scrollbar above it: the one below may be out of view. */
export const TALL_TABLE_PX = 240;

/** The variable that holds the scroller's own scrollbar thickness, so the edge fade stops above it. */
export const SCROLLBAR_VARIABLE = "--nck-table-bar";

export type TableOverflow = {
  /** The table is wider than its box and scrolls sideways. */
  overflowing: boolean;
  /** Tall enough that the scrollbar below it can be out of view. */
  tall: boolean;
  /** The table's full scroll width, in px: the width of the mirrored scrollbar's content. */
  contentWidth: number;
};

const NONE: TableOverflow = { overflowing: false, tall: false, contentWidth: 0 };

function toggle(el: HTMLElement, name: string, on: boolean) {
  if (on) el.setAttribute(name, "");
  else el.removeAttribute(name);
}

/**
 * Watches the table's scroller. While the table is wider than its box it marks the scroller
 * `data-overflow`, plus `data-more-left` / `data-more-right` (physical sides, so RTL needs
 * nothing special) while there is hidden content on that side; the styles fade that edge.
 * Returns whether it overflows (for the Expand button and the mirrored scrollbar) and keeps
 * `mirrorRef`, a second scroller above a tall table, in step with it both ways.
 */
export function useTableOverflow(
  scrollRef: RefObject<HTMLDivElement | null>,
  tableRef: RefObject<HTMLTableElement | null>,
  mirrorRef: RefObject<HTMLDivElement | null>
) {
  const [state, setState] = useState<TableOverflow>(NONE);

  useLayoutEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;

    const update = () => {
      const max = scroller.scrollWidth - scroller.clientWidth;
      const overflowing = max > 1;
      // In RTL `scrollLeft` runs from 0 (start, on the right) to -max.
      const rtl = getComputedStyle(scroller).direction === "rtl";
      const offset = Math.abs(scroller.scrollLeft);
      const hiddenStart = offset;
      const hiddenEnd = max - offset;
      const hiddenLeft = rtl ? hiddenEnd : hiddenStart;
      const hiddenRight = rtl ? hiddenStart : hiddenEnd;
      toggle(scroller, "data-overflow", overflowing);
      toggle(scroller, "data-more-left", overflowing && hiddenLeft > 1);
      toggle(scroller, "data-more-right", overflowing && hiddenRight > 1);
      const bar = Math.max(0, scroller.offsetHeight - scroller.clientHeight);
      scroller.style.setProperty(SCROLLBAR_VARIABLE, `${bar}px`);
      const next: TableOverflow = overflowing
        ? { overflowing, tall: scroller.clientHeight >= TALL_TABLE_PX, contentWidth: scroller.scrollWidth }
        : NONE;
      setState((previous) =>
        previous.overflowing === next.overflowing && previous.tall === next.tall && previous.contentWidth === next.contentWidth
          ? previous
          : next
      );
    };

    const onScroll = () => {
      const mirror = mirrorRef.current;
      if (mirror && Math.abs(mirror.scrollLeft - scroller.scrollLeft) >= 1) mirror.scrollLeft = scroller.scrollLeft;
      update();
    };

    update();
    scroller.addEventListener("scroll", onScroll, { passive: true });
    let observer: ResizeObserver | undefined;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(update);
      observer.observe(scroller);
      if (tableRef.current) observer.observe(tableRef.current);
    }
    return () => {
      scroller.removeEventListener("scroll", onScroll);
      observer?.disconnect();
    };
  }, [scrollRef, tableRef, mirrorRef]);

  /** The mirrored scrollbar moved: move the table with it. */
  const onMirrorScroll = useCallback(() => {
    const scroller = scrollRef.current;
    const mirror = mirrorRef.current;
    if (scroller && mirror && Math.abs(scroller.scrollLeft - mirror.scrollLeft) >= 1) scroller.scrollLeft = mirror.scrollLeft;
  }, [scrollRef, mirrorRef]);

  /** The mirror just mounted: start it where the table is. */
  const syncMirror = useCallback(() => {
    const scroller = scrollRef.current;
    const mirror = mirrorRef.current;
    if (scroller && mirror) mirror.scrollLeft = scroller.scrollLeft;
  }, [scrollRef, mirrorRef]);

  return { ...state, onMirrorScroll, syncMirror };
}
