"use client";

import { useEffect, useRef } from "react";
import Box from "@mui/material/Box";
import { alpha, keyframes } from "@mui/material/styles";
import type { SxProps, Theme } from "@mui/material/styles";
import { followLevels, type LevelSource } from "../../core/voice/voice-levels";
import type { VoiceLevels } from "../../core/voice/voice-types";
import { useCallColors } from "./call-colors";
import { useReducedMotion } from "./use-reduced-motion";

const LEVEL_PROPERTY = "--nck-call-level";
const DECIMALS = 3;
/** The resting glow when nothing is being said, and the fixed glow of a pill held still. */
const REST_LEVEL = 0.12;
const STILL_ACTIVE_LEVEL = 0.4;

const drift = keyframes`
  0% { transform: translateX(-7%) scaleY(0.92); }
  100% { transform: translateX(7%) scaleY(1.08); }
`;
const breathe = keyframes`
  0% { opacity: 0.55; }
  100% { opacity: 1; }
`;

export interface VoiceLevelPillProps {
  /** The call's audio levels, read in an animation frame. */
  levels: VoiceLevels;
  /** Whose level moves the glow: `you` while listening, `agent` while speaking, `none` when quiet. */
  source: LevelSource;
  /** Height in px. Default 56. */
  height?: number;
  /** Hold still; the system's reduced-motion setting always holds it still. */
  still?: boolean;
  sx?: SxProps<Theme>;
}

/**
 * The default call visual: a wide dark pill with a light bluish glow along its bottom edge that
 * rises and ripples with the voice level. The level reaches the pill as one CSS variable written
 * in an animation frame, so a level never renders React. With reduced motion the pill holds still
 * at a fixed glow. It is decorative; the status line carries the state for a screen reader.
 */
export function VoiceLevelPill({ levels, source, height = 56, still, sx }: VoiceLevelPillProps) {
  const colors = useCallColors();
  const root = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const hold = reduced || Boolean(still);
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const write = (level: number) => element.style.setProperty(LEVEL_PROPERTY, level.toFixed(DECIMALS));
    if (hold) {
      write(source === "none" ? REST_LEVEL : STILL_ACTIVE_LEVEL);
      return;
    }
    write(0);
    return followLevels({ levels, source, onLevel: write });
  }, [levels, source, hold]);

  const glow = (shape: object) => ({
    position: "absolute",
    bottom: 0,
    left: "-10%",
    width: "120%",
    pointerEvents: "none",
    ...shape,
  });
  return (
    <Box
      ref={root}
      data-testid="voice-level-pill"
      data-source={source}
      data-motion={hold ? "still" : "animated"}
      aria-hidden
      sx={[
        {
          position: "relative",
          overflow: "hidden",
          flex: "1 1 auto",
          minWidth: 96,
          height,
          borderRadius: `${height / 2}px`,
          bgcolor: colors.control,
          [LEVEL_PROPERTY]: REST_LEVEL,
        },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    >
      <Box
        data-part="glow"
        sx={glow({
          height: `calc(${height * 0.2}px + var(${LEVEL_PROPERTY}) * ${height * 0.8}px)`,
          background: `radial-gradient(ellipse 60% 100% at 50% 100%, ${alpha(colors.glow, 0.95)} 0%, ${alpha(colors.glow, 0.45)} 45%, transparent 100%)`,
          filter: "blur(5px)",
          animation: hold ? "none" : `${breathe} 2.4s ease-in-out infinite alternate`,
        })}
      />
      <Box
        data-part="ripple"
        sx={glow({
          height: `calc(${height * 0.12}px + var(${LEVEL_PROPERTY}) * ${height * 0.55}px)`,
          background: `radial-gradient(ellipse 45% 100% at 50% 100%, ${alpha(colors.text, 0.5)} 0%, transparent 100%)`,
          filter: "blur(7px)",
          opacity: hold ? 0.6 : 1,
          animation: hold ? "none" : `${drift} 1.8s ease-in-out infinite alternate`,
          "@media (prefers-reduced-motion: reduce)": { animation: "none" },
        })}
      />
    </Box>
  );
}
