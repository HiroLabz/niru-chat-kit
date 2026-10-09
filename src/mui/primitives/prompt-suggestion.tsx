"use client";

/**
 * One tappable suggested-prompt. Two shapes, matching prompt-kit's own
 * `PromptSuggestion` (which switches look by the same signal):
 *
 * - `"pill"` (the default with no `highlight`): a `Chip` that caps itself at its
 *   container and wraps its label rather than growing past it (ticket 86d4aq120) —
 *   a `Chip` sizes to its label with no ceiling, so a long suggestion used to
 *   overhang whatever clipped the row it sat in. Used by the empty-state chips.
 * - `"row"` (the default once `highlight` is set): a full-width, left-aligned
 *   button, one per line — prompt-kit's autocomplete block renders its matches
 *   this way rather than as wrapped pills, and it reads better in a listbox a
 *   person is moving through with arrow keys. Used by the composer's
 *   autocomplete dropdown.
 *
 * Either shape can be forced with `variant`.
 *
 * `highlight` turns on prompt-kit's autocomplete mode: the first case-insensitive
 * match of that substring inside the label is emphasised (a plain `<mark>`,
 * recolored off its browser-default yellow) and, as in prompt-kit, the rest of the
 * label is dimmed to the muted text token so the match reads as the point of the row.
 * Without `highlight` the label renders at full emphasis, unchanged.
 */

import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Chip from "@mui/material/Chip";
import type { ButtonBaseProps } from "@mui/material/ButtonBase";
import type { ChipProps } from "@mui/material/Chip";
import { alpha } from "@mui/material/styles";
import type { ReactNode } from "react";
import { useChatKitStyles } from "../theme";
import { sxArray } from "./sx";

export type PromptSuggestionSlotProps = {
  chip?: Partial<ChipProps>;
  row?: Partial<ButtonBaseProps>;
};

function Dimmed({ text }: { text: string }) {
  const { scheme } = useChatKitStyles();
  if (!text) return null;
  return (
    <Box component="span" sx={scheme((c) => ({ color: c.mutedText }))}>
      {text}
    </Box>
  );
}

function Matched({ text }: { text: string }) {
  const { scheme } = useChatKitStyles();
  return (
    <Box component="mark" sx={scheme((c) => ({ bgcolor: "transparent", color: c.accent, fontWeight: 700 }))}>
      {text}
    </Box>
  );
}

function highlightLabel(text: string, highlight: string | undefined): ReactNode {
  if (!highlight) return text;
  const matchStart = text.toLowerCase().indexOf(highlight.toLowerCase());
  if (matchStart === -1) return text;
  const matchEnd = matchStart + highlight.length;
  // The three pieces below must land inside one inline element, not as direct children
  // of the "row" variant's flex `ButtonBase`: a flex container blockifies its direct
  // children, so a `<span>` holding "...you " (a trailing space right before the
  // match) and one holding " me..." (a leading space right after it) each became
  // their own block box, and block-edge whitespace collapsing ate exactly the spaces
  // that separated the match from its neighbours ("youhelpme"). Wrapping them in a
  // single `<span>` keeps them normal inline siblings, where that space is just text.
  return (
    <Box component="span">
      <Dimmed text={text.slice(0, matchStart)} />
      <Matched text={text.slice(matchStart, matchEnd)} />
      <Dimmed text={text.slice(matchEnd)} />
    </Box>
  );
}

export function PromptSuggestion({
  children,
  onSelect,
  highlight,
  disabled = false,
  variant = highlight ? "row" : "pill",
  sx,
  className,
  slotProps,
}: {
  children: string;
  onSelect: (text: string) => void;
  highlight?: string;
  disabled?: boolean;
  /** `"pill"`: a capped, wrapping chip. `"row"`: a full-width, left-aligned button.
   *  Defaults to `"row"` when `highlight` is set, `"pill"` otherwise — prompt-kit's
   *  own default — but either can be requested explicitly. */
  variant?: "pill" | "row";
  sx?: ChipProps["sx"];
  className?: string;
  slotProps?: PromptSuggestionSlotProps;
}) {
  const { scheme } = useChatKitStyles();
  const label = highlightLabel(children, highlight);

  if (variant === "row") {
    const { sx: rowSx, ...rowRest } = slotProps?.row ?? {};
    return (
      <ButtonBase
        disabled={disabled}
        onClick={() => onSelect(children)}
        className={className}
        sx={[
          scheme((c, all) => ({
            width: "100%",
            justifyContent: "flex-start",
            textAlign: "left",
            borderRadius: `${all.radius}px`,
            px: 1.5,
            py: 1,
            typography: "body2",
            "&:hover": { bgcolor: c.muted },
          })),
          ...sxArray(sx),
          ...sxArray(rowSx),
        ]}
        {...rowRest}
      >
        {label}
      </ButtonBase>
    );
  }

  const { sx: chipSx, ...chipRest } = slotProps?.chip ?? {};
  return (
    <Chip
      label={label}
      variant="outlined"
      size="small"
      disabled={disabled}
      onClick={() => onSelect(children)}
      className={className}
      sx={[
        scheme((c) => ({
          maxWidth: "100%",
          height: "auto",
          color: c.accent,
          borderColor: alpha(c.accent, 0.7),
          "&:hover, &.MuiChip-clickable:hover": { bgcolor: alpha(c.accent, 0.04) },
          "& .MuiChip-label": {
            whiteSpace: "normal",
            overflowWrap: "anywhere",
            py: 0.5,
          },
        })),
        ...sxArray(sx),
        ...sxArray(chipSx),
      ]}
      {...chipRest}
    />
  );
}
