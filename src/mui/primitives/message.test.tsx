import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { ChatKitProvider } from "../theme";
import { Message, MessageContent } from "./message";

vi.mock("shiki", () => ({ codeToHtml: () => new Promise(() => {}) }));

describe("Message", () => {
  it("lays an assistant turn out from the start and a user turn from the end", () => {
    const { rerender } = render(<Message from="assistant" data-testid="row">x</Message>);
    expect(getComputedStyle(screen.getByTestId("row")).justifyContent).toBe("flex-start");
    rerender(<Message from="user" data-testid="row">x</Message>);
    expect(getComputedStyle(screen.getByTestId("row")).justifyContent).toBe("flex-end");
  });

  it("renders the avatar with an initial, or an image when it has a source", () => {
    const { rerender } = render(
      <Message>
        <Message.Avatar initial="H" />
      </Message>
    );
    expect(screen.getByText("H")).toBeInTheDocument();
    rerender(
      <Message>
        <Message.Avatar src="https://example.com/a.png" alt="Hiro" />
      </Message>
    );
    expect(screen.getByRole("img", { name: "Hiro" })).toBeInTheDocument();
  });

  it("puts the avatar beside the top of the turn", () => {
    render(<Message data-testid="row">x</Message>);
    expect(getComputedStyle(screen.getByTestId("row")).alignItems).toBe("flex-start");
  });

  it.each(["light", "dark"] as const)("lets the caller's sx colour the avatar in the %s scheme", (mode) => {
    document.documentElement.classList.toggle("dark", mode === "dark");
    try {
      render(
        <ThemeProvider theme={createTheme({ cssVariables: { colorSchemeSelector: "class" }, colorSchemes: { light: true, dark: true } })}>
          <ChatKitProvider tokens={{ light: { assistantSurface: "rgb(1, 1, 1)" }, dark: { assistantSurface: "rgb(2, 2, 2)" } }}>
            <Message>
              <Message.Avatar initial="Q" sx={{ bgcolor: "rgb(214, 69, 108)", color: "rgb(255, 255, 255)" }} />
            </Message>
          </ChatKitProvider>
        </ThemeProvider>
      );
      const avatar = screen.getByText("Q");
      expect(getComputedStyle(avatar).backgroundColor).toBe("rgb(214, 69, 108)");
      expect(getComputedStyle(avatar).color).toBe("rgb(255, 255, 255)");
    } finally {
      document.documentElement.classList.remove("dark");
    }
  });

  it("colours an avatar without sx from the tokens of each scheme", () => {
    render(
      <ThemeProvider theme={createTheme({ cssVariables: { colorSchemeSelector: "class" }, colorSchemes: { light: true, dark: true } })}>
        <ChatKitProvider tokens={{ light: { assistantSurface: "#0a0b0c" }, dark: { assistantSurface: "#0d0e0f" } }}>
          <Message.Avatar initial="H" />
        </ChatKitProvider>
      </ThemeProvider>
    );
    const css = Array.from(document.querySelectorAll("style[data-emotion]"))
      .map((tag) => tag.textContent ?? "")
      .join("");
    expect(css).toContain("--nck-message-avatar-surface:#0a0b0c");
    expect(css).toMatch(/\.dark\)?[^{]*\{[^}]*--nck-message-avatar-surface:#0d0e0f/);
    expect(css).toContain("background-color:var(--nck-message-avatar-surface)");
  });

  it("marks the bubble by who spoke, taking it from the enclosing Message", () => {
    const { container } = render(
      <>
        <Message from="user">
          <Message.Content>hello</Message.Content>
        </Message>
        <Message>
          <Message.Content>hi</Message.Content>
        </Message>
      </>
    );
    expect(container.querySelector('[data-chat-bubble="user"]')).toHaveTextContent("hello");
    expect(container.querySelector('[data-chat-bubble="assistant"]')).toHaveTextContent("hi");
  });

  it("renders a string as markdown when asked and as given otherwise", () => {
    const { rerender } = render(<MessageContent markdown>{"**bold** text"}</MessageContent>);
    expect(screen.getByText("bold").tagName).toBe("STRONG");
    rerender(<MessageContent>{"**bold** text"}</MessageContent>);
    expect(screen.getByText("**bold** text")).toBeInTheDocument();
  });

  it("colours the bubbles from the tokens", () => {
    render(
      <ThemeProvider theme={createTheme()}>
        <ChatKitProvider tokens={{ light: { userBubble: "rgb(1, 2, 3)", userBubbleText: "rgb(4, 5, 6)" } }}>
          <Message from="user">
            <Message.Content>mine</Message.Content>
          </Message>
        </ChatKitProvider>
      </ThemeProvider>
    );
    const bubble = screen.getByText("mine");
    expect(getComputedStyle(bubble).backgroundColor).toBe("rgb(1, 2, 3)");
    expect(getComputedStyle(bubble).color).toBe("rgb(4, 5, 6)");
  });

  it("shows an action's tooltip on hover and keeps its control keyboard-reachable", async () => {
    const onCopy = vi.fn();
    render(
      <Message>
        <Message.Actions>
          <Message.Action tooltip="Copy">
            <button type="button" onClick={onCopy}>
              copy
            </button>
          </Message.Action>
        </Message.Actions>
      </Message>
    );
    const button = screen.getByRole("button", { name: "copy" });
    button.focus();
    expect(button).toHaveFocus();
    fireEvent.click(button);
    expect(onCopy).toHaveBeenCalledTimes(1);
    fireEvent.mouseOver(button);
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Copy");
  });
});
