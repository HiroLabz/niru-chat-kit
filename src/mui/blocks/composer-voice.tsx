"use client";

/**
 * The composer's voice input: a mic toggle and a status line. Recognised phrases are
 * appended to the box. Nothing renders where the browser has no speech recognition.
 */

import { useEffect, useMemo, useRef } from "react";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { keyframes } from "@mui/material/styles";
import MicNoneOutlinedIcon from "@mui/icons-material/MicNoneOutlined";
import MicIcon from "@mui/icons-material/Mic";
import { speechErrorMessage, useSpeechInput } from "../../core/hooks/use-speech-input";
import { useChatKitStyles } from "../theme";
import { DEFAULT_COMPOSER_VOICE_LABELS, type ComposerVoiceLabels, type ComposerVoiceOptions } from "./composer-voice-labels";
import { RecorderMicButton, RecorderStatus } from "./composer-voice-recorder";

const pulse = keyframes`
  0% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.35; transform: scale(0.8); }
  100% { opacity: 1; transform: scale(1); }
`;

/** Joins a phrase onto the draft with one space between them. */
export function appendSpeech(draft: string, phrase: string): string {
  if (!draft || /\s$/.test(draft)) return draft + phrase;
  return `${draft} ${phrase}`;
}

export type ComposerVoice = ReturnType<typeof useComposerVoice>;

export function useComposerVoice({
  enabled,
  value,
  onChange,
  lang,
  options,
}: {
  enabled: boolean;
  value: string;
  onChange: (value: string) => void;
  lang?: string;
  options?: ComposerVoiceOptions;
}) {
  const draft = useRef(value);
  draft.current = value;
  const change = useRef(onChange);
  change.current = onChange;
  const speech = useSpeechInput({
    lang,
    transcribe: options?.transcribe,
    microphoneId: options?.microphoneId,
    maxDurationMs: options?.maxDurationMs,
    disabledReason: options?.disabledReason,
    onFinal: (text) => {
      draft.current = appendSpeech(draft.current, text);
      change.current(draft.current);
    },
  });
  const { listening, stop, supported, recorded, disabledReason } = speech;
  const cancel = recorded?.cancel;
  const state = recorded?.state;
  const stopRecording = recorded?.stop;
  // Turning voice off while it is listening ends the session.
  useEffect(() => {
    if (!enabled && listening) stop();
    if (!enabled) cancel?.();
  }, [enabled, listening, stop, cancel]);
  // A reason to stay silent (a call took the microphone) discards a recording instead of sending it.
  useEffect(() => {
    if (disabledReason) cancel?.();
  }, [disabledReason, cancel]);
  // Escape while recording stops and transcribes.
  useEffect(() => {
    if (state !== "recording" || !stopRecording) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") stopRecording();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state, stopRecording]);
  const labels = useMemo<ComposerVoiceLabels>(() => ({ ...DEFAULT_COMPOSER_VOICE_LABELS, ...options?.labels }), [options?.labels]);
  /** Sending: dictation just stops; a recording is discarded so its text cannot land in the next draft. */
  const endForSend = recorded ? recorded.cancel : stop;
  return { ...speech, visible: enabled && supported, labels, endForSend };
}

export function ComposerMicButton({ voice, disabled }: { voice: ComposerVoice; disabled?: boolean }) {
  const { scheme } = useChatKitStyles();
  if (!voice.visible) return null;
  if (voice.recorded) return <RecorderMicButton speech={voice} labels={voice.labels} disabled={disabled} />;
  const label = voice.listening ? "Stop voice input" : "Start voice input";
  return (
    <Tooltip title={label}>
      <span>
        <IconButton
          size="small"
          aria-label={label}
          aria-pressed={voice.listening}
          disabled={disabled}
          onClick={voice.listening ? voice.stop : voice.start}
          sx={scheme((c) => (voice.listening ? { color: c.error } : {}))}
        >
          {voice.listening ? (
            <MicIcon fontSize="small" />
          ) : (
            <MicNoneOutlinedIcon fontSize="small" />
          )}
        </IconButton>
      </span>
    </Tooltip>
  );
}

/** What is being heard, or why voice input stopped. Empty (and not rendered) otherwise. */
export function ComposerVoiceStatus({ voice }: { voice: ComposerVoice }) {
  const { scheme } = useChatKitStyles();
  if (!voice.visible) return null;
  if (voice.recorded) return <RecorderStatus speech={voice} labels={voice.labels} />;
  const problem = voice.listening ? "" : speechErrorMessage(voice.error);
  if (!voice.listening && !problem) return null;
  return (
    <Typography
      variant="caption"
      role="status"
      component="div"
      sx={scheme((c) => ({
        display: "flex",
        alignItems: "center",
        gap: 0.75,
        px: 0.5,
        pb: 0.25,
        color: voice.listening ? c.text : c.error,
      }))}
    >
      {voice.listening ? (
        <>
          <Box
            component="span"
            data-testid="voice-listening-indicator"
            aria-hidden
            sx={scheme((c) => ({
              width: 8,
              height: 8,
              borderRadius: "50%",
              bgcolor: c.error,
              animation: `${pulse} 1.2s ease-in-out infinite`,
              "@media (prefers-reduced-motion: reduce)": { animation: "none" },
            }))}
          />
          <span>{voice.interim ? voice.interim : "Listening..."}</span>
        </>
      ) : (
        problem
      )}
    </Typography>
  );
}
