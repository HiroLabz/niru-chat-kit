import type { VoiceJoinStep, VoicePhase, VoiceProblem, VoiceLevelSnapshot, VoiceTranscriptSegment } from "./voice-types";

/** One timed step of a scripted call. `at` is milliseconds after `play` started. */
export type FakeScriptStep = { at: number } & (
  | { phase: VoicePhase; step?: VoiceJoinStep }
  | { say: { speaker: VoiceTranscriptSegment["speaker"]; text: string; final?: boolean } }
  | { levels: Partial<VoiceLevelSnapshot> }
  | { fail: VoiceProblem }
  | { run: () => void }
);

/** The levels of a plausible voice at `ms`, for demos: two slow waves, never exactly the same twice in a row. */
export function wobbleLevel(ms: number, seed = 0): number {
  const a = Math.sin(ms / 90 + seed) * 0.5 + 0.5;
  const b = Math.sin(ms / 37 + seed * 2.3) * 0.5 + 0.5;
  const c = Math.sin(ms / 410 + seed) * 0.5 + 0.5;
  return Math.min(1, 0.12 + 0.55 * a * (0.4 + 0.6 * c) + 0.25 * b * c);
}
