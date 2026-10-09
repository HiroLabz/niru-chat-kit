import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { FEEDBACK_COPY, TURN_ACTION_COPY } from "../../core/stream/turn-copy";
import type { ChatMessage, ChatTurnActions } from "../../core/types";
import { TurnActions } from "./turn-actions";

const reply: ChatMessage = { id: "a1", serverId: "s-a1", role: "assistant", text: "The **answer**" };
const question: ChatMessage = { id: "u1", serverId: "s-u1", role: "user", text: "Why?" };

function actions(overrides: Partial<ChatTurnActions> = {}): ChatTurnActions {
  return { disabled: false, ...overrides };
}

describe("TurnActions", () => {
  it("shows no control for a handler the surface did not supply", () => {
    const { container } = render(<TurnActions message={reply} actions={actions()} onStartEdit={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows every control whose handler is supplied, and only those", () => {
    render(
      <TurnActions
        message={reply}
        actions={actions({
          onCopy: vi.fn().mockResolvedValue(undefined),
          onRegenerate: vi.fn(),
          onFeedback: vi.fn().mockResolvedValue(undefined),
        })}
        onStartEdit={vi.fn()}
      />
    );
    expect(screen.getByRole("button", { name: TURN_ACTION_COPY.copy })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: TURN_ACTION_COPY.regenerate })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: FEEDBACK_COPY.up })).toBeInTheDocument();
    expect(screen.queryByTestId("sibling-switcher")).not.toBeInTheDocument();
  });

  it("copies the markdown source of the answer and confirms", async () => {
    const onCopy = vi.fn().mockResolvedValue(undefined);
    render(<TurnActions message={reply} actions={actions({ onCopy })} onStartEdit={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: TURN_ACTION_COPY.copy }));
    expect(onCopy).toHaveBeenCalledWith("The **answer**");
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(TURN_ACTION_COPY.copied));
  });

  it("says so when the copy is refused", async () => {
    const onCopy = vi.fn().mockRejectedValue(new Error("denied"));
    render(<TurnActions message={reply} actions={actions({ onCopy })} onStartEdit={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: TURN_ACTION_COPY.copy }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(TURN_ACTION_COPY.copyFailed));
  });

  it("offers Copy on a settled reply with text even without a server id, and nothing that needs one", () => {
    const local: ChatMessage = { id: "a2", role: "assistant", text: "Local reply" };
    render(
      <TurnActions
        message={local}
        actions={actions({
          onCopy: vi.fn().mockResolvedValue(undefined),
          onRegenerate: vi.fn(),
          onFeedback: vi.fn().mockResolvedValue(undefined),
        })}
        onStartEdit={vi.fn()}
      />
    );
    expect(screen.getByRole("button", { name: TURN_ACTION_COPY.copy })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: TURN_ACTION_COPY.regenerate })).toBeNull();
    expect(screen.queryByRole("button", { name: FEEDBACK_COPY.up })).toBeNull();
  });

  it("shows no Copy without a server id when the reply has no text or is still pending", () => {
    const onCopy = vi.fn().mockResolvedValue(undefined);
    const { container, rerender } = render(
      <TurnActions message={{ id: "a3", role: "assistant", text: "" }} actions={actions({ onCopy })} onStartEdit={vi.fn()} />
    );
    expect(container).toBeEmptyDOMElement();
    rerender(
      <TurnActions
        message={{ id: "a4", role: "assistant", text: "partial", pending: true }}
        actions={actions({ onCopy })}
        onStartEdit={vi.fn()}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("regenerates by the server id, and is disabled while a run is busy", () => {
    const onRegenerate = vi.fn();
    const { rerender } = render(
      <TurnActions message={reply} actions={actions({ onRegenerate })} onStartEdit={vi.fn()} />
    );
    fireEvent.click(screen.getByRole("button", { name: TURN_ACTION_COPY.regenerate }));
    expect(onRegenerate).toHaveBeenCalledWith("s-a1");
    rerender(<TurnActions message={reply} actions={actions({ onRegenerate, disabled: true })} onStartEdit={vi.fn()} />);
    expect(screen.getByRole("button", { name: TURN_ACTION_COPY.regenerate })).toBeDisabled();
  });

  it("steps between versions with the switcher", () => {
    const onSwitchBranch = vi.fn();
    render(
      <TurnActions
        message={{ ...reply, siblingIds: ["s-a0", "s-a1", "s-a2"], siblingIndex: 1 }}
        actions={actions({ onSwitchBranch })}
        onStartEdit={vi.fn()}
      />
    );
    expect(screen.getByText("2 / 3")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: TURN_ACTION_COPY.previous }));
    expect(onSwitchBranch).toHaveBeenLastCalledWith("s-a0");
    fireEvent.click(screen.getByRole("button", { name: TURN_ACTION_COPY.next }));
    expect(onSwitchBranch).toHaveBeenLastCalledWith("s-a2");
  });

  it("rates a reply and marks the chosen thumb once the server has it", async () => {
    const onFeedback = vi.fn().mockResolvedValue(undefined);
    render(<TurnActions message={reply} actions={actions({ onFeedback })} onStartEdit={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: FEEDBACK_COPY.up }));
    expect(onFeedback).toHaveBeenCalledWith("s-a1", "up");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: FEEDBACK_COPY.up })).toHaveAttribute("aria-pressed", "true")
    );
  });

  it("offers Edit on a question, not Copy or thumbs", () => {
    const onStartEdit = vi.fn();
    render(
      <TurnActions
        message={question}
        actions={actions({ onEdit: vi.fn(), onCopy: vi.fn(), onFeedback: vi.fn() })}
        onStartEdit={onStartEdit}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: TURN_ACTION_COPY.edit }));
    expect(onStartEdit).toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: TURN_ACTION_COPY.copy })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: FEEDBACK_COPY.up })).not.toBeInTheDocument();
  });

  it("shows nothing for a turn still running, or a question the server has no id for yet", () => {
    const handlers = actions({ onCopy: vi.fn(), onRegenerate: vi.fn() });
    const { container, rerender } = render(
      <TurnActions message={{ ...question, serverId: undefined }} actions={handlers} onStartEdit={vi.fn()} />
    );
    expect(container).toBeEmptyDOMElement();
    rerender(<TurnActions message={{ ...reply, pending: true }} actions={handlers} onStartEdit={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });
});
