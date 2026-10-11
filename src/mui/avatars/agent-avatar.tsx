import { useId } from "react";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import LinkOutlined from "@mui/icons-material/LinkOutlined";
import { presetById, type AvatarPreset } from "./presets";

/** Accepts the API shape directly: preset_id and url may be null. */
export type AgentAvatarValue =
  | { kind: "preset"; preset_id: string | null; url?: string | null }
  | { kind: "image"; url: string | null; preset_id?: string | null };

export type AgentAvatarProps = {
  avatar: AgentAvatarValue | null | undefined;
  name: string;
  size?: number;
  linked?: boolean;
};

const INK = "#1d2433";

function Accessory({ preset }: { preset: AvatarPreset }) {
  switch (preset.accessory) {
    case "headset":
      return (
        <>
          <path d="M15 36a17 17 0 0 1 34 0" stroke={INK} strokeWidth="3" fill="none" />
          <rect x="11" y="33" width="7" height="11" rx="3.5" fill={INK} />
          <rect x="46" y="33" width="7" height="11" rx="3.5" fill={INK} />
        </>
      );
    case "antenna":
      return (
        <>
          <line x1="32" y1="21" x2="32" y2="12" stroke={INK} strokeWidth="2.4" />
          <circle cx="32" cy="11" r="3.6" fill="#ffd166" />
        </>
      );
    case "glasses":
      return (
        <>
          <circle cx="25" cy="36" r="6.6" stroke={INK} strokeWidth="2" fill="none" />
          <circle cx="39" cy="36" r="6.6" stroke={INK} strokeWidth="2" fill="none" />
          <line x1="31.6" y1="36" x2="32.4" y2="36" stroke={INK} strokeWidth="2" />
        </>
      );
    case "bow":
      return (
        <>
          <path d="M32 21l-7-4v8zM32 21l7-4v8z" fill="#ff6b8b" />
          <circle cx="32" cy="21" r="2.2" fill="#e04f70" />
        </>
      );
    default:
      return null;
  }
}

function PresetArt({ preset }: { preset: AvatarPreset }) {
  const gradient = useId();
  return (
    <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={gradient} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={preset.from} />
          <stop offset="1" stopColor={preset.to} />
        </linearGradient>
      </defs>
      <rect width="64" height="64" fill={`url(#${gradient})`} />
      {preset.accessory === "ears" && (
        <>
          <circle cx="18" cy="22" r="6" fill={preset.body} />
          <circle cx="46" cy="22" r="6" fill={preset.body} />
          <circle cx="18" cy="22" r="3" fill={preset.from} opacity=".5" />
          <circle cx="46" cy="22" r="3" fill={preset.from} opacity=".5" />
        </>
      )}
      <path d="M14 64V40a18 18 0 0 1 36 0v24z" fill={preset.body} />
      <rect x="14" y="20" width="36" height="34" rx="16" fill={preset.body} />
      <ellipse cx="25" cy="36" rx="3.4" ry="4.2" fill={INK} />
      <ellipse cx="39" cy="36" rx="3.4" ry="4.2" fill={INK} />
      <circle cx="26.2" cy="34.4" r="1.2" fill="#fff" />
      <circle cx="40.2" cy="34.4" r="1.2" fill="#fff" />
      <circle cx="20" cy="42" r="2.6" fill="#ff8fa3" opacity=".55" />
      <circle cx="44" cy="42" r="2.6" fill="#ff8fa3" opacity=".55" />
      <path d="M28.5 43.5q3.5 3 7 0" stroke={INK} strokeWidth="1.8" fill="none" strokeLinecap="round" />
      {preset.accessory !== "ears" && <Accessory preset={preset} />}
    </svg>
  );
}

/** An agent's avatar: uploaded image or illustrated preset. Never initials. */
export function AgentAvatar({ avatar, name, size = 28, linked = false }: AgentAvatarProps) {
  const image = avatar?.kind === "image" && avatar.url ? avatar.url : undefined;
  return (
    <Box role="img" aria-label={name} sx={{ position: "relative", width: size, height: size, flex: "none" }}>
      {image ? (
        <Avatar src={image} alt="" sx={{ width: size, height: size }} />
      ) : (
        <Box sx={{ width: size, height: size, borderRadius: "50%", overflow: "hidden" }}>
          <PresetArt preset={presetById(avatar?.kind === "preset" ? avatar.preset_id : undefined)} />
        </Box>
      )}
      {linked && (
        <Box
          data-testid="agent-avatar-link"
          sx={{
            position: "absolute", right: -3, bottom: -3, width: 14, height: 14, borderRadius: "50%",
            bgcolor: "background.paper", border: 1, borderColor: "divider",
            display: "grid", placeItems: "center", color: "text.secondary",
          }}
        >
          <LinkOutlined sx={{ fontSize: 10 }} />
        </Box>
      )}
    </Box>
  );
}
