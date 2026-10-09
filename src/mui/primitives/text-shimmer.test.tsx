import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { ChatKitProvider } from "../theme";
import { TextShimmer } from "./text-shimmer";

function emittedCss(): string {
  return Array.from(document.querySelectorAll("style[data-emotion]"))
    .map((tag) => tag.textContent ?? "")
    .join("");
}

describe("TextShimmer", () => {
  it("paints its sweep from the text tokens of each scheme", () => {
    render(
      <ThemeProvider theme={createTheme({ cssVariables: { colorSchemeSelector: "class" }, colorSchemes: { light: true, dark: true } })}>
        <ChatKitProvider tokens={{ light: { text: "#010101", mutedText: "#020202" }, dark: { text: "#fefefe", mutedText: "#fdfdfd" } }}>
          <TextShimmer>Thinking</TextShimmer>
        </ChatKitProvider>
      </ThemeProvider>
    );
    const css = emittedCss();
    expect(screen.getByText("Thinking")).toBeInTheDocument();
    expect(css).toContain("#010101");
    expect(css).toContain("#020202");
    expect(css).toContain("#fefefe");
    expect(css).toContain("#fdfdfd");
  });

  it("takes its pace and band width from props", () => {
    render(
      <TextShimmer duration={5} spread={30}>
        slow
      </TextShimmer>
    );
    expect(emittedCss()).toContain("5s linear infinite");
    expect(emittedCss()).toMatch(/20%[^;]*50%[^;]*80%/);
  });
});
