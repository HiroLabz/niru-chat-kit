"use client";

/**
 * Single loading indicator for the chat surfaces, replacing the scattered
 * `TypingDots` / bare `CircularProgress` instances. `role="status"` carries the
 * accessible label (`text`, or "Loading" when none is given) so a screen reader
 * announces the state once rather than reading decorative dot markup.
 *
 * Variants: `dots`, `typing`, `shimmer`, `circular` (original four) plus prompt-kit's
 * remaining set — `classic`, `pulse`, `pulse-dot`, `wave`, `bars`, `terminal`,
 * `text-blink`, `text-shimmer`, `loading-dots`. Every animated variant disables its
 * animation under `prefers-reduced-motion: reduce` while staying fully opaque, so the
 * indicator is still visibly present rather than disappearing.
 */

import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import { keyframes } from "@mui/material/styles";
import type { SxProps, Theme } from "@mui/material/styles";
import { useChatKitStyles } from "../theme";
import { sxArray } from "./sx";
import { TextShimmer } from "./text-shimmer";

export type LoaderVariant =
  | "dots"
  | "typing"
  | "shimmer"
  | "circular"
  | "classic"
  | "pulse"
  | "pulse-dot"
  | "wave"
  | "bars"
  | "terminal"
  | "text-blink"
  | "text-shimmer"
  | "loading-dots";
export type LoaderSize = "sm" | "md" | "lg";

const CIRCULAR_SIZE_PX: Record<LoaderSize, number> = { sm: 14, md: 20, lg: 28 };
const SHIMMER_FONT_SIZE_PX: Record<LoaderSize, number> = { sm: 12, md: 14, lg: 16 };
/** `md` matches the original `TypingDots` dot size exactly, so the thin wrapper
 *  in `message-bubble.tsx` is visually identical to what it replaces. */
const DOT_SIZE_PX: Record<LoaderSize, number> = { sm: 5, md: 6, lg: 8 };
const PULSE_DOT_SIZE_PX: Record<LoaderSize, number> = { sm: 8, md: 10, lg: 14 };
const BAR_HEIGHT_PX: Record<LoaderSize, number> = { sm: 12, md: 16, lg: 22 };
const CURSOR_HEIGHT_PX: Record<LoaderSize, number> = { sm: 12, md: 14, lg: 16 };

/** Disables the animation but keeps the element opaque, per the reduced-motion contract above. */
const REDUCED_MOTION = "@media (prefers-reduced-motion: reduce)";
const reducedMotionStill = { animation: "none", opacity: 1, transform: "none" } as const;

/** Matches the original `TypingDots` keyframe and delays verbatim. */
const bounce = keyframes`
  0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
  40% { transform: translateY(-4px); opacity: 1; }
`;

const pulse = keyframes`
  0%, 100% { opacity: 0.3; }
  50% { opacity: 1; }
`;

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const scalePulse = keyframes`
  0%, 100% { transform: scale(0.75); opacity: 0.5; }
  50% { transform: scale(1); opacity: 1; }
`;

const ping = keyframes`
  0% { transform: scale(1); opacity: 0.6; }
  100% { transform: scale(2.2); opacity: 0; }
`;

const waveStretch = keyframes`
  0%, 100% { transform: scaleY(0.4); }
  50% { transform: scaleY(1); }
`;

const barPulse = keyframes`
  0%, 100% { opacity: 0.35; }
  50% { opacity: 1; }
`;

const blink = keyframes`
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
`;

const stepFade = keyframes`
  0%, 20% { opacity: 0; }
  50%, 100% { opacity: 1; }
`;

