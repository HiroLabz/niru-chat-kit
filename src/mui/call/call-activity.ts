"use client";

import { useEffect, useState } from "react";
import type { VoiceSnapshot } from "../../core/voice/voice-types";

/** After this long in `thinking` with no activity from the app, the default line becomes "Still working on it". */
export const DEFAULT_QUIET_AFTER_MS = 8000;

export interface CallActivity {
  /** The app's sentence while thinking or speaking; null otherwise. */
  text: string | null;
  /** True once `thinking` has had no activity for `quietAfterMs`. Never true when the app supplies activity. */
  quiet: boolean;
}

/**
 * What the call says it is doing besides its status. The `activity` prop wins over the snapshot's.
 * Only `thinking` and `speaking` show the app's text; only `thinking` goes quiet. Leaving `thinking`
 * (back to `listening`, say) clears both, and the quiet timer starts again the next time.
 */
export function useCallActivity(snapshot: Pick<VoiceSnapshot, "phase" | "activity">, activity: string | null | undefined, quietAfterMs: number = DEFAULT_QUIET_AFTER_MS): CallActivity {
  const given = (activity !== undefined ? activity : snapshot.activity)?.trim() || null;
  const phase = snapshot.phase;
  const text = given && (phase === "thinking" || phase === "speaking") ? given : null;
  const waiting = phase === "thinking" && !text;
  const [quiet, setQuiet] = useState(false);
  useEffect(() => {
    setQuiet(false);
    if (!waiting) return;
    const id = setTimeout(() => setQuiet(true), quietAfterMs);
    return () => clearTimeout(id);
  }, [waiting, quietAfterMs]);
  return { text, quiet: waiting && quiet };
}
