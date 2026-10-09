"use client";

/**
 * Renders streamed assistant text, optionally fading each newly-arrived word in
 * rather than dumping raw tokens on the page. `fade` mode segments the text with
 * `Intl.Segmenter` (falling back to a whitespace split when it is unavailable) and
 * keys each span by its position in that list: as the stream only ever appends to
 * `text`, earlier positions keep the same content across renders, so React reuses
 * their DOM nodes rather than remounting them — a span's fade-in plays exactly
 * once, on the render where it first appears, and never replays on an untouched
 * word just because the text around it grew.
 */

import { useMemo } from "react";
import Box from "@mui/material/Box";
import { keyframes } from "@mui/material/styles";
import type { SxProps, Theme } from "@mui/material/styles";

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Splits `text` into segments that rejoin to the original string exactly
 * (words and the whitespace/punctuation between them count as segments too, so
 * nothing is lost or re-spaced). `Intl.Segmenter` gives word-aware segmentation;
 * the fallback keeps whitespace runs as their own entries.
 */
function segmentWords(text: string): string[] {
  if (typeof Intl !== "undefined" && typeof Intl.Segmenter === "function") {
    const segmenter = new Intl.Segmenter(undefined, { granularity: "word" });
    return Array.from(segmenter.segment(text), (part) => part.segment);
  }
  return text.split(/(\s+)/).filter((part) => part.length > 0);
}

export function ResponseStream({
  text,
  mode = "plain",
  sx,
  className,
}: {
  text: string;
  mode?: "plain" | "fade";
  sx?: SxProps<Theme>;
  className?: string;
}) {
  const words = useMemo(() => segmentWords(text), [text]);
  const effectiveMode = mode === "fade" && !prefersReducedMotion() ? "fade" : "plain";

  return (
    <Box component="span" className={className} sx={sx}>
      {effectiveMode === "fade"
        ? words.map((word, index) => (
            <Box
              key={index}
              component="span"
              sx={{ display: "inline-block", animation: `${fadeIn} 200ms ease-out` }}
            >
              {word}
            </Box>
          ))
        : text}
    </Box>
  );
}
