"use client";

import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { alpha } from "@mui/material/styles";
import GraphicEqRoundedIcon from "@mui/icons-material/GraphicEqRounded";
import { useChatKitStyles } from "../theme";

/** The waveform "Start a call" button, which takes the Send slot while there is nothing to send. */
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
          sx={scheme((c) => ({ color: c.text, "&:hover": { bgcolor: alpha(c.text, 0.08) }, "&.Mui-disabled": { color: c.mutedText } }))}
        >
          <GraphicEqRoundedIcon fontSize="small" />
        </IconButton>
      </span>
    </Tooltip>
  );
}
