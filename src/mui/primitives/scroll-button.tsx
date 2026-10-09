"use client";

/**
 * Floating "jump to latest" control shown over a transcript that has scrolled away
 * from the bottom. The button has no opinion on where it sits inside the transcript:
 * a block renders it as a sibling of the scrollable log inside a `position: relative`
 * wrapper, and the default `sx` below only anchors it there.
 */

import Fab from "@mui/material/Fab";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import type { FabProps } from "@mui/material/Fab";
import { darken } from "@mui/material/styles";
import { useChatKitStyles } from "../theme";
import { sxArray } from "./sx";

export type ScrollButtonSlotProps = {
  root?: Partial<FabProps>;
};

export function ScrollButton({
  visible,
  onClick,
  sx,
  className,
  slotProps,
}: {
  visible: boolean;
  onClick: () => void;
  sx?: FabProps["sx"];
  className?: string;
  slotProps?: ScrollButtonSlotProps;
}) {
  const { scheme } = useChatKitStyles();
  if (!visible) return null;

  const { sx: rootSx, ...rootRest } = slotProps?.root ?? {};

  return (
    <Fab
      size="small"
      aria-label="Jump to latest message"
      onClick={onClick}
      className={className}
      sx={[
        { position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)" },
        scheme((c) => ({
          bgcolor: c.accent,
          color: c.accentContrast,
          "&:hover": { bgcolor: darken(c.accent, 0.15) },
        })),
        ...sxArray(sx),
        ...sxArray(rootSx),
      ]}
      {...rootRest}
    >
      <KeyboardArrowDownIcon fontSize="small" />
    </Fab>
  );
}