function Dots({ size, delays, animation }: {
  size: LoaderSize;
  delays: readonly [number, number, number];
  animation: typeof bounce | typeof pulse;
}) {
  const dotSize = DOT_SIZE_PX[size];
  return (
    <Box component="span" sx={{ display: "inline-flex", gap: 0.5, py: 0.5 }}>
      {delays.map((delay) => (
        <Box
          key={delay}
          component="span"
          sx={{
            width: dotSize,
            height: dotSize,
            borderRadius: "50%",
            bgcolor: "currentColor",
            animation: `${animation} 1.2s infinite`,
            animationDelay: `${delay}s`,
            [REDUCED_MOTION]: reducedMotionStill,
          }}
        />
      ))}
    </Box>
  );
}

function ClassicSpinner({ size }: { size: LoaderSize }) {
  const px = CIRCULAR_SIZE_PX[size];
  return (
    <Box
      aria-hidden
      sx={{
        width: px,
        height: px,
        borderRadius: "50%",
        border: "2px solid currentColor",
        borderTopColor: "transparent",
        animation: `${spin} 0.8s linear infinite`,
        [REDUCED_MOTION]: { animation: "none", opacity: 1 },
      }}
    />
  );
}

function PulseDot({ size }: { size: LoaderSize }) {
  const px = PULSE_DOT_SIZE_PX[size];
  return (
    <Box
      aria-hidden
      sx={{
        width: px,
        height: px,
        borderRadius: "50%",
        bgcolor: "currentColor",
        animation: `${scalePulse} 1.2s ease-in-out infinite`,
        [REDUCED_MOTION]: reducedMotionStill,
      }}
    />
  );
}

function PulseRingDot({ size }: { size: LoaderSize }) {
  const px = PULSE_DOT_SIZE_PX[size];
  return (
    <Box sx={{ position: "relative", width: px, height: px, display: "inline-flex" }}>
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          bgcolor: "currentColor",
          animation: `${ping} 1.4s cubic-bezier(0, 0, 0.2, 1) infinite`,
          [REDUCED_MOTION]: { animation: "none", opacity: 0 },
        }}
      />
      <Box
        aria-hidden
        sx={{ position: "relative", width: px, height: px, borderRadius: "50%", bgcolor: "currentColor" }}
      />
    </Box>
  );
}

function Wave({ size }: { size: LoaderSize }) {
  const height = BAR_HEIGHT_PX[size];
  return (
    <Box aria-hidden sx={{ display: "inline-flex", alignItems: "center", gap: "2px", height }}>
      {[0, 1, 2, 3, 4].map((index) => (
        <Box
          key={index}
          sx={{
            width: 3,
            height: "100%",
            borderRadius: 1,
            bgcolor: "currentColor",
            animation: `${waveStretch} 1s ease-in-out infinite`,
            animationDelay: `${index * 0.1}s`,
            [REDUCED_MOTION]: { animation: "none", transform: "scaleY(1)" },
          }}
        />
      ))}
    </Box>
  );
}

function Bars({ size }: { size: LoaderSize }) {
  const height = BAR_HEIGHT_PX[size];
  return (
    <Box aria-hidden sx={{ display: "inline-flex", alignItems: "center", gap: "3px", height }}>
      {[0, 1, 2].map((index) => (
        <Box
          key={index}
          sx={{
            width: 4,
            height: "100%",
            borderRadius: 1,
            bgcolor: "currentColor",
            animation: `${barPulse} 1s ease-in-out infinite`,
            animationDelay: `${index * 0.15}s`,
            [REDUCED_MOTION]: { animation: "none", opacity: 1 },
          }}
        />
      ))}
    </Box>
  );
}

function Terminal({ size, text }: { size: LoaderSize; text: string }) {
  const { tokens } = useChatKitStyles();
  const height = CURSOR_HEIGHT_PX[size];
  return (
    <Box component="span" sx={{ display: "inline-flex", alignItems: "center", fontSize: height }}>
      <Box component="span" sx={{ fontFamily: tokens.monoFontFamily }}>{text}</Box>
      <Box
        aria-hidden
        component="span"
        sx={{
          display: "inline-block",
          width: Math.max(2, Math.round(height * 0.5)),
          height,
          bgcolor: "currentColor",
          ml: 0.5,
          animation: `${blink} 1s step-end infinite`,
          [REDUCED_MOTION]: { animation: "none", opacity: 1 },
        }}
      />
    </Box>
  );
}

