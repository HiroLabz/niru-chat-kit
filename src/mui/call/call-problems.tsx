"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import CallEndIcon from "@mui/icons-material/CallEnd";
import MicOffIcon from "@mui/icons-material/MicOff";
import WifiOffIcon from "@mui/icons-material/WifiOff";
import type { ReactNode } from "react";
import type { VoiceSnapshot } from "../../core/voice/voice-types";
import { useCall } from "./call-context";

/** The problem screens: the microphone is blocked, the connection was lost, the call ended. (A blocked browser sound is a "Tap to hear" button on the status instead.) */
export type CallProblemKind = "microphone-blocked" | "connection-lost" | "ended";

/** Which problem screen a call needs, or null while it is fine. */
export function problemScreenOf(snapshot: Pick<VoiceSnapshot, "phase" | "problem">): CallProblemKind | null {
  if (snapshot.phase === "ended") return "ended";
  if (snapshot.problem === "microphone-blocked") return "microphone-blocked";
  if (snapshot.problem === "connection-lost" || snapshot.phase === "failed") return "connection-lost";
  return null;
}

export interface CallProblemScreenProps {
  kind: CallProblemKind;
}

/**
 * A full problem screen with the way out: Try again for a blocked microphone, Call again for a
 * lost connection or an ended call (it calls `session.retry()`, or the stage's `onCallAgain`
 * for an ended call), and Close when the stage has `onClose`. Its title is an alert, so it is announced once.
 */
export function CallProblemScreen({ kind }: CallProblemScreenProps) {
  const { session, colors, t, onClose, onCallAgain } = useCall();
  const content: Record<CallProblemKind, { icon: ReactNode; title: string; body: string; action: string }> = {
    "microphone-blocked": { icon: <MicOffIcon />, title: t("micBlockedTitle"), body: t("micBlockedBody"), action: t("tryAgain") },
    "connection-lost": { icon: <WifiOffIcon />, title: t("connectionLostTitle"), body: t("connectionLostBody"), action: t("callAgain") },
    ended: { icon: <CallEndIcon />, title: t("endedTitle"), body: t("endedBody"), action: t("callAgain") },
  };
  const { icon, title, body, action } = content[kind];
  const again = kind === "ended" && onCallAgain ? onCallAgain : () => session.retry();
  const leave = onClose ?? (kind === "ended" ? undefined : () => session.end());
  return (
    <Box data-testid="call-problem" data-problem={kind} sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, textAlign: "center", px: 3, maxWidth: 420 }}>
      <Box aria-hidden sx={{ width: 72, height: 72, borderRadius: "50%", display: "grid", placeItems: "center", bgcolor: colors.control, color: colors.text, "& svg": { fontSize: 32 } }}>
        {icon}
      </Box>
      <Typography role="alert" component="p" sx={{ fontSize: "1.6rem", fontWeight: 400 }}>
        {title}
      </Typography>
      <Typography variant="body2" sx={{ opacity: 0.75 }}>
        {body}
      </Typography>
      <Box sx={{ display: "flex", gap: 1.5, mt: 1 }}>
        <Button variant="contained" color="inherit" onClick={again}>
          {action}
        </Button>
        {leave ? (
          <Button color="inherit" onClick={leave}>
            {t("close")}
          </Button>
        ) : null}
      </Box>
    </Box>
  );
}
