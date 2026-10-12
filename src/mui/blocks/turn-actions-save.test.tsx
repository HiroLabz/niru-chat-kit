import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { TURN_ACTION_COPY } from "../../core/stream/turn-copy";
import type { ChatMessage, ChatTurnActions } from "../../core/types";
import { TurnActions } from "./turn-actions";

const reply: ChatMessage = { id: "a1", serverId: "s-a1", role: "assistant", text: "The answer" };
const question: ChatMessage = { id: "u1", serverId: "s-u1", role: "user", text: "Why?" };
const base: ChatTurnActions = { disabled: false, onCopy: vi.fn().mockResolvedValue(undefined), onRegenerate: vi.fn() };

describe("TurnActions Save", () => {
  it("shows no Save control unless onSave is supplied", () => {
    render(<TurnActions message={reply} actions={{ ...base, isSaved: () => true }} onStartEdit={vi.fn()} />);
    expect(screen.queryByRole("button", { name: TURN_ACTION_COPY.save })).not.toBeInTheDocument();
  });

  it("shows a bookmark toggle after Copy that reports the message", () => {
    const onSave = vi.fn();
    render(<TurnActions message={reply} actions={{ ...base, onSave }} onStartEdit={vi.fn()} />);
    const buttons = screen.getAllByRole("button").map((b) => b.getAttribute("aria-label"));
    expect(buttons.indexOf(TURN_ACTION_COPY.save)).toBe(buttons.indexOf(TURN_ACTION_COPY.copy) + 1);
    const save = screen.getByRole("button", { name: TURN_ACTION_COPY.save });
    expect(save).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(save);
    expect(onSave).toHaveBeenCalledWith(reply);
  });

  it("shows it pressed when isSaved says so", () => {
    render(<TurnActions message={reply} actions={{ ...base, onSave: vi.fn(), isSaved: (m) => m.id === "a1" }} onStartEdit={vi.fn()} />);
    expect(screen.getByRole("button", { name: TURN_ACTION_COPY.save })).toHaveAttribute("aria-pressed", "true");
  });

  it("works on a reply without a server id, and is left off user messages", () => {
    const local: ChatMessage = { id: "a2", role: "assistant", text: "Local" };
    const { unmount } = render(<TurnActions message={local} actions={{ disabled: false, onSave: vi.fn() }} onStartEdit={vi.fn()} />);
    expect(screen.getByRole("button", { name: TURN_ACTION_COPY.save })).toBeInTheDocument();
    unmount();
    render(<TurnActions message={question} actions={{ ...base, onSave: vi.fn() }} onStartEdit={vi.fn()} />);
    expect(screen.queryByRole("button", { name: TURN_ACTION_COPY.save })).not.toBeInTheDocument();
  });
});
