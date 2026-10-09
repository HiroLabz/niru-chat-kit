"use client";

import type { ElementType, ReactNode } from "react";
import Box from "@mui/material/Box";
import { keyframes } from "@mui/material/styles";
import type { SxProps, Theme } from "@mui/material/styles";
import { useChatKitStyles } from "../theme";

/**
 * A light band sweeping across the glyphs of an in-progress label.
 *
 * The text is painted from a gradient and clipped to the letterforms, so the
 * highlight travels through the words rather than blinking the whole row. Under
 * `prefers-reduced-motion` the sweep is replaced by a gentle opacity pulse in
 * solid ink: the shimmer carries essential "still working" state, so it needs a
 * vestibular-safe fallback rather than being dropped.
 */

const DEFAULT_DURATION_SECONDS = 2.2;
const DEFAULT_SPREAD = 10;
const MIN_SPREAD = 5;
const MAX_SPREAD = 45;
const MID_STOP = 50;

const sweep = keyframes`
  from { background-position: 100% 0; }
  to { background-position: -100% 0; }
`;

const pulse = keyframes`
  50% { opacity: 0.55; }
`;

export type TextShimmerProps = {
  children: ReactNode;
  fontSize?: number;
  /** Seconds for one sweep. */
  duration?: number;
  /** Width of the light band, as a percentage either side of the middle (5 to 45). */
  spread?: number;
  as?: ElementType;
  sx?: SxProps<Theme>;
  className?: string;
};

export function TextShimmer({
  children,
  fontSize,
  duration = DEFAULT_DURATION_SECONDS,
  spread = DEFAULT_SPREAD,
  as = "span",
  sx,
  className,
}: TextShimmerProps) {
  const { scheme } = useChatKitStyles();
  const band = Math.min(Math.max(spread, MIN_SPREAD), MAX_SPREAD);
  return (
    <Box
      component={as}
      className={className}
      sx={[
        scheme((c) => ({
          fontSize,
          backgroundImage: `linear-gradient(90deg, ${c.mutedText} ${MID_STOP - band}%, ${c.text} ${MID_STOP}%, ${c.mutedText} ${MID_STOP + band}%)`,
          backgroundSize: "200% 100%",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
          animation: `${sweep} ${duration}s linear infinite`,
          "@media (prefers-reduced-motion: reduce)": {
            backgroundImage: "none",
            WebkitBackgroundClip: "initial",
            backgroundClip: "initial",
            color: c.text,
            animation: `${pulse} ${duration}s ease-in-out infinite`,
          },
        })),
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {children}
    </Box>
  );
}
