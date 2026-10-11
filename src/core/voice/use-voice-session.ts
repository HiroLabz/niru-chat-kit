"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { VoiceSession, VoiceSnapshot } from "./voice-types";

/**
 * The session's snapshot, re-rendering when it changes. Also the safety net for devices: whenever
 * the call is held, ended or failed and the camera or screen share is still on, it asks the session
 * to switch them off, whatever the transport did.
 */
export function useVoiceSession(session: VoiceSession): VoiceSnapshot {
  const snapshot = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  const idle = snapshot.phase === "held" || snapshot.phase === "ended" || snapshot.phase === "failed";
  const { cameraOn, screenOn } = snapshot;
  useEffect(() => {
    if (!idle) return;
    if (cameraOn) void session.setCamera(false);
    if (screenOn) void session.setScreenShare(false);
  }, [idle, cameraOn, screenOn, session]);
  return snapshot;
}
