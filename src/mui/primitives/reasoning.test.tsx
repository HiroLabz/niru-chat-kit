import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Reasoning } from "./reasoning";

function Panel({
  isStreaming,
  open,
  onOpenChange,
}: {
  isStreaming?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  return (
    <Reasoning isStreaming={isStreaming} open={open} onOpenChange={onOpenChange}>
      <Reasoning.Trigger>Reasoning</Reasoning.Trigger>
      <Reasoning.Content>Thought content</Reasoning.Content>
    </Reasoning>
  );
}

describe("Reasoning", () => {
  it("is open while streaming", () => {
    render(<Panel isStreaming />);
    expect(screen.getByText("Thought content")).toBeInTheDocument();
  });

  it("closes once streaming turns false", async () => {
    const { rerender } = render(<Panel isStreaming />);
    expect(screen.getByText("Thought content")).toBeInTheDocument();

    rerender(<Panel isStreaming={false} />);
    // `Collapse` animates the exit, so the content leaves the DOM once that settles.
    await waitFor(() => expect(screen.queryByText("Thought content")).not.toBeInTheDocument());
  });

  it("respects a user toggle made during streaming once streaming ends", async () => {
    const { rerender } = render(<Panel isStreaming />);

    // The user closes it, then reopens it, while still streaming.
    fireEvent.click(screen.getByText("Reasoning"));
    fireEvent.click(screen.getByText("Reasoning"));
    expect(screen.getByText("Thought content")).toBeInTheDocument();

    rerender(<Panel isStreaming={false} />);
    // Left open by the user's own last action, not force-collapsed.
    await waitFor(() => expect(screen.getByText("Thought content")).toBeInTheDocument());
  });

  it("re-opens on a fresh streaming turn even after a prior auto-collapse", async () => {
    const { rerender } = render(<Panel isStreaming />);
    rerender(<Panel isStreaming={false} />);
    await waitFor(() => expect(screen.queryByText("Thought content")).not.toBeInTheDocument());

    rerender(<Panel isStreaming />);
    expect(screen.getByText("Thought content")).toBeInTheDocument();
  });

  it("calls onOpenChange instead of managing its own state when controlled", () => {
    const onOpenChange = vi.fn();
    render(<Panel isStreaming open={false} onOpenChange={onOpenChange} />);

    fireEvent.click(screen.getByText("Reasoning"));
    expect(onOpenChange).toHaveBeenCalledWith(true);
    // Controlled: the caller's `open` prop still wins until it is updated.
    expect(screen.queryByText("Thought content")).not.toBeInTheDocument();
  });

  it("throws the documented error when a part renders outside the provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Reasoning.Content>x</Reasoning.Content>)).toThrow(
      "Reasoning parts must be used inside <Reasoning>"
    );
    spy.mockRestore();
  });
});
