import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ChatHistorySidebar } from "./chat-history-sidebar";

const items = [{ id: "c1", title: "Refund policy" }];

afterEach(() => {
  Reflect.deleteProperty(window, "matchMedia");
});

function narrow(matches: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
    onchange: null,
  }));
}

describe("ChatHistorySidebar as a drawer on a narrow screen", () => {
  it("opens the list in a drawer from the Conversations button, not in the page flow", () => {
    narrow(true);
    render(<ChatHistorySidebar items={items} activeId={null} onSelect={vi.fn()} onNew={vi.fn()} />);
    expect(screen.queryByTestId("chat-history-drawer")).not.toBeInTheDocument();
    const button = screen.getByRole("button", { name: "Conversations" });
    expect(button).toHaveAttribute("aria-haspopup", "dialog");
    fireEvent.click(button);
    const drawer = screen.getByTestId("chat-history-drawer");
    expect(drawer).toHaveTextContent("Refund policy");
    expect(screen.getByTestId("chat-history-collapsed").contains(drawer)).toBe(false);
    expect(screen.getByRole("dialog", { name: "Conversations" })).toBeInTheDocument();
  });

  it("closes the drawer on Escape and after New chat", () => {
    narrow(true);
    const onNew = vi.fn();
    render(<ChatHistorySidebar items={items} activeId={null} onSelect={vi.fn()} onNew={onNew} />);
    const button = screen.getByRole("button", { name: "Conversations" });
    fireEvent.click(button);
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(button).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(button);
    fireEvent.click(screen.getByRole("button", { name: "New chat" }));
    expect(onNew).toHaveBeenCalled();
    expect(button).toHaveAttribute("aria-expanded", "false");
  });

  it("honours collapseBelow: a wide screen keeps the column", () => {
    narrow(false);
    render(<ChatHistorySidebar items={items} activeId={null} onSelect={vi.fn()} onNew={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Conversations" })).not.toBeInTheDocument();
  });
});
