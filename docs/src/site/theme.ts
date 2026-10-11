import { createTheme, type Theme } from "@mui/material/styles";

export type Mode = "light" | "dark";

// System fonts only: the site makes no request for a web font.
const SANS = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace';

export const SITE_MONO = MONO;

const themes = new Map<Mode, Theme>();

/** The MUI theme of the docs site and of every live example. The kit reads its colours from it. */
export function siteTheme(mode: Mode): Theme {
  const cached = themes.get(mode);
  if (cached) return cached;
  const theme = createTheme({
    palette: {
      mode,
      primary: { main: mode === "dark" ? "#8ab4ff" : "#2750c4" },
      ...(mode === "dark" ? { background: { default: "#0f1115", paper: "#171a20" } } : {}),
    },
    shape: { borderRadius: 10 },
    typography: {
      fontFamily: SANS,
      h1: { fontSize: "2.25rem", fontWeight: 700, letterSpacing: -0.5 },
      h2: { fontSize: "1.5rem", fontWeight: 650, letterSpacing: -0.25 },
      h3: { fontSize: "1.15rem", fontWeight: 650 },
    },
    components: {
      MuiButtonBase: { defaultProps: { disableRipple: false } },
      MuiCssBaseline: {
        styleOverrides: {
          "a:focus-visible, button:focus-visible": { outlineOffset: 2 },
        },
      },
    },
  });
  themes.set(mode, theme);
  return theme;
}
