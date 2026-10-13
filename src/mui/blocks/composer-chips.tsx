"use client";

/** Small state chips in the composer's action row ("Plan mode", "Goal: ..."), each with an optional remove button. */

import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import { useChatKitStyles } from "../theme";

export type ComposerChip = {
  id: string;
  label: string;
  icon?: ReactNode;
  /** Shows a small remove button on the chip. */
  onRemove?: () => void;
  /** The remove button's accessible name; default "Remove <label>". */
  removeLabel?: string;
  /** Makes the chip's label a button, for example to open the setting it stands for. */
  onClick?: () => void;
  /** The chip's colour; default "default" (quiet). */
  tone?: "default" | "accent" | "warning";
};

const CHIP_MAX_WIDTH = 220;

export function ComposerChips({ chips, disabled, removeWord }: { chips: ComposerChip[]; disabled?: boolean; removeWord: string }) {
  const { scheme } = useChatKitStyles();
  return (
    <>
      {chips.map((chip) => {
        const tone = chip.tone ?? "default";
        const label = (
          <Typography component="span" variant="caption" noWrap sx={{ minWidth: 0, fontWeight: 500, color: "inherit" }}>
            {chip.label}
          </Typography>
        );
        return (
          <Box
            key={chip.id}
            data-chat="composer-chip"
            data-tone={tone}
            sx={scheme((c) => {
              const color = tone === "accent" ? c.accent : tone === "warning" ? c.warning : c.text;
              return {
                display: "inline-flex",
                alignItems: "center",
                gap: 0.5,
                minWidth: 0,
                maxWidth: CHIP_MAX_WIDTH,
                height: 26,
                pl: 1,
                pr: chip.onRemove ? 0.25 : 1,
                borderRadius: 999,
                border: 1,
                borderColor: tone === "default" ? c.border : alpha(color, 0.6),
                bgcolor: tone === "default" ? "transparent" : alpha(color, 0.12),
                color,
                "& svg": { fontSize: 16 },
              };
            })}
          >
            {chip.icon ? <Box sx={{ display: "inline-flex", flexShrink: 0 }}>{chip.icon}</Box> : null}
            {chip.onClick ? (
              <ButtonBase disabled={disabled} onClick={chip.onClick} sx={{ minWidth: 0, borderRadius: 1, color: "inherit" }}>
                {label}
              </ButtonBase>
            ) : (
              label
            )}
            {chip.onRemove ? (
              <IconButton
                size="small"
                disabled={disabled}
                aria-label={chip.removeLabel ?? `${removeWord} ${chip.label}`}
                onClick={chip.onRemove}
                sx={{ p: 0.25, color: "inherit" }}
              >
                <CloseOutlinedIcon sx={{ fontSize: 14 }} />
              </IconButton>
            ) : null}
          </Box>
        );
      })}
    </>
  );
}
