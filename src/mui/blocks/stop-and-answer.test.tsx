import { describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import type { ChatMessage } from "../../core/types";
import { ChatKitProvider } from "../theme";
import { Composer } from "./composer";
import { Conversation } from "./conversation";
import { AnswerBox } from "./answer-box";

function Box({ running, onStop }: { running: boolean; onStop: () => void }) {
  const [value, setValue] = useState("");
  return <Composer value={value} onChange={setValue} onSubmit={vi.fn()} running={running} onStop={onStop} />;
}

describe("Stop in place of Send while a turn runs (owner: Stop sat on the left of the chat)", () => {
  it("shows Stop while the box is empty, and Send again once the person types to steer", () => {
    const onStop = vi.fn();
    render(<Box running onStop={onStop} />);
    fireEvent.click(screen.getByRole("button", { name: "Stop" }));
    expect(onStop).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: "Send" })).toBeNull();
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "also check pricing" } });
    expect(screen.getByRole("button", { name: "Send" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: "Stop" })).toBeNull();
  });

  it("is a filled red circle in the slot Send uses, never beside Send", () => {
    const theme = createTheme();
    const inBar = (value: string) => {
      const view = render(
        <ThemeProvider theme={theme}>
          <ChatKitProvider>
            <Composer value={value} onChange={vi.fn()} onSubmit={vi.fn()} running onStop={vi.fn()} />
          </ChatKitProvider>
        </ThemeProvider>,
      );
      const buttons = [...view.container.querySelectorAll('[data-chat="composer-bar"] button')];
      const last = buttons.at(-1) as HTMLElement;
      const color = getComputedStyle(last).backgroundColor;
      const stops = screen.queryAllByRole("button", { name: "Stop" }).length;
      const sends = screen.queryAllByRole("button", { name: "Send" }).length;
      const labelled = last.getAttribute("aria-label");
      const part = last.getAttribute("data-chat");
      const index = buttons.length;
      view.unmount();
      return { labelled, part, color, stops, sends, index };
    };
    const stop = inBar("");
    const send = inBar("steer");
    expect(stop).toMatchObject({ labelled: "Stop", part: "stop", stops: 1, sends: 0 });
    expect(send).toMatchObject({ labelled: "Send", part: "send", stops: 0, sends: 1 });
    expect(stop.index).toBe(send.index);
    const probe = document.createElement("div");
    probe.style.backgroundColor = theme.palette.error.main;
    document.body.append(probe);
    expect(stop.color).toBe(getComputedStyle(probe).backgroundColor);
    probe.remove();
  });

  it("is Send when nothing runs", () => {
    render(<Box running={false} onStop={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Send" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Stop" })).toBeNull();
  });

  it("the transcript keeps Thinking but drops its Stop link when asked to", () => {
    const messages = [{ id: "u1", role: "user", text: "Hello" }] as ChatMessage[];
    const { rerender } = render(<Conversation messages={messages} typing onStop={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Stop" })).toBeInTheDocument();
    rerender(<Conversation messages={messages} typing onStop={vi.fn()} stopInTranscript={false} />);
    expect(screen.queryByRole("button", { name: "Stop" })).toBeNull();
    expect(screen.getByText("Thinking")).toBeInTheDocument();
  });
});

describe("the answer box of a question (owner: the field was too small to answer in)", () => {
  function Form({ onSubmit }: { onSubmit: () => void }) {
    const [value, setValue] = useState("");
    return (
      <ChatKitProvider>
        <form onSubmit={(event) => { event.preventDefault(); onSubmit(); }}>
          <AnswerBox value={value} onChange={setValue} />
        </form>
      </ChatKitProvider>
    );
  }

  it("is several lines tall, Shift+Enter starts a new line, Enter answers", () => {
    const onSubmit = vi.fn();
    render(<Form onSubmit={onSubmit} />);
    const box = screen.getByRole("textbox", { name: "Your answer" }) as HTMLTextAreaElement;
    expect(box.tagName).toBe("TEXTAREA");
    expect(Number(box.getAttribute("rows") ?? 3)).toBeGreaterThanOrEqual(3);
    fireEvent.change(box, { target: { value: "First line" } });
    fireEvent.keyDown(box, { key: "Enter", shiftKey: true });
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.keyDown(box, { key: "Enter" });
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
