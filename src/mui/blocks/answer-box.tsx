"use client";

import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { useChatKitStyles } from "../theme";

const ANSWER_LABEL = "Answer";
const ANSWER_PLACEHOLDER = "Your answer";

/**
 * The text box and Answer button inside `InterruptPrompt`'s bottom panel.
 *
 * It renders no `<form>` of its own; the Answer button is a submit button and the
 * prompt's form owns the submit, so it needs the current text handed back through
 * `onChange` and `value`.
 */
export function AnswerBox({
  value,
  onChange,
  pending,
  autoFocus = true,
}: {
  value: string;
  onChange: (value: string) => void;
  pending?: boolean;
  autoFocus?: boolean;
}) {
  const { scheme } = useChatKitStyles();
  return (
    // A question is answered in words, often a few lines: a roomy box with Answer under it, like a short reply.
    <Stack spacing={1}>
      <TextField
        autoFocus={autoFocus}
        fullWidth
        multiline
        minRows={3}
        maxRows={12}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          // Enter answers, Shift+Enter starts a new line; an input method still composing keeps Enter.
          if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
          event.preventDefault();
          (event.currentTarget as HTMLElement).closest("form")?.requestSubmit();
        }}
        placeholder={ANSWER_PLACEHOLDER}
        slotProps={{ htmlInput: { "aria-label": ANSWER_PLACEHOLDER } }}
      />
      <Stack direction="row" sx={{ justifyContent: "flex-end" }}>
        <Button
          type="submit"
          variant="contained"
          loading={pending}
          disabled={pending || value.trim().length === 0}
          sx={scheme((c) => ({ bgcolor: c.accent, color: c.accentContrast, "&:hover": { bgcolor: c.accent } }))}
        >
          {ANSWER_LABEL}
        </Button>
      </Stack>
    </Stack>
  );
}
