import type { FakeScriptStep, FakeVoiceSession } from "@hiro/niru-chat-kit";

/** One scripted call: joining, listening, thinking, speaking with captions, then the mic is the visitor's again. */
const STEPS: FakeScriptStep[] = [
  { at: 0, phase: "connecting", step: "joining" },
  { at: 500, phase: "connecting", step: "microphone" },
  { at: 1000, phase: "connecting", step: "audio" },
  { at: 1400, phase: "listening" },
  { at: 2600, say: { speaker: "user", text: "What can you show me in this demo?", final: false } },
  { at: 3600, phase: "thinking" },
  { at: 5200, phase: "speaking" },
  { at: 5300, say: { speaker: "agent", text: "Quite a lot, and all of it is scripted." } },
  { at: 7200, say: { speaker: "agent", text: "Turn on your camera or share your screen to see a preview. It stays on your device and goes nowhere else." } },
  { at: 11500, phase: "listening" },
];

/**
 * Plays the scripted call on a fake session. The user's line is recorded as interim then settled
 * at the end of the thinking step. Returns a cancel function.
 */
export function playDemoCall(session: FakeVoiceSession): () => void {
  session.script.simulateLevels(true);
  const cancel = session.script.play([
    ...STEPS,
    { at: 3500, run: () => settleLastUserLine(session) },
  ]);
  return () => {
    cancel();
    session.script.simulateLevels(false);
  };
}

function settleLastUserLine(session: FakeVoiceSession): void {
  const last = [...session.getSnapshot().transcript].reverse().find((line) => line.speaker === "user");
  if (last) session.script.settle(last.id);
}
