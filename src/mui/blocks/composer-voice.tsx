"use client";

/**
 * The composer's voice input: a mic toggle and a status line. Recognised phrases are
 * appended to the box. Nothing renders where the browser has no speech recognition.
 */

import { useEffect, useMemo, useRef } from "react";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import MenuItem from "@mui/material/MenuItem";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { keyframes } from "@mui/material/styles";
import MicNoneOutlinedIcon from "@mui/icons-material/MicNoneOutlined";
import MicIcon from "@mui/icons-material/Mic";
import CheckIcon from "@mui/icons-material/Check";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import { alpha } from "@mui/material/styles";
import { DEFAULT_CALL_LABELS, type CallTranslate } from "../call/call-labels";
import { MicrophoneMenuButton } from "../call/call-microphone";
import { useCallColors } from "../call/call-colors";
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

/** Where the mic sits in the action row: where it always was, or immediately left of Send. */
export type ComposerVoicePlacement = "start" | "end";

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
  const microphones = options?.microphones;
  const selectMicrophone = options?.onSelectMicrophone;
  /** The microphone choice, only where recording is on and there is something to choose from and somewhere to put the choice. */
  const choice =
    recorded && selectMicrophone && microphones && microphones.length > 0
      ? { microphones, microphoneId: options?.microphoneId ?? null, select: selectMicrophone }
      : null;
  return { ...speech, visible: enabled && supported, labels, endForSend, choice };
}

/** The checked row of a microphone list: the chosen device, or the system default (else the first row) when none is chosen or the chosen one is not listed. */
function checkedMicrophone(choice: NonNullable<ComposerVoice["choice"]>): string {
  const { microphones, microphoneId } = choice;
  if (microphoneId && microphones.some((mic) => mic.deviceId === microphoneId)) return microphoneId;
  return (microphones.find((mic) => mic.deviceId === "default") ?? microphones[0]).deviceId;
}

/** The "Choose microphone" caret joined to the mic: the call picker's own menu, in the composer's colours. */
function ComposerMicCaret({ voice, disabled }: { voice: ComposerVoice; disabled?: boolean }) {
  const { scheme } = useChatKitStyles();
  const colors = useCallColors();
  const choice = voice.choice;
  const labels = voice.labels;
  if (!choice) return null;
  const t: CallTranslate = (key) =>
    key === "chooseMicrophone" ? labels.chooseMicrophone : key === "noMicrophone" ? labels.noMicrophone : key === "unnamedMicrophone" ? labels.unnamedMicrophone : DEFAULT_CALL_LABELS[key];
  return (
    <MicrophoneMenuButton
      picker={{ microphones: choice.microphones, microphoneId: checkedMicrophone(choice), select: choice.select }}
      colors={colors}
      t={t}
      disabled={disabled}
      icon={<KeyboardArrowUpIcon />}
      sx={scheme((c) => ({
        width: 20,
        height: 30,
        ml: -0.25,
        borderRadius: "8px",
        color: c.mutedText,
        bgcolor: "transparent",
        "&:hover": { bgcolor: alpha(c.text, 0.08) },
        "&.Mui-focusVisible": { outline: `2px solid ${c.accent}`, outlineOffset: 1 },
        "&.Mui-disabled": { opacity: 0.4, color: c.mutedText },
        "& svg": { fontSize: 18 },
      }))}
      paperSx={scheme((c) => ({ bgcolor: c.surface, color: c.text, border: 1, borderColor: c.border }))}
      itemSx={scheme((c) => ({ "&.Mui-selected, &.Mui-selected:hover": { bgcolor: alpha(c.accent, 0.12) }, "&:hover": { bgcolor: alpha(c.text, 0.06) } }))}
      emptyItemSx={scheme((c) => ({ "&.Mui-disabled": { color: c.mutedText } }))}
    />
  );
}

export function ComposerMicButton({
  voice,
  disabled,
  placement = "start",
  caret = true,
}: {
  voice: ComposerVoice;
  disabled?: boolean;
  placement?: ComposerVoicePlacement;
  /** False on a narrow row, where the microphone choice lives in More. */
  caret?: boolean;
}) {
  const { scheme } = useChatKitStyles();
  if (!voice.visible) return null;
  /** Beside Send the mic is a main action, drawn like the call button it replaces there. */
  const ring = placement === "end" ? scheme((c) => ({ border: 1, borderColor: c.border, color: c.text })) : undefined;
  if (voice.recorded) {
    return (
      <Box component="span" sx={{ display: "inline-flex", alignItems: "center", flex: "0 0 auto" }}>
        <RecorderMicButton speech={voice} labels={voice.labels} disabled={disabled} sx={ring} />
        {caret ? <ComposerMicCaret voice={voice} disabled={disabled || voiceIsBusy(voice)} /> : null}
      </Box>
    );
  }
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
          sx={[...(ring ? [ring] : []), scheme((c) => (voice.listening ? { color: c.error } : {}))]}
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

/** True while the mic is doing something the person must be able to stop from the row: dictating, asking, recording, transcribing. */
export function voiceIsBusy(voice: ComposerVoice): boolean {
  if (voice.recorded) return ["asking", "recording", "transcribing"].includes(voice.recorded.state);
  return voice.listening;
}

/** The mic as a More-menu item, for a narrow row. Choosing it closes the menu and starts, as the button does. */
export function ComposerMicMenuItem({ voice, disabled, closeMenu }: { voice: ComposerVoice; disabled?: boolean; closeMenu: () => void }) {
  if (!voice.visible) return null;
  const reason = voice.recorded ? voice.disabledReason : null;
  const label = voice.recorded ? voice.labels.start : "Start voice input";
  return (
    <MenuItem
      disabled={disabled || Boolean(reason)}
      onClick={() => {
        closeMenu();
        (voice.recorded ? voice.recorded.start : voice.start)();
      }}
    >
      <ListItemIcon sx={{ color: "inherit" }}>
        <MicNoneOutlinedIcon fontSize="small" />
      </ListItemIcon>
      <ListItemText primary={label} secondary={reason || undefined} />
    </MenuItem>
  );
}

/** The microphone list as radio rows under a "Microphone" heading, for a narrow row's More menu. Nothing when there is no choice. */
export function ComposerMicChoiceItems({ voice, disabled, closeMenu }: { voice: ComposerVoice; disabled?: boolean; closeMenu: () => void }) {
  const choice = voice.choice;
  if (!voice.visible || !choice) return null;
  const checked = checkedMicrophone(choice);
  const locked = disabled || voiceIsBusy(voice);
  return [
    <MenuItem key="heading" disabled role="presentation" sx={{ "&.Mui-disabled": { opacity: 1 }, typography: "caption", minHeight: 0, py: 0.5 }}>
      {voice.labels.chooseMicrophone}
    </MenuItem>,
    ...choice.microphones.map((mic) => (
      <MenuItem
        key={mic.deviceId}
        role="menuitemradio"
        aria-checked={mic.deviceId === checked}
        disabled={locked}
        onClick={() => {
          closeMenu();
          if (mic.deviceId !== checked) choice.select(mic.deviceId);
        }}
      >
        <ListItemIcon sx={{ minWidth: 0, color: "inherit", visibility: mic.deviceId === checked ? "visible" : "hidden" }}>
          <CheckIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText primary={mic.label.trim() || voice.labels.unnamedMicrophone} sx={{ ml: 1, overflowWrap: "anywhere" }} />
      </MenuItem>
    )),
  ];
}
