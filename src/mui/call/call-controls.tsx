"use client";

import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import CallEndIcon from "@mui/icons-material/CallEnd";
import MicIcon from "@mui/icons-material/Mic";
import MicOffIcon from "@mui/icons-material/MicOff";
import PresentToAllIcon from "@mui/icons-material/PresentToAll";
import StopScreenShareIcon from "@mui/icons-material/StopScreenShare";
import VideocamIcon from "@mui/icons-material/Videocam";
import VideocamOffIcon from "@mui/icons-material/VideocamOff";
import type { LevelSource } from "../../core/voice/voice-levels";
import { useCall } from "./call-context";
import { CallControlButton } from "./call-control-button";
import { MicrophoneMenuButton } from "./call-microphone";
import { VoiceLevelPill } from "./voice-level-pill";

export interface CallStageControlsProps {
  /** Replaces the default five buttons. */
  children?: ReactNode;
}

/** Which level the pill follows for this call. */
export function pillSource(phase: string, muted: boolean): LevelSource {
  if (phase === "speaking") return "agent";
  if (phase === "listening" && !muted) return "you";
  return "none";
}

/** Round buttons are 44 px on a phone and 56 px from the `sm` breakpoint up, so five of them fit 320 px. */
const ROUND = { width: { xs: 44, sm: 56 }, height: { xs: 44, sm: 56 } } as const;
const PILL = { height: { xs: 44, sm: 56 }, minWidth: { xs: 40, sm: 96 } } as const;

/**
 * The bottom row, left to right: camera, share screen, the voice-level pill, microphone, the "Choose microphone" caret (only when the session or the stage can select a microphone), end. A
 * button is drawn only when the session reports its capability; End is always there and needs no
 * confirmation. With the `orb` visual the pill is left out because the orb in the centre moves instead.
 */
export function CallStageControls({ children }: CallStageControlsProps) {
  const { session, snapshot, t, visual, microphone, colors } = useCall();
  const { capabilities, cameraOn, screenOn, muted, phase } = snapshot;
  const open = phase !== "ended" && phase !== "failed";
  return (
    <Box
      role="group"
      aria-label={t("region")}
      data-testid="call-controls"
      sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: { xs: 1, sm: 1.5 }, width: "100%", maxWidth: 560, minWidth: 0, mx: "auto", px: { xs: 1.5, sm: 2 }, pb: { xs: 2, sm: 3 }, boxSizing: "border-box" }}
    >
      {children ?? (
        <>
          {capabilities.camera ? (
            <CallControlButton
              label={cameraOn ? t("cameraOff") : t("cameraOn")}
              active={cameraOn}
              disabled={!open}
              sx={ROUND}
              icon={cameraOn ? <VideocamIcon /> : <VideocamOffIcon />}
              onClick={() => void session.setCamera(!cameraOn)}
            />
          ) : null}
          {capabilities.screenShare ? (
            <CallControlButton
              label={screenOn ? t("shareOff") : t("shareOn")}
              active={screenOn}
              disabled={!open}
              sx={ROUND}
              icon={screenOn ? <StopScreenShareIcon /> : <PresentToAllIcon />}
              onClick={() => void session.setScreenShare(!screenOn)}
            />
          ) : null}
          {visual === "pill" ? <VoiceLevelPill levels={session.levels} source={pillSource(phase, muted)} sx={PILL} /> : <Box sx={{ flex: "1 1 auto" }} />}
          {capabilities.mute ? (
            <CallControlButton
              label={muted ? t("unmute") : t("mute")}
              active={muted}
              disabled={!open}
              sx={ROUND}
              icon={muted ? <MicOffIcon /> : <MicIcon />}
              onClick={() => session.setMuted(!muted)}
            />
          ) : null}
          {microphone ? <MicrophoneMenuButton picker={microphone} colors={colors} t={t} disabled={!open} sx={{ ml: -0.5 }} /> : null}
          <CallControlButton label={t("end")} danger sx={ROUND} icon={<CallEndIcon />} onClick={() => session.end()} />
        </>
      )}
    </Box>
  );
}
