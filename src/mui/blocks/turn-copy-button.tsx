"use client";

import { useEffect, useState } from "react";
import CheckIcon from "@mui/icons-material/Check";
import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { answerSource } from "../../core/stream/turn-answer";
import { TURN_ACTION_COPY } from "../../core/stream/turn-copy";
import type { ChatMessage } from "../../core/types";
import { useChatKitStyles } from "../theme";

const COPIED_FOR_MS = 2000;

/**
 * Copies a reply's answer text (its markdown source, never reasoning or tool details) and
 * says "Copied" for a moment. `TurnActions` draws it whenever the surface supplies `onCopy`.
 */
export function TurnCopyButton({
  message,
  onCopy,
}: {
  message: ChatMessage;
  onCopy: (text: string) => Promise<void>;
}) {
  const { scheme } = useChatKitStyles();
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  useEffect(() => {
    if (state === "idle") return;
    const timer = setTimeout(() => setState("idle"), COPIED_FOR_MS);
    return () => clearTimeout(timer);
  }, [state]);
  const label = state === "copied" ? TURN_ACTION_COPY.copied : TURN_ACTION_COPY.copy;
  return (
    <Stack direction="row" sx={{ alignItems: "center" }}>
      <Tooltip title={label}>
        <IconButton
          size="small"
          aria-label={label}
          onClick={() => {
            onCopy(answerSource(message)).then(
              () => setState("copied"),
              () => setState("failed")
            );
          }}
        >
          {state === "copied" ? <CheckIcon fontSize="small" /> : <ContentCopyOutlinedIcon fontSize="small" />}
        </IconButton>
      </Tooltip>
      {state === "idle" ? null : (
        <Typography
          variant="caption"
          role="status"
          sx={scheme((c) => ({ color: state === "failed" ? c.error : c.mutedText }))}
        >
          {state === "copied" ? TURN_ACTION_COPY.copied : TURN_ACTION_COPY.copyFailed}
        </Typography>
      )}
    </Stack>
  );
}
