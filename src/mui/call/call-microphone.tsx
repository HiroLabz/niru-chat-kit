"use client";

import { useId, useMemo, useState, type KeyboardEvent } from "react";
import IconButton from "@mui/material/IconButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import CheckIcon from "@mui/icons-material/Check";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import type { SxProps, Theme } from "@mui/material/styles";
import type { VoiceMicrophone, VoiceSession, VoiceSnapshot } from "../../core/voice/voice-types";
import type { CallColors } from "./call-colors";
import type { CallTranslate } from "./call-labels";
import { useReducedMotion } from "./use-reduced-motion";

/** The microphone choice a call screen draws: the list, the one in use and what picking one does. */
export interface MicrophonePicker {
  microphones: readonly VoiceMicrophone[];
  microphoneId: string | null;
  select: (deviceId: string) => void;
}

/** The three props `CallStage` and `CallStrip` accept to drive the picker themselves. */
export interface MicrophoneProps {
  /** Overrides `snapshot.microphones`. */
  microphones?: readonly VoiceMicrophone[];
  /** Overrides `snapshot.microphoneId`. */
  microphoneId?: string | null;
  /** Overrides `session.selectMicrophone`. The picker is drawn only when this or the session's method exists. */
  onSelectMicrophone?: (deviceId: string) => void;
}

/** Merges the props over the session; null when nothing can select a microphone, so no picker is drawn. */
export function resolveMicrophonePicker(session: VoiceSession, snapshot: VoiceSnapshot, props: MicrophoneProps): MicrophonePicker | null {
  const select = props.onSelectMicrophone ?? (session.selectMicrophone ? (id: string) => session.selectMicrophone?.(id) : undefined);
  if (!select) return null;
  return {
    microphones: props.microphones ?? snapshot.microphones ?? [],
    microphoneId: props.microphoneId !== undefined ? props.microphoneId : snapshot.microphoneId ?? null,
    select,
  };
}

/** Memoised `resolveMicrophonePicker`, for the screens that call it on every snapshot. */
export function useMicrophonePicker(session: VoiceSession, snapshot: VoiceSnapshot, props: MicrophoneProps): MicrophonePicker | null {
  const { microphones, microphoneId, onSelectMicrophone } = props;
  return useMemo(
    () => resolveMicrophonePicker(session, snapshot, { microphones, microphoneId, onSelectMicrophone }),
    [session, snapshot, microphones, microphoneId, onSelectMicrophone]
  );
}

export interface MicrophoneMenuButtonProps {
  picker: MicrophonePicker;
  colors: CallColors;
  t: CallTranslate;
  disabled?: boolean;
  sx?: SxProps<Theme>;
}

/**
 * A small caret button, "Choose microphone", that opens a menu of the microphones with the one in
 * use checked. With one microphone it still opens, so the person can see which is in use; with
 * none it lists one disabled row.
 */
export function MicrophoneMenuButton({ picker, colors, t, disabled, sx }: MicrophoneMenuButtonProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const reduced = useReducedMotion();
  const id = useId();
  const label = t("chooseMicrophone");
  const close = () => setAnchor(null);
  // The menu is portalled but React still bubbles its events to the call screen, where Escape
  // minimises and Space mutes: keys inside the menu belong to the menu alone.
  const keep = (event: KeyboardEvent) => event.stopPropagation();
  return (
    <>
      <IconButton
        size="small"
        aria-label={label}
        title={label}
        aria-haspopup="menu"
        aria-expanded={anchor ? "true" : undefined}
        aria-controls={anchor ? id : undefined}
        disabled={disabled}
        onClick={(event) => setAnchor(event.currentTarget)}
        data-testid="call-microphone-caret"
        sx={[
          {
            flex: "0 0 auto",
            width: 28,
            height: 28,
            color: colors.text,
            bgcolor: colors.control,
            "&:hover": { bgcolor: colors.controlHover },
            "&.Mui-focusVisible": { outline: `2px solid ${colors.text}`, outlineOffset: 2 },
            "&.Mui-disabled": { opacity: 0.4, color: colors.text },
            "& svg": { fontSize: 18 },
          },
          ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
        ]}
      >
        <KeyboardArrowUpIcon />
      </IconButton>
      <Menu
        id={id}
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={close}
        onKeyDown={keep}
        transitionDuration={reduced ? 0 : undefined}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        transformOrigin={{ vertical: "bottom", horizontal: "center" }}
        slotProps={{
          paper: { sx: { bgcolor: colors.stage, color: colors.text, border: `1px solid ${colors.border}`, backgroundImage: "none", maxWidth: "min(360px, calc(100vw - 16px))" } },
          list: { "aria-label": label, dense: true },
        }}
      >
        {picker.microphones.length === 0 ? (
          <MenuItem disabled role="menuitem" aria-disabled="true" sx={{ "&.Mui-disabled": { opacity: 1, color: colors.mutedText } }}>
            {t("noMicrophone")}
          </MenuItem>
        ) : (
          picker.microphones.map((mic) => {
            const current = mic.deviceId === picker.microphoneId;
            return (
              <MenuItem
                key={mic.deviceId}
                role="menuitemradio"
                aria-checked={current}
                selected={current}
                onClick={() => {
                  close();
                  if (!current) picker.select(mic.deviceId);
                }}
                sx={{ gap: 1, "&.Mui-selected, &.Mui-selected:hover": { bgcolor: colors.control }, "&:hover": { bgcolor: colors.controlHover } }}
              >
                <ListItemIcon sx={{ minWidth: 0, color: "inherit", visibility: current ? "visible" : "hidden" }}>
                  <CheckIcon fontSize="small" />
                </ListItemIcon>
                <span style={{ overflowWrap: "anywhere" }}>{mic.label.trim() || t("unnamedMicrophone")}</span>
              </MenuItem>
            );
          })
        )}
      </Menu>
    </>
  );
}
