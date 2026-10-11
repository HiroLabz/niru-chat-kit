"use client";

import { useEffect, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Typography from "@mui/material/Typography";
import CallEndIcon from "@mui/icons-material/CallEnd";
import MicIcon from "@mui/icons-material/Mic";
import MicOffIcon from "@mui/icons-material/MicOff";
import OpenInFullIcon from "@mui/icons-material/OpenInFull";
import PresentToAllIcon from "@mui/icons-material/PresentToAll";
import VideocamIcon from "@mui/icons-material/Videocam";
import type { SxProps, Theme } from "@mui/material/styles";
import { useVoiceSession } from "../../core/voice/use-voice-session";
import { formatCallDuration } from "../../core/voice/voice-summary";
import type { VoiceSession } from "../../core/voice/voice-types";
import { CallColorsContext, useCallColors, type CallColorOverrides } from "./call-colors";
import { CallControlButton } from "./call-control-button";
import { pillSource } from "./call-controls";
import { makeTranslate, type CallLabels } from "./call-labels";
import { statusKeyOf } from "./call-status";
import { VoiceLevelPill } from "./voice-level-pill";

export interface CallStripProps {
  session: VoiceSession;
  /** The agent's name, for the labels. */
  agentName?: string;
  /** The person's name, for "The mic is yours, {name}". */
  userName?: string;
  labels?: Partial<CallLabels>;
  colors?: CallColorOverrides;
  /** Brings the full-screen `CallStage` back. The strip body and the expand button both call it. */
  onExpand?: () => void;
  sx?: SxProps<Theme>;
}

/** Whole seconds of the call so far, ticking once a second while it runs. */
function useElapsed(startedAt: number | null, endedAt: number | null): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (startedAt === null || endedAt !== null) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [startedAt, endedAt]);
  return startedAt === null ? 0 : Math.max(0, (endedAt ?? now) - startedAt);
}

/**
 * The minimised call, for the chat while a call runs: what the call is doing (the one polite live
 * region), how long it has run, an indicator while the camera or the screen is on, the mute
 * button when the session supports it, and End. The body returns to the full screen with `onExpand`.
 */
export function CallStrip({ session, agentName, userName, labels, colors: overrides, onExpand, sx }: CallStripProps) {
  const snapshot = useVoiceSession(session);
  const colors = useCallColors(overrides);
  const t = useMemo(() => makeTranslate(labels, { name: userName, agent: agentName }), [labels, userName, agentName]);
  const elapsed = useElapsed(snapshot.startedAt, snapshot.endedAt);
  const { capabilities, muted, cameraOn, screenOn, phase } = snapshot;
  const live = phase !== "ended" && phase !== "failed";
  return (
    <CallColorsContext.Provider value={colors}>
      <Box
        data-testid="call-strip"
        data-phase={phase}
        sx={[
          { display: "flex", alignItems: "center", gap: 1, p: 0.75, pl: 1.5, borderRadius: 999, bgcolor: colors.stage, color: colors.text, border: `1px solid ${colors.border}` },
          ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
        ]}
      >
        <ButtonBase
          onClick={onExpand}
          disabled={!onExpand}
          aria-label={t("openCall")}
          title={t("openCall")}
          sx={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", justifyContent: "flex-start", gap: 1.25, textAlign: "left", borderRadius: 999, py: 0.5, "&.Mui-focusVisible": { outline: `2px solid ${colors.text}` } }}
        >
          {live ? (
            <Box aria-hidden data-testid="call-strip-pill" sx={{ width: 36, height: 36, flex: "0 0 auto", display: "flex", borderRadius: "50%", overflow: "hidden" }}>
              <VoiceLevelPill levels={session.levels} source={pillSource(phase, muted)} height={36} sx={{ minWidth: 0, width: 36, flex: "0 0 auto", borderRadius: "50%" }} />
            </Box>
          ) : (
            <Box aria-hidden sx={{ width: 10, height: 10, flex: "0 0 auto", borderRadius: "50%", bgcolor: colors.mutedText }} />
          )}
          <Box sx={{ minWidth: 0, textAlign: "left" }}>
            <Typography role="status" aria-live="polite" component="span" noWrap sx={{ display: "block", fontSize: 14, fontWeight: 600 }}>
              {t(statusKeyOf(snapshot))}
            </Typography>
            <Typography component="span" data-testid="call-strip-time" sx={{ display: "block", fontSize: 12, color: colors.mutedText }}>
              {formatCallDuration(elapsed)}
            </Typography>
          </Box>
          {cameraOn ? <VideocamIcon data-testid="call-strip-camera" aria-label={t("cameraOff")} sx={{ fontSize: 18 }} /> : null}
          {screenOn ? <PresentToAllIcon data-testid="call-strip-screen" aria-label={t("sharing")} sx={{ fontSize: 18 }} /> : null}
          {onExpand ? <OpenInFullIcon aria-hidden sx={{ ml: "auto", fontSize: 16, color: colors.mutedText }} /> : null}
        </ButtonBase>
        {capabilities.mute && live ? (
          <CallControlButton
            size={40}
            label={muted ? t("unmute") : t("mute")}
            active={muted}
            icon={muted ? <MicOffIcon /> : <MicIcon />}
            onClick={() => session.setMuted(!muted)}
          />
        ) : null}
        {live ? <CallControlButton size={40} danger label={t("end")} icon={<CallEndIcon />} onClick={() => session.end()} /> : null}
      </Box>
    </CallColorsContext.Provider>
  );
}
