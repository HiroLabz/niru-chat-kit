import { useCallback, useMemo, useRef, useState } from "react";
import { createFakeVoiceSession, useLocalMedia, type FakeVoiceSession, type VoiceCallSummary } from "@hiro/niru-chat-kit";
import { playDemoCall } from "./demo-call-script";

/** A finished call, to be shown in the conversation it was started from. */
export type DemoCallCard = { id: string; conversationId: string; summary: VoiceCallSummary };

export type DemoCall = {
  session: FakeVoiceSession | null;
  minimised: boolean;
  cards: DemoCallCard[];
  /** Starts the scripted call, for the conversation that is open now. */
  start(): void;
  minimise(): void;
  expand(): void;
  /** Called with the summary when the call ends: closes it and keeps a card for the chat. */
  finish(summary: VoiceCallSummary): void;
};

/**
 * The demo's call: a fake voice session driven by a script, with the visitor's own camera and
 * screen as a local preview (`useLocalMedia`, stopped when the call ends or the demo closes).
 */
export function useDemoCall(activeId: string): DemoCall {
  const local = useLocalMedia();
  const [session, setSession] = useState<FakeVoiceSession | null>(null);
  const [minimised, setMinimised] = useState(false);
  const [cards, setCards] = useState<DemoCallCard[]>([]);
  const origin = useRef(activeId);
  const stopScript = useRef<(() => void) | null>(null);
  const counter = useRef(0);
  const controller = local.controller;

  const start = useCallback(() => {
    stopScript.current?.();
    origin.current = activeId;
    const next = createFakeVoiceSession({ phase: "connecting", capabilities: { camera: true, screenShare: true, hold: true }, media: controller });
    stopScript.current = playDemoCall(next);
    setSession(next);
    setMinimised(false);
  }, [activeId, controller]);

  const finish = useCallback((summary: VoiceCallSummary) => {
    stopScript.current?.();
    stopScript.current = null;
    controller.stopAll();
    counter.current += 1;
    setCards((all) => [...all, { id: `call-${counter.current}`, conversationId: origin.current, summary }]);
    setSession(null);
    setMinimised(false);
  }, [controller]);

  return useMemo(
    () => ({ session, minimised, cards, start, finish, minimise: () => setMinimised(true), expand: () => setMinimised(false) }),
    [session, minimised, cards, start, finish]
  );
}
