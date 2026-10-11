import type { VoiceLevels, VoiceLevelSnapshot } from "./voice-types";

/** Both levels at rest. */
export const SILENT_LEVELS: VoiceLevelSnapshot = { you: 0, agent: 0 };

/** The share of the way to the goal that one frame covers; a one-pole filter, so a level never jumps. */
const SMOOTHING = 0.22;
/** A level this close to its goal is at rest, and the loop stops until the source reports a change. */
const AT_REST = 0.004;

/** Which level a visual follows. */
export type LevelSource = "you" | "agent" | "none";

export interface FollowLevelsOptions {
  levels: VoiceLevels;
  /** Whose level to follow; `none` holds the output at zero. */
  source: LevelSource;
  /** Called in an animation frame with the smoothed level (0 to 1), only when it changed. */
  onLevel: (level: number) => void;
}

/**
 * Follows one level without a React render: the source says a level changed, an animation frame
 * reads `levels.get()`, eases toward it and calls `onLevel`. The loop runs only while the tab is
 * visible and a value is still moving. Returns the stop function, which also cancels the frame.
 */
export function followLevels({ levels, source, onLevel }: FollowLevelsOptions): () => void {
  if (typeof requestAnimationFrame !== "function") return () => undefined;
  let frame = 0;
  let level = 0;
  let written = Number.NaN;
  let visible = typeof document === "undefined" || document.visibilityState !== "hidden";
  const goal = () => (source === "none" ? 0 : levels.get()[source]);
  const write = () => {
    if (level === written) return;
    written = level;
    onLevel(level);
  };
  const step = () => {
    frame = 0;
    const target = goal();
    level += (target - level) * SMOOTHING;
    const resting = Math.abs(target - level) < AT_REST;
    if (resting) level = target;
    write();
    if (!resting && visible) frame = requestAnimationFrame(step);
  };
  const wake = () => {
    if (frame === 0 && visible) frame = requestAnimationFrame(step);
  };
  const sleep = () => {
    if (frame !== 0) cancelAnimationFrame(frame);
    frame = 0;
  };
  const onVisibility = () => {
    visible = document.visibilityState !== "hidden";
    if (visible) wake();
    else sleep();
  };
  const unsubscribe = levels.subscribe(wake);
  if (typeof document !== "undefined") document.addEventListener("visibilitychange", onVisibility);
  wake();
  return () => {
    sleep();
    unsubscribe();
    if (typeof document !== "undefined") document.removeEventListener("visibilitychange", onVisibility);
  };
}

/** A `VoiceLevels` a transport can feed: `set` stores the levels and tells the listeners. */
export function createLevels(): VoiceLevels & { set(next: Partial<VoiceLevelSnapshot>): void } {
  const listeners = new Set<() => void>();
  let now: VoiceLevelSnapshot = SILENT_LEVELS;
  const clamp = (value: number) => Math.min(1, Math.max(0, value));
  return {
    get: () => now,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    set(next) {
      now = {
        you: clamp(next.you ?? now.you),
        agent: clamp(next.agent ?? now.agent),
      };
      for (const listener of [...listeners]) listener();
    },
  };
}
