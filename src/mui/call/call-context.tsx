"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { VoiceSession, VoiceSnapshot } from "../../core/voice/voice-types";
import type { CallColors } from "./call-colors";
import type { CallTranslate } from "./call-labels";
import type { MicrophonePicker } from "./call-microphone";

/** Which visual moves with the voice: the pill in the control row (default) or Niru's orb in the centre. */
export type CallVisual = "pill" | "orb";

export interface CallPerson {
  name?: string;
  /** A node drawn as the avatar (for a person: top right; for the agent: the mark in the centre). */
  avatar?: ReactNode;
}

export interface CallContextValue {
  session: VoiceSession;
  snapshot: VoiceSnapshot;
  colors: CallColors;
  t: CallTranslate;
  visual: CallVisual;
  agent: CallPerson;
  user: CallPerson;
  /** Null when nothing can select a microphone: no picker is drawn. */
  microphone: MicrophonePicker | null;
  menu?: ReactNode;
  onMinimise?: () => void;
  onClose?: () => void;
  onCallAgain?: () => void;
}

export const CallContext = createContext<CallContextValue | null>(null);

/** Read by every `CallStage` part; throws outside `<CallStage>` rather than rendering nothing. */
export function useCall(): CallContextValue {
  const value = useContext(CallContext);
  if (!value) throw new Error("CallStage parts must be used inside <CallStage>");
  return value;
}
