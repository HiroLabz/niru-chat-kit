"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useCall } from "./call-context";

export interface CallStageCaptionsProps {
  /** How many of the latest lines to show. Default 2. */
  lines?: number;
}

/**
 * The latest lines of the transcript under the status line, the newest one larger. Shown only
 * when captions are on and the session supports them. It is deliberately not a live region: the
 * status line is the only one, so a screen reader is not told the same speech twice.
 */
export function CallStageCaptions({ lines = 2 }: CallStageCaptionsProps) {
  const { snapshot, t } = useCall();
  if (!snapshot.captions || !snapshot.capabilities.captions) return null;
  const shown = snapshot.transcript.slice(-Math.max(1, lines));
  if (shown.length === 0) return null;
  return (
    <Box role="group" aria-label={t("captions")} data-testid="call-captions" sx={{ maxWidth: 640, width: "100%", minWidth: 0, boxSizing: "border-box", px: { xs: 2, sm: 3 }, textAlign: "center", display: "flex", flexDirection: "column", gap: 1 }}>
      {shown.map((line, index) => {
        const newest = index === shown.length - 1;
        return (
          <Typography
            key={line.id}
            component="p"
            data-speaker={line.speaker}
            data-final={line.final ? "true" : "false"}
            sx={{ fontSize: newest ? { xs: "1.1rem", sm: "1.25rem" } : { xs: "0.9rem", sm: "1rem" }, overflowWrap: "anywhere", opacity: newest ? 1 : 0.6, fontStyle: line.final ? "normal" : "italic" }}
          >
            {line.text}
          </Typography>
        );
      })}
    </Box>
  );
}
