"use client";

import { useState } from "react";
import AddIcon from "@mui/icons-material/Add";
import MenuIcon from "@mui/icons-material/Menu";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Collapse from "@mui/material/Collapse";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import { alpha, useTheme, type Breakpoint } from "@mui/material/styles";
import { useChatKitStyles } from "../theme";
import { Message } from "../primitives/message";

const UNTITLED = "New conversation";
const AVATAR_SIZE = 36;
const NARROW_LIST_MAX_HEIGHT = 280;

export type ChatHistoryItem = {
  id: string;
  title?: string | null;
  preview?: string | null;
  /** When the conversation was last active; shown as "3 hours ago". */
  at?: string | number | Date | null;
};

/** Who the history belongs to: shown above the New chat button. */
export type ChatHistoryIdentity = {
  name: string;
  initial: string;
  avatarSrc?: string;
  subtitle?: string;
};

const UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ["year", 31_536_000],
  ["month", 2_592_000],
  ["day", 86_400],
  ["hour", 3_600],
  ["minute", 60],
];

function relativeTime(at: ChatHistoryItem["at"]): string {
  if (at === null || at === undefined) return "";
  const date = new Date(at);
  if (Number.isNaN(date.getTime())) return "";
  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return formatter.format(Math.round(seconds / size), unit);
  }
  return formatter.format(0, "second");
}

export type ChatHistorySidebarProps = {
  items: ChatHistoryItem[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  identity?: ChatHistoryIdentity;
  hasMore?: boolean;
  loading?: boolean;
  onLoadMore?: () => void;
  /** Below this breakpoint the list folds behind a "Conversations" button. */
  collapseBelow?: Breakpoint;
};

/**
 * The conversation list: who it belongs to, a New chat button and the past conversations,
 * newest first as supplied. On a screen narrower than `collapseBelow` it folds behind a
 * button and opens in flow above the chat, so the chat keeps the width.
 */
export function ChatHistorySidebar({
  items,
  activeId,
  onSelect,
  onNew,
  identity,
  hasMore = false,
  loading = false,
  onLoadMore,
  collapseBelow = "md",
}: ChatHistorySidebarProps) {
  const { scheme } = useChatKitStyles();
  const theme = useTheme();
  const narrow = useMediaQuery(theme.breakpoints.down(collapseBelow));
  const [open, setOpen] = useState(false);

  const select = (id: string) => {
    onSelect(id);
    if (narrow) setOpen(false);
  };

  const list = (
    <Stack component="nav" aria-label="Conversations" sx={{ height: "100%", minHeight: 0 }}>
      {identity ? (
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", p: 2 }}>
          <Message.Avatar initial={identity.initial} src={identity.avatarSrc} size={AVATAR_SIZE} />
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle2" noWrap>
              {identity.name}
            </Typography>
            {identity.subtitle ? (
              <Typography
                variant="caption"
                noWrap
                sx={scheme((c) => ({ display: "block", color: c.mutedText }))}
              >
                {identity.subtitle}
              </Typography>
            ) : null}
          </Box>
        </Stack>
      ) : null}
      <Box sx={{ px: 2, pb: 1, pt: identity ? 0 : 2 }}>
        <Button
          fullWidth
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => {
            onNew();
            if (narrow) setOpen(false);
          }}
          sx={scheme((c) => ({ color: c.accent, borderColor: alpha(c.accent, 0.7) }))}
        >
          New chat
        </Button>
      </Box>
      <List dense sx={{ flex: 1, minHeight: 0, overflowY: "auto", px: 1 }}>
        {items.map((row) => (
          <ListItemButton
            key={row.id}
            selected={row.id === activeId}
            onClick={() => select(row.id)}
            sx={scheme((c, all) => ({
              borderRadius: `${all.radius}px`,
              color: c.text,
              "&.Mui-selected, &.Mui-selected:hover": { bgcolor: alpha(c.accent, 0.12) },
              "&:hover": { bgcolor: c.muted },
              "&.Mui-focusVisible": { outline: 2, outlineStyle: "solid", outlineColor: c.accent },
              "& .MuiListItemText-secondary": { color: c.mutedText },
            }))}
          >
            <ListItemText
              primary={row.title || row.preview || UNTITLED}
              secondary={relativeTime(row.at)}
              slotProps={{ primary: { noWrap: true } }}
            />
          </ListItemButton>
        ))}
        {hasMore && onLoadMore ? (
          <Box sx={{ p: 1 }}>
            <Button
              fullWidth
              size="small"
              disabled={loading}
              onClick={onLoadMore}
              sx={scheme((c) => ({ color: c.accent }))}
            >
              Load more
            </Button>
          </Box>
        ) : null}
      </List>
    </Stack>
  );

  if (!narrow) return list;
  return (
    <Box data-testid="chat-history-collapsed">
      <Button
        size="small"
        startIcon={<MenuIcon />}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        sx={scheme((c) => ({ m: 1, color: c.accent }))}
      >
        Conversations
      </Button>
      <Collapse in={open} unmountOnExit>
        <Box sx={{ maxHeight: NARROW_LIST_MAX_HEIGHT, display: "flex", flexDirection: "column", minHeight: 0 }}>
          {list}
        </Box>
      </Collapse>
    </Box>
  );
}
