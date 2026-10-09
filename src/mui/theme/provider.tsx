"use client";

import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import Box from "@mui/material/Box";
import { useTheme } from "@mui/material/styles";
import type { CSSObject, SxProps, Theme } from "@mui/material/styles";
import {
  CHAT_KIT_COLOR_TOKEN_NAMES,
  chatKitVariableName,
  type ChatKitColorTokens,
  type ChatKitTokenOverrides,
  type ChatKitTokens,
} from "../../core/tokens";
import { createChatKitTokens } from "./create-tokens";
import { getChatKitDefaultOverrides, mergeChatKitOverrides } from "./defaults";

const ChatKitTokensContext = createContext<ChatKitTokens | null>(null);

type SxFunction = Extract<SxProps<Theme>, (theme: Theme) => unknown>;
type StyleObject = CSSObject;

/** The `--nck-*` custom properties for one colour scheme. */
export function colorVariables(colors: ChatKitColorTokens): Record<string, string> {
  return Object.fromEntries(CHAT_KIT_COLOR_TOKEN_NAMES.map((name) => [chatKitVariableName(name), colors[name]]));
}

function sharedVariables(tokens: ChatKitTokens): Record<string, string> {
  return {
    [chatKitVariableName("radius")]: `${tokens.radius}px`,
    [chatKitVariableName("bubbleRadius")]: `${tokens.bubbleRadius}px`,
    [chatKitVariableName("fontFamily")]: tokens.fontFamily,
    [chatKitVariableName("monoFontFamily")]: tokens.monoFontFamily,
  };
}

function useResolvedTokens(overrides?: ChatKitTokenOverrides): ChatKitTokens {
  const theme = useTheme();
  const defaults = getChatKitDefaultOverrides();
  return useMemo(
    () => createChatKitTokens(theme, mergeChatKitOverrides(defaults, overrides)),
    [theme, defaults, overrides]
  );
}

/**
 * Supplies the chat tokens to every kit component below it and writes them as `--nck-*`
 * CSS variables on its root element, so plain CSS can target them too. `tokens` overrides
 * any default the MUI theme gives; omit it to take the theme's look.
 */
export function ChatKitProvider({
  tokens,
  children,
  className,
  sx,
}: {
  tokens?: ChatKitTokenOverrides;
  children?: ReactNode;
  className?: string;
  sx?: SxProps<Theme>;
}) {
  const resolved = useResolvedTokens(tokens);
  const rootSx = useCallback(
    (theme: Theme): StyleObject => ({
      display: "contents",
      ...sharedVariables(resolved),
      ...colorVariables(resolved.light),
      ...theme.applyStyles("dark", colorVariables(resolved.dark)),
    }),
    [resolved]
  );
  return (
    <ChatKitTokensContext.Provider value={resolved}>
      <Box className={className} data-nck-root="" sx={[rootSx, ...(Array.isArray(sx) ? sx : sx ? [sx] : [])]}>
        {children}
      </Box>
    </ChatKitTokensContext.Provider>
  );
}

/** The tokens in force: the nearest provider's, else the app's defaults over the MUI theme. */
export function useChatKitTokens(): ChatKitTokens {
  const provided = useContext(ChatKitTokensContext);
  const fallback = useResolvedTokens(undefined);
  return provided ?? fallback;
}

/**
 * The tokens plus `scheme`, which builds an `sx` function from a style callback: it is
 * handed the light tokens, and again the dark tokens under the dark colour scheme.
 * Its third argument names the scheme the tokens belong to.
 */
export function useChatKitStyles() {
  const tokens = useChatKitTokens();
  const scheme = useCallback(
    (build: (colors: ChatKitColorTokens, all: ChatKitTokens, mode: "light" | "dark") => StyleObject): SxFunction =>
      (theme: Theme) => ({
        ...build(tokens.light, tokens, "light"),
        ...theme.applyStyles("dark", build(tokens.dark, tokens, "dark")),
      }),
    [tokens]
  );
  return { tokens, scheme };
}
