export type AvatarAccessory = "headset" | "antenna" | "glasses" | "ears" | "bow" | "none";
export type AvatarPreset = { id: string; from: string; to: string; body: string; accessory: AvatarAccessory };

const P = (n: number, from: string, to: string, body: string, accessory: AvatarAccessory): AvatarPreset => ({
  id: `hiro-${String(n).padStart(2, "0")}`, from, to, body, accessory,
});

export const AVATAR_PRESETS: readonly AvatarPreset[] = [
  P(1, "#5b8def", "#2f55c4", "#eaf1ff", "headset"),
  P(2, "#34c3a5", "#0f7c6b", "#e6fbf5", "antenna"),
  P(3, "#b07cf0", "#7240c2", "#f4ecff", "glasses"),
  P(4, "#ff9a5a", "#d0531a", "#fff1e7", "ears"),
  P(5, "#f472b6", "#be185d", "#ffeaf4", "glasses"),
  P(6, "#38bdf8", "#0e7490", "#e6f8ff", "bow"),
  P(7, "#818cf8", "#4338ca", "#eef0ff", "headset"),
  P(8, "#fb923c", "#c2410c", "#fff3e8", "antenna"),
  P(9, "#4ade80", "#15803d", "#eafff1", "ears"),
  P(10, "#e879f9", "#a21caf", "#fdeeff", "glasses"),
  P(11, "#a78bfa", "#6d28d9", "#f3eeff", "bow"),
  P(12, "#fbbf24", "#d97706", "#fff8e6", "antenna"),
  P(13, "#2dd4bf", "#0f766e", "#e8fffb", "headset"),
  P(14, "#f87171", "#b91c1c", "#fff0f0", "ears"),
  P(15, "#60a5fa", "#1d4ed8", "#ecf4ff", "glasses"),
  P(16, "#a3e635", "#4d7c0f", "#f5ffe6", "bow"),
  P(17, "#c084fc", "#7e22ce", "#f7efff", "antenna"),
  P(18, "#fdba74", "#ea580c", "#fff5ec", "headset"),
  P(19, "#22d3ee", "#0e7490", "#e7fcff", "none"),
  P(20, "#f9a8d4", "#db2777", "#fff0f7", "ears"),
  P(21, "#93c5fd", "#2563eb", "#eef5ff", "bow"),
  P(22, "#86efac", "#16a34a", "#effff4", "glasses"),
  P(23, "#fcd34d", "#ca8a04", "#fffbea", "none"),
  P(24, "#a5b4fc", "#4f46e5", "#f0f2ff", "antenna"),
];

export function presetById(id: string | null | undefined): AvatarPreset {
  return AVATAR_PRESETS.find((p) => p.id === id) ?? AVATAR_PRESETS[0];
}
