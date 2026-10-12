"use client";

import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { alpha, darken } from "@mui/material/styles";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import StopRoundedIcon from "@mui/icons-material/StopRounded";
import { PromptInput } from "../primitives/prompt-input";
import { useChatKitStyles } from "../theme";

/** The "Answering: <question>" chip above the text while the agent waits on an answer. */
export function ComposerAnsweringChip({ question, label }: { question: string; label: string }) {
  const { scheme } = useChatKitStyles();
  return (
    <Typography
      variant="caption"
      data-chat="composer-answering"
      title={question}
      sx={scheme((c) => ({
        display: "block",
        width: "fit-content",
        maxWidth: "100%",
        mb: 0.75,
        px: 1.1,
        py: 0.25,
        borderRadius: 999,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        bgcolor: alpha(c.accent, 0.12),
        color: c.text,
      }))}
    >
      {label} {question}
    </Typography>
  );
}

/** Stop while a run is busy and can be stopped, otherwise Send. */
export function ComposerSendButton({
  busy,
  onStop,
  canSend,
  onSend,
  tooltip,
}: {
  busy: boolean;
  onStop?: () => void;
  canSend: boolean;
  onSend: () => void;
  tooltip: string;
}) {
  const { scheme } = useChatKitStyles();
  if (busy && onStop) {
    return (
      <Tooltip title="Stop">
        <IconButton size="small" aria-label="Stop" onClick={onStop} sx={scheme((c) => ({ color: c.error }))}>
          <StopRoundedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    );
  }
  return (
    <PromptInput.Action tooltip={tooltip}>
      <IconButton
        size="small"
        aria-label="Send"
        data-chat="send"
        disabled={!canSend}
        onClick={onSend}
        sx={scheme((c) => ({
          bgcolor: c.accent,
          color: c.accentContrast,
          "&:hover": { bgcolor: darken(c.accent, 0.15) },
          "&.Mui-disabled": { bgcolor: c.muted, color: c.mutedText },
        }))}
      >
        <ArrowUpwardIcon fontSize="small" />
      </IconButton>
    </PromptInput.Action>
  );
}
