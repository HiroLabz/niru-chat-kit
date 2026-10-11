"use client";

import { createContext, useContext, useMemo } from "react";
import { blend, readableOn } from "../theme/color";
import { useChatKitTokens } from "../theme";

/**
 * The colours of the call screens. Every one is derived from the kit's dark-scheme tokens (the
 * call is always a dark stage); pass `CallColorOverrides` to change any of them.
 */
export interface CallColors {
  /** The stage background. */
  stage: string;
  text: string;
  mutedText: string;
  /** Round control buttons and the level pill. */
  control: string;
  controlHover: string;
  /** A control that is switched on (camera on, sharing). */
  controlActive: string;
  controlActiveText: string;
  /** The end button. */
  danger: string;
  dangerText: string;
  /** The glow rising from the bottom, the level pill's light and the orb's blues. */
  glow: string;
  /** Chips (sharing chip) and the transcript sheet. */
  chip: string;
  border: string;
}

export type CallColorOverrides = Partial<CallColors>;

const CONTROL_TINT = 0.14;
const HOVER_TINT = 0.22;
const CHIP_TINT = 0.1;
const BORDER_TINT = 0.18;

/** The call colours for the tokens in force, with optional overrides. */
export function useCallColors(overrides?: CallColorOverrides): CallColors {
  const inherited = useContext(CallColorsContext);
  const { dark } = useChatKitTokens();
  return useMemo(() => {
    if (inherited && !overrides) return inherited;
    const base: CallColors = {
      stage: dark.surface,
      text: dark.text,
      mutedText: dark.mutedText,
      control: blend(dark.text, dark.surface, CONTROL_TINT),
      controlHover: blend(dark.text, dark.surface, HOVER_TINT),
      controlActive: dark.text,
      controlActiveText: readableOn(dark.text, [dark.surface, dark.accentContrast]),
      danger: dark.error,
      dangerText: readableOn(dark.error, [dark.text, dark.surface]),
      glow: dark.accent,
      chip: blend(dark.text, dark.surface, CHIP_TINT),
      border: blend(dark.text, dark.surface, BORDER_TINT),
    };
    return { ...base, ...overrides };
  }, [dark, inherited, overrides]);
}

export const CallColorsContext = createContext<CallColors | null>(null);
