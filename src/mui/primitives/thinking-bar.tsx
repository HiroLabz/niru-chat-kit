"use client";

/**
 * Bare row shown while a reply is in flight: a shimmering label on the left and,
 * when `onStop` is given, a quiet text-link styled Stop control on the right — not
 * a button surface. Matches prompt-kit's ThinkingBar: no bubble chrome, no
 * outlined/contained button, just a dotted underline that darkens on hover and
 * shows a focus ring on keyboard focus. The Stop control renders only when
 * `onStop` is given — a surface with no way to cancel a run has nothing to offer
 * there.
 */

import Box from "@mui/material/Box";
import type { BoxProps } from "@mui/material/Box";
import { useChatKitStyles } from "../theme";
import { TextShimmer } from "./text-shimmer";
import { sxArray } from "./sx";

export type ThinkingBarSlotProps = {
  root?: Partial<BoxProps>;
  stopButton?: Partial<BoxProps<"button">>;
};

export function ThinkingBar({
  text = "Thinking",
  onStop,
  stopLabel = "Stop",
  sx,
  className,
  slotProps,
}: {
  text?: string;
  onStop?: () => void;
  stopLabel?: string;
  sx?: BoxProps["sx"];
  className?: string;
  slotProps?: ThinkingBarSlotProps;
}) {
  const { scheme } = useChatKitStyles();
  const { sx: rootSx, ...rootRest } = slotProps?.root ?? {};
  const { sx: stopSx, ...stopRest } = slotProps?.stopButton ?? {};

  return (
    <Box
      className={className}
      sx={[
        { display: "inline-flex", alignItems: "center", gap: 1.5 },
        ...sxArray(sx),
        ...sxArray(rootSx),
      ]}
      {...rootRest}
    >
      <TextShimmer fontSize={14} sx={{ fontWeight: 500 }}>
        {text}
      </TextShimmer>
      {onStop ? (
        <Box
          component="button"
          type="button"
          onClick={onStop}
          sx={[
            scheme((c) => ({
              appearance: "none",
              bgcolor: "transparent",
              border: 0,
              borderBottom: "1px dotted",
              borderBottomColor: c.mutedText,
              borderRadius: 0,
              m: 0,
              p: 0,
              font: "inherit",
              fontSize: 14,
              lineHeight: 1.4,
              color: c.mutedText,
              cursor: "pointer",
              "&:hover": {
                color: c.text,
                borderBottomColor: c.text,
              },
              "&:focus-visible": {
                outline: "2px solid",
                outlineColor: c.accent,
                outlineOffset: 2,
                borderRadius: "2px",
              },
            })),
            ...sxArray(stopSx),
          ]}
          {...stopRest}
        >
          {stopLabel}
        </Box>
      ) : null}
    </Box>
  );
}
