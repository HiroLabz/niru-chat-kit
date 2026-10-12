"use client";

/** One conversation in the history list, with an optional rename and delete menu. */

import { useId, useState } from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import { alpha } from "@mui/material/styles";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import PushPinIcon from "@mui/icons-material/PushPin";
import { useChatKitStyles } from "../theme";
import { flashStyles } from "./use-flash";

export type ChatHistoryLabels = {
  conversations: string;
  newChat: string;
  untitled: string;
  loadMore: string;
  search: string;
  noMatches: string;
  rowOptions: (title: string) => string;
  rename: string;
  renameField: string;
  delete: string;
  deleteTitle: string;
  deleteBody: (title: string) => string;
  deleteConfirm: string;
  cancel: string;
  today: string;
  yesterday: string;
  previous7: string;
  previous30: string;
  older: string;
  /** Heading of the group of pinned conversations. */
  pinnedGroup: string;
  pin: string;
  unpin: string;
  /** The two tabs, shown when `saved` is given. */
  chatsTab: string;
  savedTab: string;
  /** The Saved list when nothing is saved. */
  savedEmpty: string;
  /** What a saved row is, for a screen reader and the icon's tooltip. */
  savedChat: string;
  savedMessage: string;
  /** The line under a saved row, for example "Saved 2 days ago". */
  savedAt: (when: string) => string;
  unsave: string;
};

export const DEFAULT_HISTORY_LABELS: ChatHistoryLabels = {
  conversations: "Conversations",
  newChat: "New chat",
  untitled: "New conversation",
  loadMore: "Load more",
  search: "Search conversations",
  noMatches: "No conversations match your search.",
  rowOptions: (title) => `Options for ${title}`,
  rename: "Rename",
  renameField: "Conversation title",
  delete: "Delete",
  deleteTitle: "Delete this conversation?",
  deleteBody: (title) => `"${title}" will be removed. This cannot be undone.`,
  deleteConfirm: "Delete",
  cancel: "Cancel",
  today: "Today",
  yesterday: "Yesterday",
  previous7: "Previous 7 days",
  previous30: "Previous 30 days",
  older: "Older",
  pinnedGroup: "Pinned",
  pin: "Pin",
  unpin: "Unpin",
  chatsTab: "Chats",
  savedTab: "Saved",
  savedEmpty: "Nothing saved yet.",
  savedChat: "Saved chat",
  savedMessage: "Saved message",
  savedAt: (when) => `Saved ${when}`,
  unsave: "Remove from saved",
};

export function ChatHistoryRow({
  id,
  title,
  secondary,
  selected,
  onSelect,
  onRename,
  onDelete,
  pinned = false,
  onPin,
  highlighted = false,
  labels,
}: {
  id: string;
  title: string;
  secondary: string;
  selected: boolean;
  onSelect: () => void;
  onRename?: (id: string, title: string) => void;
  onDelete?: (id: string) => void;
  pinned?: boolean;
  /** Adds Pin / Unpin to the row's menu. */
  onPin?: (id: string, pinned: boolean) => void;
  /** Flashes the row with the accent tint (an outline under reduced motion). */
  highlighted?: boolean;
  labels: ChatHistoryLabels;
}) {
  const { scheme } = useChatKitStyles();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(title);
  const [confirming, setConfirming] = useState(false);
  const menuId = useId();
  const hasMenu = Boolean(onRename || onDelete || onPin);

  function commitRename() {
    const next = draft.trim();
    setRenaming(false);
    if (next && next !== title) onRename?.(id, next);
  }

  if (renaming) {
    return (
      <ListItem disablePadding sx={{ px: 1, py: 0.5 }}>
        <TextField
          autoFocus
          fullWidth
          size="small"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commitRename}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commitRename();
            } else if (event.key === "Escape") {
              event.stopPropagation();
              setRenaming(false);
            }
          }}
          slotProps={{ htmlInput: { "aria-label": labels.renameField } }}
        />
      </ListItem>
    );
  }

  return (
    <ListItem
      disablePadding
      data-chat-history-id={id}
      data-highlighted={highlighted ? "true" : undefined}
      secondaryAction={
        hasMenu ? (
          <IconButton
            edge="end"
            size="small"
            aria-label={labels.rowOptions(title)}
            aria-haspopup="menu"
            aria-expanded={Boolean(anchor)}
            aria-controls={anchor ? menuId : undefined}
            onClick={(event) => setAnchor(event.currentTarget)}
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>
        ) : undefined
      }
    >
      <ListItemButton
        selected={selected}
        onClick={onSelect}
        sx={scheme((c, all) => ({
          borderRadius: `${all.radius}px`,
          color: c.text,
          pr: hasMenu ? 5 : undefined,
          "&.Mui-selected, &.Mui-selected:hover": { bgcolor: alpha(c.accent, 0.12) },
          "&:hover": { bgcolor: c.muted },
          "&.Mui-focusVisible": { outline: 2, outlineStyle: "solid", outlineColor: c.accent },
          "& .MuiListItemText-secondary": { color: c.mutedText },
          ...(highlighted ? flashStyles(c, all.radius) : {}),
        }))}
      >
        <ListItemText
          primary={
            pinned ? (
              <>
                <PushPinIcon aria-hidden fontSize="inherit" sx={{ mr: 0.5, verticalAlign: "-2px", opacity: 0.7 }} />
                {title}
              </>
            ) : (
              title
            )
          }
          secondary={secondary}
          slotProps={{ primary: { noWrap: true } }}
        />
      </ListItemButton>
      {hasMenu ? (
        <Menu id={menuId} anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
          {onPin ? (
            <MenuItem
              onClick={() => {
                setAnchor(null);
                onPin(id, !pinned);
              }}
            >
              {pinned ? labels.unpin : labels.pin}
            </MenuItem>
          ) : null}
          {onRename ? (
            <MenuItem
              onClick={() => {
                setAnchor(null);
                setDraft(title);
                setRenaming(true);
              }}
            >
              {labels.rename}
            </MenuItem>
          ) : null}
          {onDelete ? (
            <MenuItem
              onClick={() => {
                setAnchor(null);
                setConfirming(true);
              }}
              sx={scheme((c) => ({ color: c.error }))}
            >
              {labels.delete}
            </MenuItem>
          ) : null}
        </Menu>
      ) : null}
      {onDelete ? (
        <Dialog open={confirming} onClose={() => setConfirming(false)} aria-labelledby={`${menuId}-title`}>
          <DialogTitle id={`${menuId}-title`}>{labels.deleteTitle}</DialogTitle>
          <DialogContent>
            <DialogContentText>{labels.deleteBody(title)}</DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirming(false)}>{labels.cancel}</Button>
            <Button
              color="error"
              onClick={() => {
                setConfirming(false);
                onDelete(id);
              }}
            >
              {labels.deleteConfirm}
            </Button>
          </DialogActions>
        </Dialog>
      ) : null}
    </ListItem>
  );
}
