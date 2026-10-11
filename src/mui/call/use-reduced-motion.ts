"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";
const canMatch = () => typeof window !== "undefined" && typeof window.matchMedia === "function";

function subscribe(onChange: () => void): () => void {
  if (!canMatch()) return () => undefined;
  const list = window.matchMedia(QUERY);
  list.addEventListener("change", onChange);
  return () => list.removeEventListener("change", onChange);
}

/** `prefers-reduced-motion: reduce`, kept current while mounted. False on the server. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, () => (canMatch() ? window.matchMedia(QUERY).matches : false), () => false);
}

function ratioNow(): number {
  return Math.min(typeof window === "undefined" ? 1 : window.devicePixelRatio || 1, 2);
}

function subscribeRatio(onChange: () => void): () => void {
  if (!canMatch()) return () => undefined;
  let list: MediaQueryList | null = null;
  const bind = () => {
    list?.removeEventListener("change", changed);
    list = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
    list.addEventListener("change", changed);
  };
  function changed() {
    bind();
    onChange();
  }
  bind();
  return () => list?.removeEventListener("change", changed);
}

/** The device pixel ratio, capped at two, kept current while mounted. */
export function usePixelRatio(): number {
  return useSyncExternalStore(subscribeRatio, ratioNow, () => 1);
}
