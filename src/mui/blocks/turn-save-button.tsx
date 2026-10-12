"use client";

/** The Save toggle under a reply: a bookmark that shows pressed once the reply is saved. */

import BookmarkBorderIcon from "@mui/icons-material/BookmarkBorder";
import BookmarkIcon from "@mui/icons-material/Bookmark";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { TURN_ACTION_COPY } from "../../core/stream/turn-copy";
import type { ChatMessage } from "../../core/types";
import { useChatKitStyles } from "../theme";

export function TurnSaveButton({
  message,
  saved,
  onSave,
}: {
  message: ChatMessage;
  saved: boolean;
  onSave: (message: ChatMessage) => void;
}) {
  const { scheme } = useChatKitStyles();
  return (
    <Tooltip title={saved ? TURN_ACTION_COPY.saved : TURN_ACTION_COPY.save}>
      <IconButton
        size="small"
        aria-label={TURN_ACTION_COPY.save}
        aria-pressed={saved}
        onClick={() => onSave(message)}
        sx={saved ? scheme((c) => ({ color: c.accent })) : undefined}
      >
        {saved ? <BookmarkIcon fontSize="small" /> : <BookmarkBorderIcon fontSize="small" />}
      </IconButton>
    </Tooltip>
  );
}
