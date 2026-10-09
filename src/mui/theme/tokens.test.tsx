import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { CHAT_KIT_COLOR_TOKEN_NAMES, chatKitVariableName } from "../../core/tokens";
import { AA_CONTRAST, getContrastRatio } from "./color";
import { createChatKitTokens } from "./create-tokens";
import { setChatKitDefaultOverrides } from "./defaults";
import { ChatKitProvider, useChatKitTokens } from "./provider";

const SCHEMES = ["light", "dark"] as const;

const themes = {
  "default MUI theme": createTheme(),
  "css-variables theme with both schemes": createTheme({ cssVariables: { colorSchemeSelector: "class" }, colorSchemes: { light: true, dark: true } }),
  "brand theme": createTheme({
    cssVariables: { colorSchemeSelector: "class" },
    colorSchemes: {
      light: { palette: { primary: { main: "#0e7c66", contrastText: "#ffffff" } } },
      dark: { palette: { primary: { main: "#5fd6b8", contrastText: "#06251e" } } },
    },
  }),
};

function emittedCss(): string {
  return Array.from(document.querySelectorAll("style[data-emotion]"))
    .map((tag) => tag.textContent ?? "")
    .join("");
}

describe("createChatKitTokens", () => {
  describe.each(Object.entries(themes))("defaults for the %s", (_label, theme) => {
    const tokens = createChatKitTokens(theme);

    it.each(SCHEMES)("meets WCAG AA for text on the accent in the %s scheme", (scheme) => {
      const { accent, accentContrast } = tokens[scheme];
      expect(getContrastRatio(accentContrast, accent)).toBeGreaterThanOrEqual(AA_CONTRAST);
    });

    it.each(SCHEMES)("meets WCAG AA for text on the user bubble in the %s scheme", (scheme) => {
      const { userBubble, userBubbleText } = tokens[scheme];
      expect(getContrastRatio(userBubbleText, userBubble)).toBeGreaterThanOrEqual(AA_CONTRAST);
    });

    it.each(SCHEMES)("meets WCAG AA for text on the assistant surface in the %s scheme", (scheme) => {
      const { assistantSurface, assistantText } = tokens[scheme];
      expect(getContrastRatio(assistantText, assistantSurface)).toBeGreaterThanOrEqual(AA_CONTRAST);
    });
  });

  it("fills every colour token for both schemes", () => {
    const tokens = createChatKitTokens(createTheme());
    for (const scheme of SCHEMES) {
      for (const name of CHAT_KIT_COLOR_TOKEN_NAMES) expect(tokens[scheme][name]).toBeTruthy();
    }
  });

  it("reads the accent from each scheme's own palette", () => {
    const tokens = createChatKitTokens(themes["brand theme"]);
    expect(tokens.light.accent).toBe("#0e7c66");
    expect(tokens.dark.accent).toBe("#5fd6b8");
  });

  it("reads the radius and font from the theme", () => {
    const tokens = createChatKitTokens(createTheme({ shape: { borderRadius: 14 }, typography: { fontFamily: "Sora, sans-serif" } }));
    expect(tokens.radius).toBe(14);
    expect(tokens.bubbleRadius).toBe(14);
    expect(tokens.fontFamily).toBe("Sora, sans-serif");
  });

  it("applies a top-level colour to both schemes and lets a scheme-specific one win", () => {
    const tokens = createChatKitTokens(createTheme(), { accent: "#112233", dark: { accent: "#445566" }, radius: 3 });
    expect(tokens.light.accent).toBe("#112233");
    expect(tokens.dark.accent).toBe("#445566");
    expect(tokens.radius).toBe(3);
  });

  it("names the code themes the light and dark schemes highlight with", () => {
    const tokens = createChatKitTokens(createTheme());
    expect(tokens.codeThemeLight).toBe("one-light");
    expect(tokens.codeThemeDark).toBe("one-dark-pro");
  });
});

describe("ChatKitProvider", () => {
  it("writes an override to the --nck CSS variable on its root element", () => {
    const { container } = render(
      <ThemeProvider theme={createTheme()}>
        <ChatKitProvider tokens={{ accent: "#ff0000", radius: 21 }}>
          <span>chat</span>
        </ChatKitProvider>
      </ThemeProvider>
    );
    const root = container.querySelector("[data-nck-root]");
    expect(root).not.toBeNull();
    expect(root).toContainElement(container.querySelector("span"));
    const css = emittedCss();
    expect(css).toContain(`${chatKitVariableName("accent")}:#ff0000`);
    expect(css).toContain(`${chatKitVariableName("radius")}:21px`);
  });

  it("writes the dark scheme's variables under the dark scheme", () => {
    render(
      <ThemeProvider theme={createTheme({ palette: { mode: "dark" } })}>
        <ChatKitProvider tokens={{ dark: { userBubble: "#123456" } }}>
          <span>chat</span>
        </ChatKitProvider>
      </ThemeProvider>
    );
    expect(emittedCss()).toContain(`${chatKitVariableName("userBubble")}:#123456`);
  });

  it("exposes the resolved tokens to children through useChatKitTokens", () => {
    function Probe() {
      return <span data-testid="probe">{useChatKitTokens().light.accent}</span>;
    }
    const { getByTestId } = render(
      <ThemeProvider theme={createTheme()}>
        <ChatKitProvider tokens={{ light: { accent: "#abcdef" } }}>
          <Probe />
        </ChatKitProvider>
      </ThemeProvider>
    );
    expect(getByTestId("probe")).toHaveTextContent("#abcdef");
  });

  it("falls back to the theme's tokens, plus the app's registered defaults, with no provider", () => {
    function Probe() {
      return <span data-testid="probe">{useChatKitTokens().light.accent}</span>;
    }
    const { getByTestId, rerender } = render(<Probe />);
    expect(getByTestId("probe")).toHaveTextContent(createChatKitTokens(createTheme()).light.accent);
    setChatKitDefaultOverrides({ light: { accent: "#778899" } });
    try {
      rerender(<Probe />);
      expect(getByTestId("probe")).toHaveTextContent("#778899");
    } finally {
      setChatKitDefaultOverrides(undefined);
    }
  });

  it("lets a provider's tokens win over the registered defaults", () => {
    setChatKitDefaultOverrides({ accent: "#111111" });
    function Probe() {
      return <span data-testid="probe">{useChatKitTokens().dark.accent}</span>;
    }
    try {
      const { getByTestId } = render(
        <ChatKitProvider tokens={{ dark: { accent: "#222222" } }}>
          <Probe />
        </ChatKitProvider>
      );
      expect(getByTestId("probe")).toHaveTextContent("#222222");
    } finally {
      setChatKitDefaultOverrides(undefined);
    }
  });
});
