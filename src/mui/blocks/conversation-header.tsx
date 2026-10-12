"use client";

import type { ReactNode } from "react";
import BookmarkBorderIcon from "@mui/icons-material/BookmarkBorder";
import BookmarkIcon from "@mui/icons-material/Bookmark";
import PushPinIcon from "@mui/icons-material/PushPin";
import PushPinOutlinedIcon from "@mui/icons-material/PushPinOutlined";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useChatKitStyles } from "../theme";

export type ConversationHeaderLabels = {
  pin: string;
  unpin: string;
  save: string;
  saved: string;
};

export const DEFAULT_HEADER_LABELS: ConversationHeaderLabels = {
  pin: "Pin chat",
  unpin: "Unpin chat",
  save: "Save chat",
  saved: "Saved",
};

export type ConversationHeaderProps = {
  /** The conversation's title. */
  title: string;
  /** Whether the conversation is pinned in the history list. */
  pinned?: boolean;
  /** Shows the Pin toggle; called with the value the person is asking for. */
  onPinChange?: (pinned: boolean) => void;
  /** Whether the whole conversation is saved. */
  saved?: boolean;
  /** Shows the Save toggle (a bookmark); called with the value the person is asking for. */
  onSaveChange?: (saved: boolean) => void;
  /** Anything else for the right-hand end, such as a share or more menu. */
  actions?: ReactNode;
  /** Overrides any of the texts; the rest keep their defaults. */
  labels?: Partial<ConversationHeaderLabels>;
};

/**
 * A compact bar above a conversation: its title, then optional Pin and Save toggles and a
 * slot for your own actions. A toggle only shows when you pass its change handler. The kit
 * draws and reports; your app keeps whether a chat is pinned or saved.
 */
export function ConversationHeader({
  title,
  pinned = false,
  onPinChange,
  saved = false,
  onSaveChange,
  actions,
  labels: labelOverrides,
}: ConversationHeaderProps) {
  const { scheme } = useChatKitStyles();
  const labels = { ...DEFAULT_HEADER_LABELS, ...labelOverrides };
  const pressed = scheme((c) => ({ color: c.accent }));
  return (
    <Box
      component="header"
      data-chat="conversation-header"
      sx={scheme((c) => ({
        display: "flex",
        alignItems: "center",
        gap: 0.5,
        minHeight: 48,
        px: 2,
        borderBottom: 1,
        borderColor: c.border,
        bgcolor: c.surface,
        color: c.text,
      }))}
    >
      <Typography component="h2" variant="subtitle1" noWrap sx={{ flex: 1, minWidth: 0, fontWeight: 600 }}>
        {title}
      </Typography>
      {onPinChange ? (
        <Tooltip title={pinned ? labels.unpin : labels.pin}>
          <IconButton
            size="small"
            aria-label={labels.pin}
            aria-pressed={pinned}
            onClick={() => onPinChange(!pinned)}
            sx={pinned ? pressed : undefined}
          >
            {pinned ? <PushPinIcon fontSize="small" /> : <PushPinOutlinedIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
      ) : null}
      {onSaveChange ? (
        <Tooltip title={saved ? labels.saved : labels.save}>
          <IconButton
            size="small"
            aria-label={labels.save}
            aria-pressed={saved}
            onClick={() => onSaveChange(!saved)}
            sx={saved ? pressed : undefined}
          >
            {saved ? <BookmarkIcon fontSize="small" /> : <BookmarkBorderIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
      ) : null}
      {actions}
    </Box>
  );
}
