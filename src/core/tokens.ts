/**
 * Colour roles of one colour scheme. Names are skin-neutral so the MUI skin and a later
 * shadcn skin read the same set. Every value is a CSS colour string.
 */
export type ChatKitColorTokens = {
  accent: string;
  accentContrast: string;
  text: string;
  mutedText: string;
  surface: string;
  border: string;
  muted: string;
  assistantSurface: string;
  assistantText: string;
  userBubble: string;
  userBubbleText: string;
  codeSurface: string;
  codeInlineSurface: string;
  info: string;
  success: string;
  warning: string;
  error: string;
} & ChatKitPartColorTokens;

/**
 * Colours of the composer box and the suggestion chips for a surface that draws them apart from
 * the rest of the chat. Each is optional: unset, the part keeps the base colour it uses today
 * (`surface`, `border`, `mutedText`, `accent`).
 */
export type ChatKitPartColorTokens = {
  composerSurface?: string;
  composerBorder?: string;
  placeholderText?: string;
  chipSurface?: string;
  chipBorder?: string;
  chipText?: string;
};

/** Tokens that do not change with the colour scheme. Radii are in px. */
export type ChatKitSharedTokens = {
  radius: number;
  bubbleRadius: number;
  fontFamily: string;
  monoFontFamily: string;
  /** Shiki theme names for fenced code in the light and the dark scheme. */
  codeThemeLight: string;
  codeThemeDark: string;
  /** Corner radius of the composer box; unset, the shared radius scaled up. */
  composerRadius?: number;
  /** Corner radius of a suggestion chip; unset, MUI's rounded chip. */
  chipRadius?: number;
};

export type ChatKitTokens = ChatKitSharedTokens & {
  light: ChatKitColorTokens;
  dark: ChatKitColorTokens;
};

/**
 * What an app may override. A colour at the top level applies to both schemes; `light`
 * and `dark` set one scheme alone and win over the top-level value.
 */
export type ChatKitTokenOverrides = Partial<ChatKitSharedTokens> &
  Partial<ChatKitColorTokens> & {
    light?: Partial<ChatKitColorTokens>;
    dark?: Partial<ChatKitColorTokens>;
  };

export const CHAT_KIT_COLOR_TOKEN_NAMES = [
  "accent",
  "accentContrast",
  "text",
  "mutedText",
  "surface",
  "border",
  "muted",
  "assistantSurface",
  "assistantText",
  "userBubble",
  "userBubbleText",
  "codeSurface",
  "codeInlineSurface",
  "info",
  "success",
  "warning",
  "error",
] as const satisfies readonly (keyof ChatKitColorTokens)[];

export const CHAT_KIT_PART_COLOR_TOKEN_NAMES = [
  "composerSurface",
  "composerBorder",
  "placeholderText",
  "chipSurface",
  "chipBorder",
  "chipText",
] as const satisfies readonly (keyof ChatKitPartColorTokens)[];

/** Every colour name an override may set: the base roles and the optional part colours. */
export const CHAT_KIT_ALL_COLOR_TOKEN_NAMES: readonly string[] = [...CHAT_KIT_COLOR_TOKEN_NAMES, ...CHAT_KIT_PART_COLOR_TOKEN_NAMES];

export const CHAT_KIT_SHARED_TOKEN_NAMES = [
  "radius",
  "bubbleRadius",
  "fontFamily",
  "monoFontFamily",
  "codeThemeLight",
  "codeThemeDark",
  "composerRadius",
  "chipRadius",
] as const satisfies readonly (keyof ChatKitSharedTokens)[];

export const DEFAULT_CODE_THEME_LIGHT = "one-light";
export const DEFAULT_CODE_THEME_DARK = "one-dark-pro";
export const DEFAULT_MONO_FONT_FAMILY = "monospace";

/** `userBubbleText` -> `--nck-user-bubble-text`. */
export function chatKitVariableName(token: string): string {
  return `--nck-${token.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`;
}

/** Merges overrides over resolved tokens; a scheme-specific value beats a top-level one. */
export function applyChatKitOverrides(base: ChatKitTokens, overrides?: ChatKitTokenOverrides): ChatKitTokens {
  if (!overrides) return base;
  const { light, dark, ...flat } = overrides;
  const colors: Partial<ChatKitColorTokens> = {};
  const shared: Partial<ChatKitSharedTokens> = {};
  for (const [name, value] of Object.entries(flat)) {
    if (value === undefined) continue;
    if (CHAT_KIT_ALL_COLOR_TOKEN_NAMES.includes(name)) {
      Object.assign(colors, { [name]: value });
    } else if ((CHAT_KIT_SHARED_TOKEN_NAMES as readonly string[]).includes(name)) {
      Object.assign(shared, { [name]: value });
    }
  }
  return {
    ...base,
    ...shared,
    light: { ...base.light, ...colors, ...light },
    dark: { ...base.dark, ...colors, ...dark },
  };
}
