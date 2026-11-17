"use client";

import { useLayoutEffect, useRef, type RefObject } from "react";

/**
 * Marks a scroll area whose turns sit in a narrower centred column (`Conversation` with
 * `columnMaxWidth`). A markdown table inside it may grow past the column into the free space
 * on either side, up to the area's width less a gutter, and scrolls on its own beyond that.
 */
export const WIDE_AREA_ATTRIBUTE = "data-chat-wide-area";

/** The space kept between a table that broke out of the column and the scroll area's edge, in px. */
export const WIDE_AREA_GUTTER_PX = 24;

/** The space kept under an avatar a table would otherwise run into, in px. */
const AVATAR_CLEARANCE_PX = 8;

type Geometry = { pull: number; area: number; before: number; after: number; clear: number };

export const BREAKOUT_VARIABLES = {
  pull: "--nck-table-pull",
  area: "--nck-table-area",
  before: "--nck-table-before",
  after: "--nck-table-after",
  clear: "--nck-table-clear",
} as const;

function px(value: string) {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Whether the reply sits in a visible bubble (a tinted surface): a table cannot leave a box the
 * person can see without looking broken, so there it stays inside and scrolls.
 */
function drawsBubble(wrapper: HTMLElement): boolean {
  const bubble = wrapper.closest<HTMLElement>("[data-chat-bubble]");
  if (!bubble) return false;
  const colour = getComputedStyle(bubble).backgroundColor.replace(/\s/g, "");
  if (colour === "" || colour === "transparent") return false;
  const alpha = /^rgba\([^)]*,([\d.]+)\)$/.exec(colour);
  return !alpha || parseFloat(alpha[1]) > 0;
}

/**
 * Where the wide area starts relative to the column the table sits in, how wide it is, and the
 * flex bases that place the table: a table no wider than the column stays where text starts; a
 * wider one grows evenly to both sides of the column, and is pushed back inside the area when
 * one side runs out. `null` when there is no room to grow into.
 */
function measure(wrapper: HTMLElement, area: HTMLElement): Omit<Geometry, "clear"> | null {
  const column = wrapper.parentElement;
  if (!column || drawsBubble(wrapper)) return null;
  const areaStyle = getComputedStyle(area);
  const rtl = areaStyle.direction === "rtl";
  const areaBox = area.getBoundingClientRect();
  const innerStart = areaBox.left + area.clientLeft;
  const startGutter = Math.min(WIDE_AREA_GUTTER_PX, px(areaStyle.paddingLeft));
  const endGutter = Math.min(WIDE_AREA_GUTTER_PX, px(areaStyle.paddingRight));
  const left = innerStart + startGutter;
  const right = innerStart + area.clientWidth - endGutter;

  const columnStyle = getComputedStyle(column);
  const columnBox = column.getBoundingClientRect();
  const columnLeft = columnBox.left + column.clientLeft + px(columnStyle.paddingLeft);
  const columnWidth = column.clientWidth - px(columnStyle.paddingLeft) - px(columnStyle.paddingRight);
  const columnRight = columnLeft + columnWidth;

  const width = right - left;
  const pull = rtl ? right - columnRight : columnLeft - left;
  // Only free space beside the turns counts: where the turns already reach the gutter (a phone,
  // a side panel) the table stays in the reply's column, as it always did.
  const turnsWidth = area.clientWidth - px(areaStyle.paddingLeft) - px(areaStyle.paddingRight);
  if (width <= Math.max(columnWidth, turnsWidth) + 0.5 || pull < -0.5 || pull + columnWidth > width + 0.5) return null;
  // Twice the turn's centre (avatar and reply together, the column the person reads), measured
  // from the area's start. Two spacers on either side of the table share the free space evenly
  // from these bases, which centres the table on it; a spacer only ever shrinks from its own
  // basis, which stops the table at the area's edge.
  const turnBox = (wrapper.closest("[data-message-id]") ?? column).getBoundingClientRect();
  const centre = turnBox === columnBox ? columnLeft + columnWidth / 2 : (turnBox.left + turnBox.right) / 2;
  const twiceCentre = 2 * (rtl ? right - centre : centre - left);
  return {
    pull: Math.max(0, pull),
    area: width,
    before: Math.max(0, twiceCentre - width),
    after: Math.max(0, width - twiceCentre),
  };
}

/**
 * The space a table that broke out needs above it so it does not run into the turn's avatar
 * (or any other item beside the turn's body), which sits at the top of the turn.
 */
function clearance(wrapper: HTMLElement, table: HTMLElement): number {
  const body = wrapper.closest('[data-chat="turn-body"]');
  const row = body?.parentElement;
  if (!body || !row) return 0;
  const tableBox = table.getBoundingClientRect();
  // The wrapper's own top: the clearance is padding inside it, so it never feeds back into itself.
  const top = wrapper.getBoundingClientRect().top;
  let clear = 0;
  for (const item of Array.from(row.children)) {
    if (item === body) continue;
    const box = item.getBoundingClientRect();
    if (box.width === 0 || box.right <= tableBox.left || box.left >= tableBox.right) continue;
    clear = Math.max(clear, box.bottom - top + AVATAR_CLEARANCE_PX);
  }
  return Math.max(0, Math.round(clear));
}

/**
 * Breaks the table out of a centred column inside a wide area: sets `data-breakout` and the
 * geometry variables on the wrapper, and keeps them current as the area, the column or the
 * (streaming) table resize. `frame` is the table's visible box, used to clear the avatar.
 */
export function useTableBreakout(
  wrapperRef: RefObject<HTMLDivElement | null>,
  frameRef: RefObject<HTMLDivElement | null>,
  tableRef: RefObject<HTMLTableElement | null>
) {
  const appliedRef = useRef<Geometry | null>(null);

  useLayoutEffect(() => {
    const wrapper = wrapperRef.current;
    const frame = frameRef.current;
    const area = wrapper?.closest<HTMLElement>(`[${WIDE_AREA_ATTRIBUTE}]`);
    if (!wrapper || !frame || !area) return;

    const apply = (next: Geometry | null) => {
      const previous = appliedRef.current;
      if (next === null) {
        if (previous === null) return;
        wrapper.removeAttribute("data-breakout");
        for (const name of Object.values(BREAKOUT_VARIABLES)) wrapper.style.removeProperty(name);
        appliedRef.current = null;
        return;
      }
      wrapper.setAttribute("data-breakout", "on");
      for (const key of Object.keys(BREAKOUT_VARIABLES) as (keyof Geometry)[]) {
        if (previous?.[key] !== next[key]) wrapper.style.setProperty(BREAKOUT_VARIABLES[key], `${next[key]}px`);
      }
      appliedRef.current = next;
    };

    const update = () => {
      const geometry = measure(wrapper, area);
      if (!geometry) return apply(null);
      // Place the table first, then see whether it now reaches under the avatar.
      apply({ ...geometry, clear: appliedRef.current?.clear ?? 0 });
      apply({ ...geometry, clear: clearance(wrapper, frame) });
    };

    update();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(update);
    observer.observe(area);
    if (wrapper.parentElement) observer.observe(wrapper.parentElement);
    if (tableRef.current) observer.observe(tableRef.current);
    return () => observer.disconnect();
  }, [wrapperRef, frameRef, tableRef]);
}
