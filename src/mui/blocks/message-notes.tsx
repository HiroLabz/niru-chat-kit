"use client";

import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import { MESSAGE_NOTE_COPY } from "../../core/stream/turn-copy";
import type { ChatMessage } from "../../core/types";
import { useChatKitStyles } from "../theme";

/**
 * What the settled bubble needs to say about how its answer ended: cut short by Stop,
 * or answered without support from the sources it was given.
 */
export function MessageNotes({ message }: { message: ChatMessage }) {
  const { scheme } = useChatKitStyles();
  const stopped = message.status === "stopped";
  const notGrounded = message.citationCheck?.grounded === false;
  if (message.pending || (!stopped && !notGrounded)) return null;
  return (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 0.5, mt: 0.5 }}>
      {stopped ? (
        <Chip
          size="small"
          variant="outlined"
          label={MESSAGE_NOTE_COPY.stopped}
          data-testid="message-stopped"
          sx={scheme((c) => ({ color: c.text, borderColor: c.border }))}
        />
      ) : null}
      {notGrounded ? (
        <Box
          role="note"
          sx={scheme((c, all) => ({
            display: "flex",
            alignItems: "center",
            gap: 0.75,
            px: 1,
            py: 0.5,
            borderRadius: `${all.bubbleRadius}px`,
            border: 1,
            borderColor: alpha(c.warning, 0.5),
            bgcolor: alpha(c.warning, 0.08),
            color: c.warning,
          }))}
        >
          <WarningAmberOutlinedIcon sx={{ fontSize: 16 }} />
          <Typography variant="caption" sx={scheme((c) => ({ color: c.text }))}>
            {MESSAGE_NOTE_COPY.notGrounded}
          </Typography>
        </Box>
      ) : null}
    </Box>
  );
}
