import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { createChatKitTokens } from "./create-tokens";
import { ChatKitProvider } from "./provider";
import { Composer } from "../blocks/composer";
import { PromptSuggestion } from "../primitives/prompt-suggestion";

const theme = createTheme();
const PARTS = {
  composerSurface: "rgb(17, 18, 19)",
  composerBorder: "rgb(20, 21, 22)",
  placeholderText: "rgb(23, 24, 25)",
  chipSurface: "rgb(26, 27, 28)",
  chipBorder: "rgb(29, 30, 31)",
  chipText: "rgb(32, 33, 34)",
};

function emittedCss(): string {
  return Array.from(document.querySelectorAll("style[data-emotion]"))
    .map((tag) => tag.textContent ?? "")
    .join("");
}

describe("part colour tokens", () => {
  it("are unset by default, so every part keeps its base colour", () => {
    const tokens = createChatKitTokens(theme);
    for (const name of Object.keys(PARTS)) expect(tokens.light[name as keyof typeof PARTS]).toBeUndefined();
    expect(tokens.composerRadius).toBeUndefined();
    expect(tokens.chipRadius).toBeUndefined();
  });

  it("apply to both schemes when set at the top level, and a scheme value wins", () => {
    const tokens = createChatKitTokens(theme, { ...PARTS, composerRadius: 12, chipRadius: 16, dark: { chipText: "rgb(1, 2, 3)" } });
    expect(tokens.light.composerSurface).toBe(PARTS.composerSurface);
    expect(tokens.dark.composerSurface).toBe(PARTS.composerSurface);
    expect(tokens.light.chipText).toBe(PARTS.chipText);
    expect(tokens.dark.chipText).toBe("rgb(1, 2, 3)");
    expect(tokens.composerRadius).toBe(12);
    expect(tokens.chipRadius).toBe(16);
  });

  it("draw the composer box and the chips, and write their CSS variables only when set", () => {
    render(
      <ThemeProvider theme={theme}>
        <ChatKitProvider tokens={{ ...PARTS, composerRadius: 12, chipRadius: 16 }}>
          <Composer value="" onChange={() => undefined} onSubmit={() => undefined} placeholder="Say hi" />
          <PromptSuggestion onSelect={() => undefined}>Hi</PromptSuggestion>
        </ChatKitProvider>
      </ThemeProvider>
    );
    const css = emittedCss();
    for (const value of Object.values(PARTS)) expect(css).toContain(value);
    expect(css).toContain("--nck-composer-surface");
    expect(css).toContain("border-radius:12px");
    expect(css).toContain("border-radius:16px");
  });

  it("writes no part variable when none is set", () => {
    document.head.querySelectorAll("style[data-emotion]").forEach((tag) => tag.remove());
    render(
      <ThemeProvider theme={theme}>
        <ChatKitProvider>
          <span />
        </ChatKitProvider>
      </ThemeProvider>
    );
    expect(emittedCss()).not.toContain("--nck-composer-surface");
  });
});
