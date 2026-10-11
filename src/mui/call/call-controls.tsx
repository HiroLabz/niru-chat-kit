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

/**
 * The bottom row, left to right: camera, share screen, the voice-level pill, microphone, end. A
 * button is drawn only when the session reports its capability; End is always there and needs no
 * confirmation. With the `orb` visual the pill is left out because the orb in the centre moves instead.
 */
export function CallStageControls({ children }: CallStageControlsProps) {
  const { session, snapshot, t, visual } = useCall();
  const { capabilities, cameraOn, screenOn, muted, phase } = snapshot;
  const open = phase !== "ended" && phase !== "failed";
  return (
    <Box
      role="group"
      aria-label={t("region")}
      data-testid="call-controls"
      sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1.5, width: "100%", maxWidth: 560, mx: "auto", px: 2, pb: 3, boxSizing: "border-box" }}
    >
      {children ?? (
        <>
          {capabilities.camera ? (
            <CallControlButton
              label={cameraOn ? t("cameraOff") : t("cameraOn")}
              active={cameraOn}
              disabled={!open}
              icon={cameraOn ? <VideocamIcon /> : <VideocamOffIcon />}
              onClick={() => void session.setCamera(!cameraOn)}
            />
          ) : null}
          {capabilities.screenShare ? (
            <CallControlButton
              label={screenOn ? t("shareOff") : t("shareOn")}
              active={screenOn}
              disabled={!open}
              icon={screenOn ? <StopScreenShareIcon /> : <PresentToAllIcon />}
              onClick={() => void session.setScreenShare(!screenOn)}
            />
          ) : null}
          {visual === "pill" ? <VoiceLevelPill levels={session.levels} source={pillSource(phase, muted)} /> : <Box sx={{ flex: "1 1 auto" }} />}
          {capabilities.mute ? (
            <CallControlButton
              label={muted ? t("unmute") : t("mute")}
              active={muted}
              disabled={!open}
              icon={muted ? <MicOffIcon /> : <MicIcon />}
              onClick={() => session.setMuted(!muted)}
            />
          ) : null}
          <CallControlButton label={t("end")} danger icon={<CallEndIcon />} onClick={() => session.end()} />
        </>
      )}
    </Box>
  );
}
