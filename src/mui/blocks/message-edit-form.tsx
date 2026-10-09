"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { EDIT_FORM_COPY } from "../../core/stream/turn-copy";
import { useChatKitStyles } from "../theme";

const EDIT_MAX_ROWS = 8;

/** A user turn opened for editing: Save sends the new wording as a new branch. */
export function MessageEditForm({
  initialText,
  disabled,
  onSave,
  onCancel,
}: {
  initialText: string;
  disabled: boolean;
  onSave: (text: string) => void;
  onCancel: () => void;
}) {
  const { scheme } = useChatKitStyles();
  const [text, setText] = useState(initialText);
  const trimmed = text.trim();
  const canSave = !disabled && trimmed.length > 0 && trimmed !== initialText.trim();
  return (
    <Box
      component="form"
      onSubmit={(event) => {
        event.preventDefault();
        if (canSave) onSave(trimmed);
      }}
      sx={{ width: "100%", minWidth: 240 }}
    >
      <TextField
        autoFocus
        fullWidth
        multiline
        maxRows={EDIT_MAX_ROWS}
        size="small"
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") onCancel();
        }}
        slotProps={{ htmlInput: { "aria-label": EDIT_FORM_COPY.label } }}
      />
      <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end", mt: 1 }}>
        <Button size="small" onClick={onCancel} sx={scheme((c) => ({ color: c.accent }))}>
          {EDIT_FORM_COPY.cancel}
        </Button>
        <Button
          size="small"
          variant="contained"
          type="submit"
          disabled={!canSave}
          sx={scheme((c) => ({
            bgcolor: c.accent,
            color: c.accentContrast,
            "&:hover": { bgcolor: c.accent },
            "&.Mui-disabled": { bgcolor: c.muted, color: c.mutedText },
          }))}
        >
          {EDIT_FORM_COPY.save}
        </Button>
      </Stack>
    </Box>
  );
}
