"use client";

import { useEffect, useRef } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import PresentToAllIcon from "@mui/icons-material/PresentToAll";
import { alpha } from "@mui/material/styles";
import { useCall } from "./call-context";

function StreamVideo({ stream, mirror }: { stream: MediaStream; mirror?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    element.srcObject = stream;
    return () => {
      element.srcObject = null;
    };
  }, [stream]);
  return (
    <Box
      ref={ref}
      component="video"
      autoPlay
      muted
      playsInline
      aria-hidden
      sx={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", transform: mirror ? "scaleX(-1)" : "none" }}
    />
  );
}

/**
 * Behind the status line: the person's own camera preview when the camera is on (mirrored, dimmed
 * so the text still reads), else the agent's video when the transport has one. While the screen is
 * shared it also draws the small "Sharing your screen" chip with a stop control. The preview never
 * leaves the device.
 */
export function CallStagePreview() {
  const { session, snapshot, colors, t } = useCall();
  const video = snapshot.localVideo ?? snapshot.remoteVideo;
  return (
    <>
      {video ? (
        <Box data-testid="call-preview" data-source={snapshot.localVideo ? "camera" : "agent"} sx={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
          <StreamVideo stream={video} mirror={video === snapshot.localVideo} />
          <Box sx={{ position: "absolute", inset: 0, background: `linear-gradient(${alpha(colors.stage, 0.55)}, ${alpha(colors.stage, 0.25)} 40%, ${alpha(colors.stage, 0.7)})` }} />
        </Box>
      ) : null}
      {snapshot.screenOn ? (
        <Box
          data-testid="call-sharing-chip"
          sx={{
            position: "absolute",
            top: 76,
            left: "50%",
            transform: "translateX(-50%)",
            maxWidth: "calc(100% - 24px)",
            boxSizing: "border-box",
            zIndex: 2,
            display: "flex",
            alignItems: "center",
            gap: 1,
            pl: 1.75,
            pr: 0.5,
            py: 0.5,
            borderRadius: 999,
            bgcolor: colors.chip,
            border: `1px solid ${colors.border}`,
            color: colors.text,
            fontSize: 14,
          }}
        >
          <PresentToAllIcon sx={{ fontSize: 18 }} aria-hidden />
          <span>{t("sharing")}</span>
          <Button size="small" color="inherit" onClick={() => void session.setScreenShare(false)} sx={{ minWidth: 0, borderRadius: 999, textTransform: "none", fontWeight: 600 }}>
            {t("stopSharing")}
          </Button>
        </Box>
      ) : null}
    </>
  );
}
