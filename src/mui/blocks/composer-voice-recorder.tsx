"use client";

import { useId } from "react";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { keyframes, type SxProps, type Theme } from "@mui/material/styles";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import MicNoneOutlinedIcon from "@mui/icons-material/MicNoneOutlined";
import StopCircleOutlinedIcon from "@mui/icons-material/StopCircleOutlined";
import type { SpeechFailure } from "../../core/hooks/use-recorded-speech";
import type { UseSpeechInputResult } from "../../core/hooks/use-speech-input";
import { formatCallDuration } from "../../core/voice/voice-summary";
import { useChatKitStyles } from "../theme";
import type { ComposerVoiceLabels } from "./composer-voice-labels";

const pulse = keyframes`
  0% { opacity: 1; }
  50% { opacity: 0.35; }
  100% { opacity: 1; }
`;

const FAILURE_LABEL: Record<SpeechFailure, keyof ComposerVoiceLabels> = {
  "permission-denied": "permissionDenied",
  "no-microphone": "noMicrophone",
  "microphone-busy": "microphoneBusy",
  "recording-failed": "recordingFailed",
  "transcription-failed": "transcriptionFailed",
  "nothing-heard": "nothingHeard",
};

type RecorderProps = {
  speech: UseSpeechInputResult;
  labels: ComposerVoiceLabels;
  disabled?: boolean;
  /** Extra style for the mic button itself. */
  sx?: SxProps<Theme>;
};

/** The recording mic: start, stop and transcribe, cancel, and the disabled-with-a-reason form. */
export function RecorderMicButton({ speech, labels, disabled, sx }: RecorderProps) {
  const { scheme } = useChatKitStyles();
  const reasonId = useId();
  const recorded = speech.recorded;
  if (!recorded) return null;
  const { state } = recorded;
  const reason = speech.disabledReason;
  if (reason) {
    return (
      <Tooltip title={reason}>
        <span>
          <IconButton size="small" aria-label={labels.start} aria-describedby={reasonId} disabled sx={sx}>
            <MicNoneOutlinedIcon fontSize="small" />
          </IconButton>
          <Box component="span" id={reasonId} sx={{ display: "none" }}>
            {reason}
          </Box>
        </span>
      </Tooltip>
    );
  }
  const recording = state === "recording";
  const working = state === "asking" || state === "transcribing";
  const label = recording ? labels.stop : state === "asking" ? labels.asking : state === "transcribing" ? labels.transcribing : labels.start;
  return (
    <>
      <Tooltip title={label}>
        <span>
          <IconButton
            size="small"
            aria-label={label}
            aria-pressed={recording}
            aria-busy={working || undefined}
            disabled={disabled || working}
            onClick={recording ? recorded.stop : recorded.start}
            sx={[...(Array.isArray(sx) ? sx : sx ? [sx] : []), scheme((c) => (recording ? { color: c.error } : {}))]}
          >
            {working ? <CircularProgress size={16} color="inherit" /> : recording ? <StopCircleOutlinedIcon fontSize="small" /> : <MicNoneOutlinedIcon fontSize="small" />}
          </IconButton>
        </span>
      </Tooltip>
      {recording || state === "transcribing" ? (
        <Tooltip title={labels.cancel}>
          <IconButton size="small" aria-label={labels.cancel} onClick={recorded.cancel}>
            <CloseOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ) : null}
    </>
  );
}

/**
 * The one polite live region of the recording mic. Only the state's words are announced; the timer
 * and the level are hidden from assistive tech so they do not speak every tick.
 */
export function RecorderStatus({ speech, labels }: Omit<RecorderProps, "disabled" | "sx">) {
  const { scheme } = useChatKitStyles();
  const recorded = speech.recorded;
  if (!recorded) return null;
  const { state, failure, detail, elapsedMs, level } = recorded;
  let text = "";
  if (state === "asking") text = labels.asking;
  else if (state === "recording") text = labels.recording;
  else if (state === "transcribing") text = labels.transcribing;
  else if (state === "failed" && failure) text = failure === "transcription-failed" && detail ? detail : labels[FAILURE_LABEL[failure]];
  const problem = state === "failed" && failure !== "nothing-heard";
  return (
    <Typography
      variant="caption"
      role="status"
      aria-live="polite"
      component="div"
      data-testid="voice-recorder-status"
      sx={scheme((c) => ({ display: "flex", alignItems: "center", gap: 0.75, px: 0.5, pb: text ? 0.25 : 0, color: problem ? c.error : c.text }))}
    >
      {state === "recording" ? (
        <Box
          component="span"
          aria-hidden
          data-testid="voice-listening-indicator"
          sx={scheme((c) => ({
            width: 8,
            height: 8,
            borderRadius: "50%",
            bgcolor: c.error,
            animation: `${pulse} 1.2s ease-in-out infinite`,
            "@media (prefers-reduced-motion: reduce)": { animation: "none" },
          }))}
        />
      ) : null}
      <span>{text}</span>
      {state === "recording" ? (
        <>
          <span aria-hidden data-testid="voice-elapsed">
            {formatCallDuration(elapsedMs)}
          </span>
          <Box component="span" aria-hidden data-testid="voice-level" sx={scheme((c) => ({ width: 48, height: 4, borderRadius: 2, bgcolor: c.muted, overflow: "hidden" }))}>
            <Box component="span" sx={scheme((c) => ({ display: "block", height: "100%", width: `${Math.round(level * 100)}%`, bgcolor: c.accent }))} />
          </Box>
        </>
      ) : null}
    </Typography>
  );
}
