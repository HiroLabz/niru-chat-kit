"use client";

/** The Delete control under a turn: asks first, then calls `onDelete`. */

import { useId, useState } from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import { DELETE_CONFIRM_COPY } from "../../core/stream/turn-copy";
import type { ChatMessage } from "../../core/types";

export function TurnDeleteButton({
  message,
  onDelete,
  disabled,
}: {
  message: ChatMessage;
  onDelete: (message: ChatMessage) => void;
  disabled?: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const titleId = useId();
  return (
    <>
      <Tooltip title={DELETE_CONFIRM_COPY.action}>
        <span>
          <IconButton
            size="small"
            aria-label={DELETE_CONFIRM_COPY.action}
            aria-haspopup="dialog"
            disabled={disabled}
            onClick={() => setConfirming(true)}
          >
            <DeleteOutlinedIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
      <Dialog open={confirming} onClose={() => setConfirming(false)} aria-labelledby={titleId}>
        <DialogTitle id={titleId}>{DELETE_CONFIRM_COPY.title}</DialogTitle>
        <DialogContent>
          <DialogContentText>{DELETE_CONFIRM_COPY.body}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirming(false)}>{DELETE_CONFIRM_COPY.cancel}</Button>
          <Button
            color="error"
            onClick={() => {
              setConfirming(false);
              onDelete(message);
            }}
          >
            {DELETE_CONFIRM_COPY.confirm}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
