import type { OrbColors } from "./call-orb-engine";

/** The most device pixels per CSS pixel the drawing buffer uses; a higher density gains nothing a person can see. */
export const MAX_PIXEL_RATIO = 2;

const HIGHLIGHT_AT = "35% 30%";
const BASE_STOP = "55%";
const PALE_STOP = "120%";
const GREY_BRIGHTNESS = 0.22;

/** The orb's box: a circle of exactly the given size, so the layout is the same whatever is drawn in it. */
export function orbBoxStyles(size: number) {
  return {
    position: "relative",
    display: "inline-block",
    flexShrink: 0,
    width: size,
    height: size,
    borderRadius: "50%",
    overflow: "hidden",
    lineHeight: 0,
  } as const;
}

/** The CSS circle drawn when WebGL is missing: the three blues with a pale upper left, greyed by `dim` (0 to 1). */
export function orbFallbackStyles(colors: OrbColors, dim: number) {
  return {
    background: `radial-gradient(circle at ${HIGHLIGHT_AT}, ${colors.pale}, ${colors.mid} ${BASE_STOP}, ${colors.deep} ${PALE_STOP})`,
    filter: dim > 0 ? `grayscale(${dim}) brightness(${1 - GREY_BRIGHTNESS * dim})` : "none",
  } as const;
}
