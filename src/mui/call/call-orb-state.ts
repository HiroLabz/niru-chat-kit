import type { VoiceSnapshot } from "../../core/voice/voice-types";

/** What the orb shows: one state at a time. */
export type OrbState = "idle" | "connecting" | "connected" | "listening" | "thinking" | "speaking" | "muted" | "speaking-muted" | "problem";

/** The states of an open call, the only ones in which levels are read. */
const LIVE_STATES: readonly OrbState[] = ["connected", "listening", "thinking", "speaking", "muted", "speaking-muted"];

/** The orb's one state for a call. A muted microphone comes first, but the agent speaking is still shown with it. */
export function orbStateOf(snapshot: Pick<VoiceSnapshot, "phase" | "muted" | "problem">): OrbState {
  switch (snapshot.phase) {
    case "connecting":
      return "connecting";
    case "held":
      return "muted";
    case "failed":
      return "problem";
    case "ended":
      return "idle";
    case "speaking":
      return snapshot.muted ? "speaking-muted" : "speaking";
    case "thinking":
      return snapshot.muted ? "muted" : "thinking";
    default:
      return snapshot.muted ? "muted" : "listening";
  }
}

/** Whether levels are read in this state: only while a call is open. */
export function isLiveOrb(state: OrbState): boolean {
  return LIVE_STATES.includes(state);
}
