"use client";

import { useId, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Collapse from "@mui/material/Collapse";
import Typography from "@mui/material/Typography";
import CallIcon from "@mui/icons-material/Call";
import type { SxProps, Theme } from "@mui/material/styles";
import { formatCallDuration, type VoiceCallSummary } from "../../core/voice/voice-summary";
import { useChatKitStyles } from "../theme";
import { makeTranslate, type CallLabels } from "./call-labels";

export interface CallCardProps {
  /** What the call left: `summariseCall(session.getSnapshot())`. */
  summary: VoiceCallSummary;
  agentName?: string;
  userName?: string;
  labels?: Partial<CallLabels>;
  /** Start with the transcript open. Default closed. */
  defaultOpen?: boolean;
  /** Draws a "Call again" button. */
  onCallAgain?: () => void;
  sx?: SxProps<Theme>;
}

/**
 * The record of a finished call in the conversation: who it was with, how long it ran, and a
 * "Show transcript" toggle (with `aria-expanded`) that opens the settled lines of the call. It
 * takes its colours from the chat tokens, not the dark call stage, so it sits in the thread like any turn.
 */
export function CallCard({ summary, agentName, userName, labels, defaultOpen = false, onCallAgain, sx }: CallCardProps) {
  const { scheme } = useChatKitStyles();
  const [open, setOpen] = useState(defaultOpen);
  const panel = useId();
  const t = useMemo(() => makeTranslate(labels, { name: userName, agent: agentName }), [labels, userName, agentName]);
  return (
    <Box
      data-testid="call-card"
      sx={[
        scheme((c, all) => ({ borderRadius: `${all.radius}px`, border: `1px solid ${c.border}`, bgcolor: c.surface, color: c.text, p: 1.5, maxWidth: 480 })),
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
        <Box aria-hidden sx={scheme((c) => ({ width: 36, height: 36, borderRadius: "50%", display: "grid", placeItems: "center", bgcolor: c.muted, color: c.accent }))}>
          <CallIcon fontSize="small" />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography component="p" noWrap sx={{ fontWeight: 600, fontSize: 14 }}>
            {t("callWith")}
          </Typography>
          <Typography component="p" data-testid="call-card-duration" sx={scheme((c) => ({ fontSize: 12, color: c.mutedText }))}>
            {formatCallDuration(summary.durationMs)}
          </Typography>
        </Box>
        {onCallAgain ? (
          <Button size="small" onClick={onCallAgain}>
            {t("callAgain")}
          </Button>
        ) : null}
        <Button size="small" aria-expanded={open} aria-controls={panel} onClick={() => setOpen((on) => !on)}>
          {open ? t("hideTranscript") : t("showTranscript")}
        </Button>
      </Box>
      <Collapse in={open} unmountOnExit>
        <Box id={panel} component="ol" data-testid="call-card-transcript" sx={{ listStyle: "none", m: 0, mt: 1.25, p: 0, display: "flex", flexDirection: "column", gap: 0.75 }}>
          {summary.transcript.length === 0 ? (
            <Typography component="li" variant="body2">
              {t("noTranscript")}
            </Typography>
          ) : (
            summary.transcript.map((line) => (
              <Typography key={line.id} component="li" variant="body2" data-speaker={line.speaker}>
                <Box component="span" sx={{ fontWeight: 600 }}>
                  {line.speaker === "user" ? t("you") : (agentName?.trim() || t("agentSpeaker"))}
                  {": "}
                </Box>
                {line.text}
              </Typography>
            ))
          )}
        </Box>
      </Collapse>
    </Box>
  );
}
