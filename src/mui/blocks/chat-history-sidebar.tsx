"use client";

import { useState } from "react";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import MenuIcon from "@mui/icons-material/Menu";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Collapse from "@mui/material/Collapse";
import InputAdornment from "@mui/material/InputAdornment";
import List from "@mui/material/List";
import ListSubheader from "@mui/material/ListSubheader";
import TextField from "@mui/material/TextField";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import { alpha, useTheme, type Breakpoint } from "@mui/material/styles";
import { useChatKitStyles } from "../theme";
import { Message } from "../primitives/message";
import { filterConversations, groupConversationsByAge } from "../../core/conversation-groups";
import { ChatHistoryRow, DEFAULT_HISTORY_LABELS, type ChatHistoryLabels } from "./chat-history-row";

export type { ChatHistoryLabels } from "./chat-history-row";
export { DEFAULT_HISTORY_LABELS } from "./chat-history-row";

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

function relativeTime(at: ChatHistoryItem["at"], now: number): string {
  if (at === null || at === undefined) return "";
  const date = new Date(at);
  if (Number.isNaN(date.getTime())) return "";
  const seconds = Math.round((date.getTime() - now) / 1000);
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
  /** Shows a search box above the list that filters by title and preview. Default: off. */
  searchable?: boolean;
  /** Groups the list by when each conversation was last active (Today, Yesterday, ...). Default: off. */
  grouped?: boolean;
  /** Adds Rename to each row's menu. The row shows a menu button when this or `onDelete` is given. */
  onRename?: (id: string, title: string) => void;
  /** Adds Delete (after a confirm) to each row's menu. */
  onDelete?: (id: string) => void;
  /** Overrides any of the texts; the rest keep their defaults. */
  labels?: Partial<ChatHistoryLabels>;
  /** The time "Today" and the relative times are measured against; for tests. Default: the clock. */
  now?: Date | number;
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
  searchable = false,
  grouped = false,
  onRename,
  onDelete,
  labels: labelOverrides,
  now,
}: ChatHistorySidebarProps) {
  const { scheme } = useChatKitStyles();
  const theme = useTheme();
  const narrow = useMediaQuery(theme.breakpoints.down(collapseBelow));
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const labels = { ...DEFAULT_HISTORY_LABELS, ...labelOverrides };
  const nowMs = now === undefined ? Date.now() : new Date(now).getTime();
  const shown = searchable ? filterConversations(items, query) : items;
  const groups = grouped ? groupConversationsByAge(shown, nowMs) : [{ group: null, items: shown }];

  const renderRow = (row: ChatHistoryItem) => (
    <ChatHistoryRow
      key={row.id}
      id={row.id}
      title={row.title || row.preview || labels.untitled}
      secondary={relativeTime(row.at, nowMs)}
      selected={row.id === activeId}
      onSelect={() => select(row.id)}
      onRename={onRename}
      onDelete={onDelete}
      labels={labels}
    />
  );

  const select = (id: string) => {
    onSelect(id);
    if (narrow) setOpen(false);
  };

  const list = (
    <Stack component="nav" aria-label={labels.conversations} sx={{ height: "100%", minHeight: 0 }}>
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
          {labels.newChat}
        </Button>
      </Box>
      {searchable ? (
        <Box sx={{ px: 2, pb: 1 }}>
          <TextField
            fullWidth
            size="small"
            type="search"
            placeholder={labels.search}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            slotProps={{
              htmlInput: { "aria-label": labels.search },
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              },
            }}
          />
        </Box>
      ) : null}
      <List dense sx={{ flex: 1, minHeight: 0, overflowY: "auto", px: 1 }}>
        {searchable && query.trim() && shown.length === 0 ? (
          <Typography
            variant="body2"
            role="status"
            sx={scheme((c) => ({ px: 2, py: 1, color: c.mutedText }))}
          >
            {labels.noMatches}
          </Typography>
        ) : null}
        {groups.map(({ group, items: rows }) =>
          group ? (
            <li key={group}>
              <List dense disablePadding aria-label={labels[group]}>
                <ListSubheader
                  disableSticky
                  sx={scheme((c) => ({ bgcolor: "transparent", color: c.mutedText, lineHeight: "28px" }))}
                >
                  {labels[group]}
                </ListSubheader>
                {rows.map(renderRow)}
              </List>
            </li>
          ) : (
            rows.map(renderRow)
          )
        )}
        {hasMore && onLoadMore ? (
          <Box sx={{ p: 1 }}>
            <Button
              fullWidth
              size="small"
              disabled={loading}
              onClick={onLoadMore}
              sx={scheme((c) => ({ color: c.accent }))}
            >
              {labels.loadMore}
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
        {labels.conversations}
      </Button>
      <Collapse in={open} unmountOnExit>
        <Box sx={{ maxHeight: NARROW_LIST_MAX_HEIGHT, display: "flex", flexDirection: "column", minHeight: 0 }}>
          {list}
        </Box>
      </Collapse>
    </Box>
  );
}
