"use client";

import { useId, type ComponentPropsWithoutRef } from "react";
import Box from "@mui/material/Box";
import Dialog from "@mui/material/Dialog";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import { useReducedMotion } from "../call/use-reduced-motion";
import { useChatKitStyles } from "../theme";
import { markdownStyles } from "./markdown-styles";
import { visibleScrollbar } from "./markdown-table-styles";

export const TABLE_DIALOG_COPY = {
  expand: "Expand table",
  title: "Table",
  close: "Close",
  region: "Table, scrolls sideways",
} as const;

/**
 * A wide table opened over the whole window: the same rows, in the markdown's own styles, free
 * to scroll both ways, with the header row kept in view. Escape or Close returns to the chat
 * (MUI puts focus back on the Expand button).
 */
export function MarkdownTableDialog({
  table,
  onClose,
}: {
  table: ComponentPropsWithoutRef<"table">;
  onClose: () => void;
}) {
  const { scheme } = useChatKitStyles();
  const reduced = useReducedMotion();
  const titleId = useId();
  return (
    <Dialog
      open
      fullScreen
      onClose={onClose}
      aria-labelledby={titleId}
      transitionDuration={reduced ? 0 : undefined}
      slotProps={{
        paper: {
          "data-chat-table-dialog": "",
          // Set in full: a host theme may size every dialog's paper (Niru's is 500 px wide), and
          // this one must fill the window whatever the theme says.
          sx: scheme((c) => ({
            bgcolor: c.surface,
            color: c.text,
            backgroundImage: "none",
            display: "flex",
            flexDirection: "column",
            width: "100%",
            maxWidth: "none",
            height: "100%",
            maxHeight: "none",
            m: 0,
            borderRadius: 0,
          })),
        } as object,
      }}
    >
      <Box
        sx={scheme((c) => ({
          display: "flex",
          alignItems: "center",
          gap: 0.5,
          pl: 2,
          pr: 1,
          py: 0.5,
          borderBottom: "1px solid",
          borderColor: c.border,
        }))}
      >
        <Typography id={titleId} component="h2" noWrap sx={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 600 }}>
          {TABLE_DIALOG_COPY.title}
        </Typography>
        <IconButton aria-label={TABLE_DIALOG_COPY.close} title={TABLE_DIALOG_COPY.close} onClick={onClose}>
          <CloseOutlinedIcon />
        </IconButton>
      </Box>
      <Box
        sx={scheme((c, all) => {
          const line = `1px solid ${c.border}`;
          return {
            ...markdownStyles(c, all),
            flex: 1,
            minHeight: 0,
            overflow: "auto",
            p: 2,
            fontFamily: all.fontFamily,
            fontSize: "0.875rem",
            "& table": { borderCollapse: "separate", borderSpacing: 0, width: "max-content", display: "table", m: 0 },
            "& th, & td": { border: 0, borderInlineEnd: line, borderBottom: line, px: 1, py: 0.5 },
            "& tr > :first-of-type": { borderInlineStart: line },
            "& thead th": { position: "sticky", top: 0, zIndex: 1, bgcolor: c.surface, borderTop: line },
            ...visibleScrollbar(c),
          };
        })}
      >
        <table {...table} />
      </Box>
    </Dialog>
  );
}
