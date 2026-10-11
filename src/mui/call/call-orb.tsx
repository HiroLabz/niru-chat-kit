"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Box from "@mui/material/Box";
import type { VoiceLevels } from "../../core/voice/voice-types";
import { blend } from "../theme/color";
import { useCallColors, type CallColors } from "./call-colors";
import { createOrbEngine, type OrbColors, type OrbEngine, type OrbSettings } from "./call-orb-engine";
import { ORB_LOOKS } from "./call-orb-motion";
import type { OrbState } from "./call-orb-state";
import { orbBoxStyles, orbFallbackStyles } from "./call-orb-styles";
import { usePixelRatio, useReducedMotion } from "./use-reduced-motion";

const DEEP_SHARE = 0.55;
const PALE_SHARE = 0.7;
export const DEFAULT_ORB_SIZE = 160;

export interface CallOrbProps {
  state: OrbState;
  /** The call's audio levels; read in an animation frame, never through React state. */
  levels: VoiceLevels;
  /** Edge of the orb in px. Default 160. */
  size?: number;
  /** Its name for a screen reader, which makes it an image; leave it out when the status line beside it carries the name. */
  label?: string;
  /** Hold still whatever the system says; the system's reduced-motion setting always holds it still. */
  still?: boolean;
}

/** The three blues of the orb, derived from the call colours: the glow colour is the middle one. */
export function orbColorsOf(colors: Pick<CallColors, "glow" | "stage" | "text">): OrbColors {
  return {
    deep: blend(colors.glow, colors.stage, DEEP_SHARE),
    mid: colors.glow,
    pale: blend(colors.text, colors.glow, PALE_SHARE),
  };
}

/**
 * The second call visual: Niru's talking orb, a soft sphere with a cloud drifting through it, drawn
 * by a WebGL shader in a canvas inside a circular box of exactly its size. The drawing and its one
 * animation loop live in `createOrbEngine`, outside React: a level or a frame never renders this
 * component. With reduced motion it holds still and draws once per state. Where WebGL is missing it
 * shows the same blues as a CSS circle. The canvas is decorative; the status line is the accessible text.
 */
export function CallOrb({ state, levels, size = DEFAULT_ORB_SIZE, label, still }: CallOrbProps) {
  const host = useRef<HTMLSpanElement>(null);
  const engine = useRef<OrbEngine | null>(null);
  const settings = useRef<OrbSettings | null>(null);
  const [fallback, setFallback] = useState(false);
  const reduced = useReducedMotion();
  const hold = reduced || Boolean(still);
  const ratio = usePixelRatio();
  const callColors = useCallColors();
  const { deep, mid, pale } = orbColorsOf(callColors);
  const colors = useMemo<OrbColors>(() => ({ deep, mid, pale }), [deep, mid, pale]);

  useEffect(() => {
    settings.current = { state, levels, still: hold, size, ratio };
    engine.current?.configure(settings.current);
  }, [state, levels, hold, size, ratio]);

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const made = createOrbEngine({ host: element, colors, onFail: () => setFallback(true) });
    if (!made) {
      setFallback(true);
      return;
    }
    setFallback(false);
    engine.current = made;
    if (settings.current) made.configure(settings.current);
    return () => {
      made.dispose();
      engine.current = null;
    };
  }, [colors]);

  return (
    <Box
      ref={host}
      component="span"
      data-testid="call-orb"
      data-orb-state={state}
      data-orb-motion={hold ? "still" : "animated"}
      data-orb-render={fallback ? "fallback" : "webgl"}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      sx={[orbBoxStyles(size), fallback ? orbFallbackStyles(colors, ORB_LOOKS[state].dim) : {}]}
    />
  );
}
