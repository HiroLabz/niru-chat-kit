import { alpha, createTheme } from "@mui/material/styles";
import type { Palette, Theme } from "@mui/material/styles";
import {
  DEFAULT_CODE_THEME_DARK,
  DEFAULT_CODE_THEME_LIGHT,
  DEFAULT_MONO_FONT_FAMILY,
  applyChatKitOverrides,
  type ChatKitColorTokens,
  type ChatKitTokenOverrides,
  type ChatKitTokens,
} from "../../core/tokens";
import { blend, readableOn } from "./color";

const FALLBACK_RADIUS = 8;
const USER_BUBBLE_TINT = { light: 0.16, dark: 0.32 } as const;
const ASSISTANT_TINT = { light: 0.08, dark: 0.1 } as const;
const INLINE_CODE_ALPHA = { light: 0.06, dark: 0.1 } as const;

type Scheme = "light" | "dark";

function paletteOf(theme: Theme, scheme: Scheme): Palette {
  const schemes = (theme as { colorSchemes?: Partial<Record<Scheme, { palette?: Palette }>> }).colorSchemes;
  const fromSchemes = schemes?.[scheme]?.palette;
  if (fromSchemes) return fromSchemes;
  if (theme.palette.mode === scheme) return theme.palette;
  return createTheme({
    palette: { mode: scheme, primary: { main: theme.palette.primary.main } },
  }).palette;
}

function colorsOf(palette: Palette, scheme: Scheme): ChatKitColorTokens {
  const paper = palette.background.paper;
  const text = palette.text.primary;
  const userBubble = blend(palette.primary.main, paper, USER_BUBBLE_TINT[scheme]);
  const assistantSurface = blend(text, paper, ASSISTANT_TINT[scheme]);
  return {
    accent: palette.primary.main,
    accentContrast: readableOn(palette.primary.main, [palette.primary.contrastText, "#ffffff", "#000000"]),
    text,
    mutedText: palette.text.secondary,
    surface: paper,
    border: palette.divider,
    muted: palette.action.hover,
    assistantSurface,
    assistantText: readableOn(assistantSurface, [text, "#ffffff", "#000000"]),
    userBubble,
    userBubbleText: readableOn(userBubble, [text, "#ffffff", "#000000"]),
    codeSurface: palette.action.hover,
    codeInlineSurface: alpha(text, INLINE_CODE_ALPHA[scheme]),
    info: palette.info.main,
    success: palette.success.main,
    warning: palette.warning.main,
    error: palette.error.main,
  };
}

/**
 * The kit's tokens for an MUI theme: colours come from the theme's light and dark
 * palettes (its `colorSchemes` when it has them), the radius and font from its shape and
 * typography. Pass `overrides` to change any of them; a colour set at the top level
 * applies to both schemes, one set under `light` or `dark` to that scheme alone.
 */
export function createChatKitTokens(theme: Theme, overrides?: ChatKitTokenOverrides): ChatKitTokens {
  const radius = Number(theme.shape.borderRadius) || FALLBACK_RADIUS;
  const base: ChatKitTokens = {
    radius,
    bubbleRadius: radius,
    fontFamily: theme.typography.fontFamily ?? "inherit",
    monoFontFamily: DEFAULT_MONO_FONT_FAMILY,
    codeThemeLight: DEFAULT_CODE_THEME_LIGHT,
    codeThemeDark: DEFAULT_CODE_THEME_DARK,
    light: colorsOf(paletteOf(theme, "light"), "light"),
    dark: colorsOf(paletteOf(theme, "dark"), "dark"),
  };
  return applyChatKitOverrides(base, overrides);
}
