"use client";

/** A short-lived highlight: which key is flashing, and the shared styles and scrolling for it. */

import { useEffect, useState } from "react";
import { alpha } from "@mui/material/styles";
import type { ChatKitColorTokens } from "../../core/tokens";

export const FLASH_MS = 2500;

/**
 * The key that is flashing right now. It becomes `key` when `key` changes to a value while
 * `ready` is true, and goes back to null after `ms`. A new key restarts the flash.
 */
export function useFlash(key: string | null | undefined, ready = true, ms = FLASH_MS): string | null {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    if (!key || !ready) {
      setActive(null);
      return;
    }
    setActive(key);
    const timer = setTimeout(() => setActive(null), ms);
    return () => clearTimeout(timer);
  }, [key, ready, ms]);
  return active;
}

/**
 * Styles for a flashing element: an accent tint that fades out over `FLASH_MS`. Under
 * reduced motion there is no fade, only a still accent outline for the same time.
 */
export function flashStyles(colors: Pick<ChatKitColorTokens, "accent">, radius = 8) {
  return {
    borderRadius: `${radius}px`,
    "@keyframes chatKitFlash": {
      from: { backgroundColor: alpha(colors.accent, 0.22) },
      to: { backgroundColor: alpha(colors.accent, 0) },
    },
    animation: `chatKitFlash ${FLASH_MS}ms ease-out forwards`,
    "@media (prefers-reduced-motion: reduce)": {
      animation: "none",
      outline: "2px solid",
      outlineColor: colors.accent,
      outlineOffset: 2,
    },
  } as const;
}

/** Whether the person asked the system for less motion. False where it cannot be read. */
export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;
}

/**
 * Scrolls `target` into view inside `container` only, never the page: puts it a little
 * below the container's top. Smooth unless the person prefers reduced motion.
 */
export function scrollWithin(container: HTMLElement, target: HTMLElement, margin = 16): void {
  const top = container.scrollTop + (target.getBoundingClientRect().top - container.getBoundingClientRect().top) - margin;
  const options: ScrollToOptions = { top: Math.max(0, top), behavior: prefersReducedMotion() ? "auto" : "smooth" };
  if (typeof container.scrollTo === "function") container.scrollTo(options);
  else container.scrollTop = options.top ?? 0;
}

/**
 * Like `flashStyles`, but the tint is an overlay drawn over the element and everything in it,
 * so it shows on top of opaque bubbles too. Under reduced motion: a still outline, no overlay fade.
 */
export function flashOverlayStyles(colors: Pick<ChatKitColorTokens, "accent">, radius = 8) {
  return {
    position: "relative",
    borderRadius: `${radius}px`,
    "&::after": {
      content: '""',
      position: "absolute",
      inset: 0,
      borderRadius: "inherit",
      pointerEvents: "none",
      backgroundColor: alpha(colors.accent, 0),
      "@keyframes chatKitFlashOverlay": {
        from: { backgroundColor: alpha(colors.accent, 0.2) },
        to: { backgroundColor: alpha(colors.accent, 0) },
      },
      animation: `chatKitFlashOverlay ${FLASH_MS}ms ease-out forwards`,
    },
    "@media (prefers-reduced-motion: reduce)": {
      outline: "2px solid",
      outlineColor: colors.accent,
      outlineOffset: 2,
      "&::after": { animation: "none" },
    },
  } as const;
}
