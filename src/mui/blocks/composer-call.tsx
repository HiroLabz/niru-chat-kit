"use client";

import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import CallOutlinedIcon from "@mui/icons-material/CallOutlined";
import { useChatKitStyles } from "../theme";

/** The round "Start a call" button in the composer's action row, just before Send. */
export function ComposerCallButton({ onStartCall, label = "Start a call", disabled }: { onStartCall?: () => void; label?: string; disabled?: boolean }) {
  const { scheme } = useChatKitStyles();
  if (!onStartCall) return null;
  return (
    <Tooltip title={label}>
      <span>
        <IconButton
          size="small"
          aria-label={label}
          data-chat="call"
          disabled={disabled}
          onClick={onStartCall}
          sx={scheme((c) => ({ border: 1, borderColor: c.border, color: c.text }))}
        >
          <CallOutlinedIcon fontSize="small" />
        </IconButton>
      </span>
    </Tooltip>
  );
}
