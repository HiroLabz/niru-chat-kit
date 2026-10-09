import { decomposeColor, getContrastRatio, recomposeColor } from "@mui/material/styles";

export const AA_CONTRAST = 4.5;

const MAX_CHANNEL = 255;

/** Mixes `weight` of `foreground` over a solid `background`; returns `foreground` when either cannot be parsed. */
export function blend(foreground: string, background: string, weight: number): string {
  try {
    const fg = decomposeColor(foreground).values;
    const bg = decomposeColor(background).values;
    const channel = (index: number) =>
      Math.round(Math.min(MAX_CHANNEL, Math.max(0, fg[index] * weight + bg[index] * (1 - weight))));
    return recomposeColor({ type: "rgb", values: [channel(0), channel(1), channel(2)] });
  } catch {
    return foreground;
  }
}

/** The first candidate that reads on `background` at AA, else whichever of the candidates reads best. */
export function readableOn(background: string, candidates: readonly string[]): string {
  let best = candidates[0];
  let bestRatio = 0;
  for (const candidate of candidates) {
    let ratio = 0;
    try {
      ratio = getContrastRatio(candidate, background);
    } catch {
      continue;
    }
    if (ratio >= AA_CONTRAST) return candidate;
    if (ratio > bestRatio) {
      best = candidate;
      bestRatio = ratio;
    }
  }
  return best;
}

export { getContrastRatio };
