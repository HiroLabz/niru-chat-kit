"use client";

import type { ReactNode } from "react";
import MenuIcon from "@mui/icons-material/Menu";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Drawer from "@mui/material/Drawer";
import { useChatKitStyles } from "../theme";

const DRAWER_WIDTH = 320;

/**
 * The conversation list on a narrow screen: a "Conversations" button that opens the list as a
 * drawer sliding in from the left, over the chat. The button stays in flow at the top of the chat.
 */
export function ChatHistoryDrawer({
  label,
  open,
  onOpenChange,
  children,
}: {
  label: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  const { scheme } = useChatKitStyles();
  return (
    <Box data-testid="chat-history-collapsed">
      <Button
        size="small"
        startIcon={<MenuIcon />}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => onOpenChange(true)}
        sx={scheme((c) => ({ m: 1, color: c.accent }))}
      >
        {label}
      </Button>
      <Drawer
        open={open}
        onClose={() => onOpenChange(false)}
        slotProps={{
          paper: {
            "aria-label": label,
            sx: scheme((c) => ({
              width: `min(${DRAWER_WIDTH}px, 88vw)`,
              bgcolor: c.surface,
              color: c.text,
              backgroundImage: "none",
              borderColor: c.border,
              pt: "env(safe-area-inset-top)",
              pb: "env(safe-area-inset-bottom)",
            })),
          },
        }}
      >
        <Box data-testid="chat-history-drawer" sx={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
          {children}
        </Box>
      </Drawer>
    </Box>
  );
}
