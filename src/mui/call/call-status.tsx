"use client";

import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { alpha, keyframes } from "@mui/material/styles";
import type { VoiceSnapshot } from "../../core/voice/voice-types";
import { useCall } from "./call-context";
import type { CallLabelKey } from "./call-labels";
import { CallOrb } from "./call-orb";
import { orbStateOf } from "./call-orb-state";
import { useReducedMotion } from "./use-reduced-motion";

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const STEP_KEYS = {
  joining: "stepJoining",
  connecting: "stepConnecting",
  microphone: "stepMicrophone",
  audio: "stepAudio",
  ready: "stepReady",
} as const satisfies Record<string, CallLabelKey>;

/** Which label says what the call is doing. */
export function statusKeyOf(snapshot: Pick<VoiceSnapshot, "phase" | "step" | "muted">): CallLabelKey {
  switch (snapshot.phase) {
    case "connecting":
      return STEP_KEYS[snapshot.step ?? "connecting"];
    case "held":
      return "held";
    case "ended":
      return "ended";
    case "failed":
      return "failed";
    case "thinking":
      return "thinking";
    case "speaking":
      return "speaking";
    default:
      return snapshot.muted ? "listeningMuted" : "listening";
  }
}

const MARK_SIZE = 88;

export interface CallStageStatusProps {
  /** The agent's mark; defaults to the agent's avatar, then to its initial. */
  mark?: ReactNode;
  /** Replaces the status text. */
  children?: ReactNode;
}

function DefaultMark({ name }: { name: string }) {
  const { colors } = useCall();
  return (
    <Box
      aria-hidden
      sx={{
        width: MARK_SIZE,
        height: MARK_SIZE,
        borderRadius: "50%",
        display: "grid",
        placeItems: "center",
        fontSize: 36,
        fontWeight: 600,
        color: colors.text,
        bgcolor: colors.control,
        boxShadow: `0 0 64px ${alpha(colors.glow, 0.45)}`,
      }}
    >
      {name.trim().charAt(0).toUpperCase() || "?"}
    </Box>
  );
}

/**
 * The centre of the stage: the agent's mark (or the orb with the `orb` visual) and one large status
 * line that follows the state. The line is the call's one polite live region, so a screen reader
 * hears each state change once. A blocked browser sound adds "Tap to hear"; a held call adds "Resume".
 */
export function CallStageStatus({ mark, children }: CallStageStatusProps) {
  const { session, snapshot, t, visual, agent, activity } = useCall();
  const reduced = useReducedMotion();
  const activityLine = activity.text ?? (activity.quiet ? t("stillWorking") : null);
  const line = children ?? t(statusKeyOf(snapshot));
  const deviceError = snapshot.deviceError;
  const centre =
    visual === "orb" ? (
      <CallOrb state={orbStateOf(snapshot)} levels={session.levels} />
    ) : (
      (mark ?? agent.avatar ?? <DefaultMark name={agent.name ?? ""} />)
    );
  return (
    <Box data-testid="call-status" sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: { xs: 2, sm: 3 }, textAlign: "center", px: { xs: 2, sm: 3 }, maxWidth: "100%", minWidth: 0, boxSizing: "border-box" }}>
      {centre}
      <Box role="status" aria-live="polite" aria-atomic>
        <Typography component="p" data-testid="call-status-line" sx={{ fontSize: "clamp(1.35rem, 4.5vw, 2.4rem)", fontWeight: 400, lineHeight: 1.2, overflowWrap: "anywhere" }}>
          {line}
        </Typography>
        {activityLine ? (
          <Typography
            component="p"
            key={activityLine}
            data-testid="call-activity-line"
            data-motion={reduced ? "none" : "fade"}
            sx={{ mt: 1, fontSize: "clamp(1rem, 2.6vw, 1.25rem)", opacity: 0.8, lineHeight: 1.3, overflowWrap: "anywhere", animation: reduced ? "none" : `${fadeIn} 0.25s ease-out`, "@media (prefers-reduced-motion: reduce)": { animation: "none" } }}
          >
            {activityLine}
          </Typography>
        ) : null}
        {deviceError ? (
          <Typography component="p" data-testid="call-device-error" variant="body2" sx={{ mt: 1, opacity: 0.75 }}>
            {deviceError.reason === "denied" ? t("deviceDenied") : t("deviceUnavailable")}
          </Typography>
        ) : null}
      </Box>
      {snapshot.problem === "audio-blocked" ? (
        <Button variant="contained" color="inherit" onClick={() => void session.startAudio()}>
          {t("tapToHear")}
        </Button>
      ) : null}
      {snapshot.phase === "held" ? (
        <Button variant="contained" color="inherit" onClick={() => session.resume()}>
          {t("resume")}
        </Button>
      ) : null}
    </Box>
  );
}
