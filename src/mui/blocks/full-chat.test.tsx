import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { FullChat, type FullChatStream } from "./full-chat";

function stream(overrides: Partial<FullChatStream> = {}): FullChatStream {
  return {
    messages: [],
    status: "idle",
    error: null,
    interrupt: null,
    followUps: [],
    turnActions: null,
    send: vi.fn(),
    stop: vi.fn(),
    retry: vi.fn(),
    resume: vi.fn(),
    ...overrides,
  };
}

const agent = { name: "Helper", initial: "H" };

describe("FullChat", () => {
  it("greets, fills the box from a starter and sends the draft", () => {
    const current = stream();
    render(<FullChat stream={current} agent={agent} greeting="Hi there" starters={["What can you do?"]} />);
    expect(screen.getByText("Hi there")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "What can you do?" }));
    const box = screen.getByRole("textbox");
    expect(box).toHaveValue("What can you do?");
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(current.send).toHaveBeenCalledWith("What can you do?");
    expect(box).toHaveValue("");
  });

  it("sends a follow-up on click", () => {
    const current = stream({
      messages: [
        { id: "u1", role: "user", text: "Hi" },
        { id: "a1", role: "assistant", text: "Hello" },
      ],
      followUps: ["Tell me more"],
    });
    render(<FullChat stream={current} agent={agent} />);
    fireEvent.click(screen.getByRole("button", { name: "Tell me more" }));
    expect(current.send).toHaveBeenCalledWith("Tell me more");
  });

  it("passes composer toggles through to the composer", () => {
    const onToggle = vi.fn();
    render(
      <FullChat
        stream={stream()}
        agent={agent}
        toggles={[{ id: "web", label: "Search the web", icon: null, active: false, onToggle }]}
      />,
    );
    const toggle = screen.getByRole("button", { name: "Search the web" });
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(toggle);
    expect(onToggle).toHaveBeenCalled();
  });

  it("shows the error with Retry, or the app's own action", () => {
    const current = stream({ error: "Connection failed" });
    const { rerender } = render(<FullChat stream={current} agent={agent} />);
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(current.retry).toHaveBeenCalledTimes(1);
    rerender(<FullChat stream={current} agent={agent} errorAction={<a href="/billing">Top up</a>} />);
    expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Top up" })).toBeInTheDocument();
  });

  it("swaps the composer for the interrupt card while the run waits on an answer", () => {
    const current = stream({
      status: "needs_input",
      interrupt: { kind: "ask_user", question: "Which date?" },
    });
    render(<FullChat stream={current} agent={agent} />);
    expect(screen.getByText("Which date?")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Send" })).not.toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("Your answer"), { target: { value: "Friday" } });
    fireEvent.click(screen.getByRole("button", { name: "Answer" }));
    expect(current.resume).toHaveBeenCalledWith("Friday");
  });

  it("shows Stop and hides the pills while a run is streaming", () => {
    const current = stream({
      status: "streaming",
      messages: [{ id: "u1", role: "user", text: "Hi" }],
      followUps: ["Tell me more"],
    });
    render(<FullChat stream={current} agent={agent} starters={["x"]} />);
    expect(screen.queryByRole("button", { name: "Tell me more" })).not.toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: "Stop" })[0]);
    expect(current.stop).toHaveBeenCalled();
  });

  it("adds the conversation list beside the chat when history is supplied", () => {
    const onSelect = vi.fn();
    render(
      <FullChat
        stream={stream()}
        agent={agent}
        history={{ items: [{ id: "c1", title: "Earlier chat" }], activeId: null, onSelect, onNew: vi.fn() }}
      />
    );
    fireEvent.click(screen.getByText("Earlier chat"));
    expect(onSelect).toHaveBeenCalledWith("c1");
  });

  it("draws the app's avatar instead of an initial when renderAvatar is given", () => {
    const renderAvatar = (size: number) => <span role="img" aria-label="Face" data-size={size} />;
    const { rerender } = render(<FullChat stream={stream()} agent={{ name: "Helper", initial: "" }} renderAvatar={renderAvatar} />);
    expect(screen.getByRole("img", { name: "Face" })).toHaveAttribute("data-size", "44");
    rerender(
      <FullChat
        stream={stream({ messages: [{ id: "a1", role: "assistant", text: "Hello" }] })}
        agent={{ name: "Helper", initial: "" }}
        renderAvatar={renderAvatar}
      />,
    );
    expect(screen.getByRole("img", { name: "Face" })).toHaveAttribute("data-size", "28");
  });

  it("renders with a column width and keeps the composer working", () => {
    const current = stream();
    render(<FullChat stream={current} agent={agent} columnMaxWidth={760} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Hello" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(current.send).toHaveBeenCalledWith("Hello");
  });

  it("shows a supplied emptyState instead of the greeting", () => {
    render(<FullChat stream={stream()} agent={agent} greeting="Hi there" emptyState={<h2>My hello</h2>} />);
    expect(screen.getByRole("heading", { name: "My hello" })).toBeInTheDocument();
    expect(screen.queryByText("Hi there")).toBeNull();
  });

  it("forwards the call props to the composer", () => {
    const onStartCall = vi.fn();
    render(<FullChat stream={stream()} agent={agent} onStartCall={onStartCall} callLabel="Call me" />);
    fireEvent.click(screen.getByRole("button", { name: "Call me" }));
    expect(onStartCall).toHaveBeenCalledTimes(1);
  });

  it("renders aboveComposer between the pills and the composer", () => {
    render(<FullChat stream={stream()} agent={agent} starters={["Pick me"]} columnMaxWidth={760} aboveComposer={<div data-testid="strip" />} />);
    const strip = screen.getByTestId("strip");
    const pill = screen.getByRole("button", { name: "Pick me" });
    const box = screen.getByRole("textbox");
    expect(pill.compareDocumentPosition(strip) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(strip.compareDocumentPosition(box) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("renders aboveComposer above the interrupt card too", () => {
    render(
      <FullChat
        stream={stream({ status: "needs_input", interrupt: { kind: "ask_user", question: "Which date?" } })}
        agent={agent}
        aboveComposer={<div data-testid="strip" />}
      />,
    );
    expect(screen.getByTestId("strip")).toBeInTheDocument();
    expect(document.querySelector('[data-chat="composer-wrap"]')).toBeNull();
    expect(screen.getByText("Which date?")).toBeInTheDocument();
  });
});
