import type { VoiceSnapshot, VoiceTranscriptSegment } from "./voice-types";

/** What a finished call leaves in the conversation. */
export interface VoiceCallSummary {
  /** Milliseconds from start to end; 0 when the call never started. */
  durationMs: number;
  /** The settled lines, in order. */
  transcript: VoiceTranscriptSegment[];
  startedAt: number | null;
  endedAt: number | null;
}

/** The summary of a call for a `CallCard`; lines still being spoken are left out. */
export function summariseCall(snapshot: Pick<VoiceSnapshot, "transcript" | "startedAt" | "endedAt">, now: number = Date.now()): VoiceCallSummary {
  const { startedAt, endedAt } = snapshot;
  const end = endedAt ?? now;
  return {
    durationMs: startedAt === null ? 0 : Math.max(0, end - startedAt),
    transcript: snapshot.transcript.filter((line) => line.final),
    startedAt,
    endedAt,
  };
}

/** `4:07` or `1:02:09`. */
export function formatCallDuration(durationMs: number): string {
  const total = Math.max(0, Math.floor(durationMs / 1000));
  const seconds = String(total % 60).padStart(2, "0");
  const minutes = Math.floor(total / 60) % 60;
  const hours = Math.floor(total / 3600);
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, "0")}:${seconds}` : `${minutes}:${seconds}`;
}
