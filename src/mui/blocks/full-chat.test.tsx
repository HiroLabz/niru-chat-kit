import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
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

  it("sends a starter at once when sendStarters is on", () => {
    const current = stream();
    render(<FullChat stream={current} agent={agent} starters={["What can you do?"]} sendStarters />);
    fireEvent.click(screen.getByRole("button", { name: "What can you do?" }));
    expect(current.send).toHaveBeenCalledWith("What can you do?");
    expect(screen.getByRole("textbox")).toHaveValue("");
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

  it("asks a question as a card in the thread and keeps the composer", () => {
    const current = stream({
      status: "needs_input",
      messages: [{ id: "a1", role: "assistant", text: "I need one detail first." }],
      interrupt: { kind: "ask_user", question: "Which date?" },
    });
    render(<FullChat stream={current} agent={agent} />);
    expect(screen.getByText("One detail before I continue")).toBeInTheDocument();
    expect(screen.getByText("Which date?")).toBeInTheDocument();
    expect(screen.getByText("Answer in the message box below")).toBeInTheDocument();
    expect(screen.getByText("Answering: Which date?")).toBeInTheDocument();
    expect(screen.queryByText("Waiting for your answer")).not.toBeInTheDocument();
    expect(screen.getByRole("textbox")).toHaveFocus();
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Friday" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(current.resume).toHaveBeenCalledWith("Friday");
    expect(current.send).not.toHaveBeenCalled();
  });

  it("answers with a tapped suggestion, and 'Something else' focuses the composer", () => {
    vi.useFakeTimers();
    try {
      const current = stream({
        status: "needs_input",
        messages: [{ id: "a1", role: "assistant", text: "Hold on." }],
        interrupt: { kind: "clarify", question: "Where?", options: ["Cebu City", "Mactan"] },
      });
      render(<FullChat stream={current} agent={agent} decideAnswer="Use your judgement" />);
      expect(screen.getByRole("textbox")).not.toHaveFocus();
      fireEvent.click(screen.getByRole("button", { name: /Something else/ }));
      expect(screen.getByRole("textbox")).toHaveFocus();
      fireEvent.click(screen.getByRole("button", { name: /Mactan/ }));
      act(() => void vi.advanceTimersByTime(400));
      expect(current.resume).toHaveBeenCalledWith("Mactan");
    } finally {
      vi.useRealTimers();
    }
  });

  it("answers with the decide phrase when the app supplies one", () => {
    const current = stream({
      status: "needs_input",
      interrupt: { kind: "clarify", question: "Where?", options: ["Cebu City"] },
    });
    render(<FullChat stream={current} agent={agent} decideAnswer="Use your judgement" />);
    fireEvent.click(screen.getByRole("button", { name: "Let the agent decide" }));
    expect(current.resume).toHaveBeenCalledWith("Use your judgement");
  });

  it("resumes once for one question, however many answers arrive", () => {
    const current = stream({
      status: "needs_input",
      interrupt: { kind: "ask_user", question: "Which date?" },
    });
    render(<FullChat stream={current} agent={agent} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Friday" } });
    const send = screen.getByRole("button", { name: "Send" });
    act(() => {
      fireEvent.click(send);
      fireEvent.click(send);
      fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" });
    });
    expect(current.resume).toHaveBeenCalledTimes(1);
  });

  it("folds the answered question in the thread", () => {
    const current = stream({
      status: "streaming",
      messages: [
        { id: "a1", role: "assistant", text: "Hold on." },
        { id: "u2", role: "user", text: "Mactan", answersQuestion: { question: "Where?" } },
      ],
    });
    render(<FullChat stream={current} agent={agent} />);
    expect(screen.getByText("Mactan").tagName).toBe("B");
    expect(screen.queryByRole("button", { name: "Change" })).not.toBeInTheDocument();
  });

  it("keeps the approval card and panel exactly as they were", () => {
    const current = stream({
      status: "needs_input",
      interrupt: { kind: "tool_approval", question: "Approve the refund?", options: [], actions: [], can_edit: false, fields: [] },
    });
    render(<FullChat stream={current} agent={agent} />);
    expect(screen.getByText("Approval needed")).toBeInTheDocument();
    expect(screen.queryByText("One detail before I continue")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Send" })).not.toBeInTheDocument();
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
        stream={stream({ status: "needs_input", interrupt: { kind: "tool_approval", question: "Which date?", options: [] } })}
        agent={agent}
        aboveComposer={<div data-testid="strip" />}
      />,
    );
    expect(screen.getByTestId("strip")).toBeInTheDocument();
    expect(document.querySelector('[data-chat="composer-wrap"]')).toBeNull();
    expect(screen.getByText("Which date?")).toBeInTheDocument();
  });
});
