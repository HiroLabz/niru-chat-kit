import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { siteTheme, type Mode } from "./theme";

type ModeContextValue = { mode: Mode; toggle: () => void };
const ModeContext = createContext<ModeContextValue>({ mode: "light", toggle: () => undefined });

const STORAGE_KEY = "nck-docs-mode";

function initialMode(): Mode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // Storage can be blocked; fall through to the system setting.
  }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** The site's colour mode: the visitor's saved choice, else the system's. */
export function ModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Mode>(initialMode);
  useEffect(() => {
    document.documentElement.style.colorScheme = mode;
  }, [mode]);
  const toggle = useCallback(() => {
    setMode((current) => {
      const next = current === "dark" ? "light" : "dark";
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // Not saved; the choice still applies for this visit.
      }
      return next;
    });
  }, []);
  const value = useMemo(() => ({ mode, toggle }), [mode, toggle]);
  return (
    <ModeContext.Provider value={value}>
      <ThemeProvider theme={siteTheme(mode)}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ModeContext.Provider>
  );
}

export const useMode = () => useContext(ModeContext);
