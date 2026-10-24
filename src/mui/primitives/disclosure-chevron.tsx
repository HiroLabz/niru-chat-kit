"use client";

import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useChatKitStyles } from "../theme";

/**
 * The chevron of every fold in a turn (timeline, tool card, sources): points right while
 * closed and down while open, in the muted text colour of the trigger it sits in.
 */
export function DisclosureChevron({ open, size }: { open: boolean; size: number }) {
  const { scheme } = useChatKitStyles();
  return (
    <ExpandMoreIcon
      aria-hidden
      sx={scheme((c) => ({
        fontSize: size,
        color: c.mutedText,
        transition: "transform 150ms",
        transform: open ? "none" : "rotate(-90deg)",
      }))}
    />
  );
}
