import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ConversationHeader } from "./conversation-header";

describe("ConversationHeader", () => {
  it("shows only the title when nothing else is supplied", () => {
    render(<ConversationHeader title="Refund policy" />);
    expect(screen.getByRole("heading", { name: "Refund policy" })).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("toggles pin and save with aria-pressed and reports the value asked for", () => {
    const onPinChange = vi.fn();
    const onSaveChange = vi.fn();
    const { rerender } = render(
      <ConversationHeader title="T" onPinChange={onPinChange} onSaveChange={onSaveChange} />
    );
    const pin = screen.getByRole("button", { name: "Pin chat" });
    const save = screen.getByRole("button", { name: "Save chat" });
    expect(pin).toHaveAttribute("aria-pressed", "false");
    expect(save).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(pin);
    fireEvent.click(save);
    expect(onPinChange).toHaveBeenCalledWith(true);
    expect(onSaveChange).toHaveBeenCalledWith(true);
    rerender(<ConversationHeader title="T" pinned saved onPinChange={onPinChange} onSaveChange={onSaveChange} />);
    expect(screen.getByRole("button", { name: "Pin chat" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Save chat" }));
    expect(onSaveChange).toHaveBeenLastCalledWith(false);
  });

  it("says Save chat, then Saved, in the tooltip", async () => {
    const { rerender } = render(<ConversationHeader title="T" onSaveChange={vi.fn()} />);
    fireEvent.mouseOver(screen.getByRole("button", { name: "Save chat" }));
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Save chat");
    rerender(<ConversationHeader title="T" saved onSaveChange={vi.fn()} />);
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Saved");
  });

  it("draws the actions slot and takes labels", () => {
    render(<ConversationHeader title="T" actions={<button>Share</button>} onSaveChange={vi.fn()} labels={{ save: "Bewaar" }} />);
    expect(screen.getByRole("button", { name: "Share" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Bewaar" })).toBeInTheDocument();
  });
});