function TextBlink({ text, fontSize }: { text: string; fontSize: number }) {
  const { scheme } = useChatKitStyles();
  return (
    <Box
      component="span"
      sx={scheme((c) => ({
        fontSize,
        color: c.mutedText,
        animation: `${blink} 1.2s ease-in-out infinite`,
        [REDUCED_MOTION]: { animation: "none", opacity: 1 },
      }))}
    >
      {text}
    </Box>
  );
}

function LoadingDots({ text, size }: { text: string; size: LoaderSize }) {
  const { scheme } = useChatKitStyles();
  const dotSize = DOT_SIZE_PX[size];
  return (
    <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}>
      <Box component="span" sx={scheme((c) => ({ fontSize: SHIMMER_FONT_SIZE_PX[size], color: c.mutedText }))}>
        {text}
      </Box>
      {[0, 1, 2].map((index) => (
        <Box
          key={index}
          component="span"
          sx={{
            width: dotSize,
            height: dotSize,
            borderRadius: "50%",
            bgcolor: "currentColor",
            animation: `${stepFade} 1.4s ease-in-out infinite`,
            animationDelay: `${index * 0.2}s`,
            [REDUCED_MOTION]: reducedMotionStill,
          }}
        />
      ))}
    </Box>
  );
}

/** Variants whose indicator already carries `text`, so the shared trailing caption below is skipped. */
const EMBEDS_TEXT = new Set<LoaderVariant>(["shimmer", "text-shimmer", "text-blink", "terminal", "loading-dots"]);

export function Loader({
  variant = "circular",
  size = "md",
  text,
  sx,
  className,
}: {
  variant?: LoaderVariant;
  size?: LoaderSize;
  text?: string;
  sx?: SxProps<Theme>;
  className?: string;
}) {
  const { scheme } = useChatKitStyles();
  const label = text ?? "Loading";

  return (
    <Box
      role="status"
      aria-label={label}
      className={className}
      sx={[
        { display: "inline-flex", alignItems: "center", gap: 1 },
        ...sxArray(sx),
      ]}
    >
      {variant === "circular" ? (
        <CircularProgress size={CIRCULAR_SIZE_PX[size]} sx={scheme((c) => ({ color: c.accent }))} />
      ) : variant === "shimmer" || variant === "text-shimmer" ? (
        <TextShimmer fontSize={SHIMMER_FONT_SIZE_PX[size]}>{label}</TextShimmer>
      ) : variant === "typing" ? (
        <Dots size={size} delays={[-0.3, -0.15, 0]} animation={bounce} />
      ) : variant === "classic" ? (
        <ClassicSpinner size={size} />
      ) : variant === "pulse" ? (
        <PulseDot size={size} />
      ) : variant === "pulse-dot" ? (
        <PulseRingDot size={size} />
      ) : variant === "wave" ? (
        <Wave size={size} />
      ) : variant === "bars" ? (
        <Bars size={size} />
      ) : variant === "terminal" ? (
        <Terminal size={size} text={label} />
      ) : variant === "text-blink" ? (
        <TextBlink text={label} fontSize={SHIMMER_FONT_SIZE_PX[size]} />
      ) : variant === "loading-dots" ? (
        <LoadingDots text={label} size={size} />
      ) : (
        <Dots size={size} delays={[0, 0.15, 0.3]} animation={pulse} />
      )}
      {text && !EMBEDS_TEXT.has(variant) ? (
        <Box component="span" sx={scheme((c) => ({ fontSize: 13, color: c.mutedText }))}>
          {text}
        </Box>
      ) : null}
    </Box>
  );
}
