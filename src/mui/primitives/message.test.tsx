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
