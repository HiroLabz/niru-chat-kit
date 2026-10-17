"use client";

import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { alpha, darken } from "@mui/material/styles";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import StopRoundedIcon from "@mui/icons-material/StopRounded";
import { PromptInput } from "../primitives/prompt-input";
import { ComposerCallButton } from "./composer-call";
import { useChatKitStyles } from "../theme";

/** The "Answering: <question>" chip above the text while the agent waits on an answer. */
export function ComposerAnsweringChip({ question, label }: { question: string; label: string }) {
  const { scheme } = useChatKitStyles();
  return (
    <Typography
      variant="caption"
      data-chat="composer-answering"
      title={question}
      sx={scheme((c) => ({
        display: "block",
        width: "fit-content",
        maxWidth: "100%",
        mb: 0.75,
        px: 1.1,
        py: 0.25,
        borderRadius: 999,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        bgcolor: alpha(c.accent, 0.12),
        color: c.text,
      }))}
    >
      {label} {question}
    </Typography>
  );
}

/** Stop while a run is busy and can be stopped, otherwise Send. */
export function ComposerSendButton({
  busy,
  onStop,
  canSend,
  onSend,
  tooltip,
}: {
  busy: boolean;
  onStop?: () => void;
  canSend: boolean;
  onSend: () => void;
  tooltip: string;
}) {
  const { scheme } = useChatKitStyles();
  if (busy && onStop) {
    return (
      <Tooltip title="Stop">
        <IconButton size="small" aria-label="Stop" onClick={onStop} sx={scheme((c) => ({ color: c.error }))}>
          <StopRoundedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    );
  }
  return (
    <PromptInput.Action tooltip={tooltip}>
      <IconButton
        size="small"
        aria-label="Send"
        data-chat="send"
        disabled={!canSend}
        onClick={onSend}
        sx={scheme((c) => ({
          bgcolor: c.accent,
          color: c.accentContrast,
          "&:hover": { bgcolor: darken(c.accent, 0.15) },
          "&.Mui-disabled": { bgcolor: c.muted, color: c.mutedText },
        }))}
      >
        <ArrowUpwardIcon fontSize="small" />
      </IconButton>
    </PromptInput.Action>
  );
}

type SendProps = Parameters<typeof ComposerSendButton>[0];

/**
 * What the Send slot is. `talk`: the waveform call button, when a call can be started, there is nothing to send (`canSend`
 * false and nothing `waiting`: files, pasted text or a dictation in progress) and no run to stop. `caretOnCall`: the
 * microphone choice then sits beside the waveform instead of beside the dictation mic (not on a narrow row, where it is in
 * More). `sendBusy`: Stop shows while a run is busy, or running with nothing typed.
 */
export function sendSlotState(input: {
  busy?: boolean;
  running?: boolean;
  canSend: boolean;
  onStartCall?: () => void;
  onStop?: () => void;
  narrow: boolean;
  choice: boolean;
  waiting: boolean;
}): { sendBusy: boolean; talk: boolean; caretOnCall: boolean } {
  const sendBusy = Boolean(input.busy) || (Boolean(input.running) && !input.canSend);
  const talk = Boolean(input.onStartCall) && !input.canSend && !input.waiting && !(sendBusy && input.onStop);
  return { sendBusy, talk, caretOnCall: talk && !input.narrow && input.choice };
}

/** The last control of the row: the waveform call button (with the microphone `caret` beside it) when `call.talk`, otherwise Stop or Send. */
export function ComposerSendSlot({
  call,
  caret,
  ...send
}: SendProps & { call: { onStartCall?: () => void; label?: string; disabled?: boolean; talk: boolean }; caret?: ReactNode }) {
  if (!call.talk) return <ComposerSendButton {...send} />;
  return (
    <Box component="span" data-chat="call-group" sx={{ display: "inline-flex", alignItems: "center", flex: "0 0 auto" }}>
      <ComposerCallButton onStartCall={call.onStartCall} label={call.label} disabled={call.disabled} />
      {caret}
    </Box>
  );
}
