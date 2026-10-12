"use client";

/** The Saved tab of the history sidebar: saved chats and saved messages, newest first. */

import { useId, useState } from "react";
import ChatBubbleOutlinedIcon from "@mui/icons-material/ChatBubbleOutlined";
import FormatQuoteIcon from "@mui/icons-material/FormatQuote";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Typography from "@mui/material/Typography";
import type { SavedItem } from "../../core/saved-items";
import { useChatKitStyles } from "../theme";
import type { ChatHistoryLabels } from "./chat-history-row";

function SavedRow({
  item,
  when,
  onOpen,
  onUnsave,
  labels,
}: {
  item: SavedItem;
  when: string;
  onOpen: () => void;
  onUnsave?: (item: SavedItem) => void;
  labels: ChatHistoryLabels;
}) {
  const { scheme } = useChatKitStyles();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const menuId = useId();
  const isMessage = item.kind === "message";
  const kindLabel = isMessage ? labels.savedMessage : labels.savedChat;
  const Icon = isMessage ? FormatQuoteIcon : ChatBubbleOutlinedIcon;
  return (
    <ListItem
      disablePadding
      data-saved-id={item.id}
      secondaryAction={
        onUnsave ? (
          <IconButton
            edge="end"
            size="small"
            aria-label={labels.rowOptions(item.title)}
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
        onClick={onOpen}
        sx={scheme((c, all) => ({
          borderRadius: `${all.radius}px`,
          color: c.text,
          alignItems: "flex-start",
          pr: onUnsave ? 5 : undefined,
          "&:hover": { bgcolor: c.muted },
          "&.Mui-focusVisible": { outline: 2, outlineStyle: "solid", outlineColor: c.accent },
          "& .MuiListItemText-secondary": { color: c.mutedText },
        }))}
      >
        <ListItemIcon sx={scheme((c) => ({ minWidth: 32, mt: 0.5, color: c.mutedText }))}>
          <Icon fontSize="small" titleAccess={kindLabel} />
        </ListItemIcon>
        <ListItemText
          primary={item.title}
          secondary={
            <>
              {isMessage && item.text ? (
                <Box component="span" sx={{ display: "block" }} className="saved-preview">
                  {item.text}
                </Box>
              ) : null}
              <Typography component="span" variant="caption" sx={{ display: "block" }}>
                {labels.savedAt(when)}
              </Typography>
            </>
          }
          slotProps={{ primary: { noWrap: true }, secondary: { component: "div" } }}
          sx={{
            "& .saved-preview": { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
          }}
        />
      </ListItemButton>
      {onUnsave ? (
        <Menu id={menuId} anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
          <MenuItem
            onClick={() => {
              setAnchor(null);
              onUnsave(item);
            }}
          >
            {labels.unsave}
          </MenuItem>
        </Menu>
      ) : null}
    </ListItem>
  );
}

/** The rows of the Saved tab. The list is drawn in the order it is given; sort it first. */
export function SavedList({
  items,
  timeText,
  onOpen,
  onUnsave,
  labels,
}: {
  items: SavedItem[];
  /** How long ago an item was saved, as text. */
  timeText: (item: SavedItem) => string;
  onOpen: (item: SavedItem) => void;
  onUnsave?: (item: SavedItem) => void;
  labels: ChatHistoryLabels;
}) {
  return (
    <List dense disablePadding aria-label={labels.savedTab}>
      {items.map((item) => (
        <SavedRow
          key={item.id}
          item={item}
          when={timeText(item)}
          onOpen={() => onOpen(item)}
          onUnsave={onUnsave}
          labels={labels}
        />
      ))}
    </List>
  );
}
