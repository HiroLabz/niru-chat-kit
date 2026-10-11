import type { VoiceLevels } from "../../core/voice/voice-types";
import type { OrbState } from "./call-orb-state";

/** Whose sound level drives the orb: the person's while the agent listens, the agent's while it speaks, nobody's otherwise. */
export type OrbLevelSource = "member" | "agent" | "none";

/** How one state looks and moves: cloud speed, swirl, grey share, edge pulse (size and rate) and the level that drives it. */
export interface OrbLook {
  speed: number;
  swirl: number;
  dim: number;
  pulse: number;
  pulseRate: number;
  who: OrbLevelSource;
}

const IDLE: OrbLook = { speed: 0.45, swirl: 0, dim: 0, pulse: 0.004, pulseRate: 0.9, who: "none" };
const SPEAKING: OrbLook = { speed: 1, swirl: 0.3, dim: 0, pulse: 0.004, pulseRate: 1, who: "agent" };

/**
 * The looks of the nine orb states. The calm connected look is the idle look; the agent speaking
 * over a muted microphone looks like speaking, since it is the agent's level that moves it.
 */
export const ORB_LOOKS: Record<OrbState, OrbLook> = {
  idle: IDLE,
  connecting: { speed: 0.6, swirl: 0.2, dim: 0.25, pulse: 0.022, pulseRate: 3.2, who: "none" },
  connected: IDLE,
  listening: { speed: 0.55, swirl: 0, dim: 0, pulse: 0.004, pulseRate: 1, who: "member" },
  thinking: { speed: 1.7, swirl: 1, dim: 0, pulse: 0.01, pulseRate: 2.2, who: "none" },
  speaking: SPEAKING,
  muted: { speed: 0.18, swirl: 0, dim: 0.72, pulse: 0, pulseRate: 0, who: "none" },
  "speaking-muted": SPEAKING,
  problem: { speed: 0, swirl: 0, dim: 1, pulse: 0, pulseRate: 0, who: "none" },
};

/** The raw level the look listens to, 0 to 1. */
export function heardLevel(look: OrbLook, levels: VoiceLevels): number {
  if (look.who === "none") return 0;
  const now = levels.get();
  return look.who === "member" ? now.you : now.agent;
}

const ATTACK_RATE = 14;
const RELEASE_RATE = 5;
const SWIRL_RATE = 3;
const DIM_RATE = 6;
const MAX_STEP_SECONDS = 0.05;
const TIME_OFFSET = 40;
const SWIRL_WOBBLE = 0.15;
const SWIRL_WOBBLE_RATE = 0.6;
const STILL_SWIRL_SHARE = 0.5;

/** What the loop remembers between frames: the cloud's clock and the three smoothed values. */
export interface OrbMotion {
  clock: number;
  level: number;
  swirl: number;
  dim: number;
}

/** What one draw sets: the shader's five numbers. */
export interface OrbFrame {
  time: number;
  level: number;
  pulse: number;
  dim: number;
  swirl: number;
}

/** A motion at rest in a look, so an orb mounted in the muted state does not start in colour. */
export function motionAt(look: OrbLook): OrbMotion {
  return { clock: 0, level: 0, swirl: look.swirl, dim: look.dim };
}

const ease = (dt: number, rate: number) => 1 - Math.exp(-dt * rate);

/** Moves the motion on by one frame: the level rises fast and falls slowly, the swirl and the grey follow the look. */
export function advance(motion: OrbMotion, look: OrbLook, heard: number, elapsed: number): void {
  const dt = Math.min(MAX_STEP_SECONDS, Math.max(0, elapsed));
  motion.clock += dt * look.speed;
  motion.level += (heard - motion.level) * ease(dt, heard > motion.level ? ATTACK_RATE : RELEASE_RATE);
  motion.swirl += (look.swirl - motion.swirl) * ease(dt, SWIRL_RATE);
  motion.dim += (look.dim - motion.dim) * ease(dt, DIM_RATE);
}

/** The five shader numbers for a motion at `seconds` of wall time. Held still, the level and the pulse are zero and the look is exact. */
export function frameOf(motion: OrbMotion, look: OrbLook, seconds: number, still: boolean): OrbFrame {
  if (still) return { time: motion.clock + TIME_OFFSET, level: 0, pulse: 0, dim: look.dim, swirl: look.swirl * STILL_SWIRL_SHARE };
  return {
    time: motion.clock + TIME_OFFSET,
    level: motion.level,
    pulse: look.pulse * Math.sin(seconds * look.pulseRate * Math.PI),
    dim: motion.dim,
    swirl: motion.swirl + Math.sin(motion.clock * SWIRL_WOBBLE_RATE) * SWIRL_WOBBLE * look.swirl,
  };
}
