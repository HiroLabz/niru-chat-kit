"use client";

import type { ReactNode } from "react";
import ButtonBase from "@mui/material/ButtonBase";
import type { SxProps, Theme } from "@mui/material/styles";
import { useCallColors } from "./call-colors";

export interface CallControlButtonProps {
  /** The accessible name; also the tooltip. Make it say what a press does ("Mute microphone"). */
  label: string;
  icon: ReactNode;
  onClick?: () => void;
  /** Switched on: drawn in the active colours (camera on, sharing, muted). */
  active?: boolean;
  /** The end button: drawn in the danger colours. */
  danger?: boolean;
  disabled?: boolean;
  /** Diameter in px. Default 56. */
  size?: number;
  sx?: SxProps<Theme>;
}

/** One round dark button of the call's control row. */
export function CallControlButton({ label, icon, onClick, active, danger, disabled, size = 56, sx }: CallControlButtonProps) {
  const colors = useCallColors();
  const base = danger ? colors.danger : active ? colors.controlActive : colors.control;
  const hover = danger ? colors.danger : active ? colors.controlActive : colors.controlHover;
  return (
    <ButtonBase
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      data-active={active ? "" : undefined}
      sx={[
        {
          flex: "0 0 auto",
          width: size,
          height: size,
          borderRadius: "50%",
          bgcolor: base,
          color: danger ? colors.dangerText : active ? colors.controlActiveText : colors.text,
          transition: "background-color 120ms",
          "&:hover": { bgcolor: hover },
          "&.Mui-focusVisible": { outline: `2px solid ${colors.text}`, outlineOffset: 2 },
          "&.Mui-disabled": { opacity: 0.4 },
          "& svg": { fontSize: 24 },
          "@media (prefers-reduced-motion: reduce)": { transition: "none" },
        },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    >
      {icon}
    </ButtonBase>
  );
}
