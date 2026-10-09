import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ChatHistorySidebar, type ChatHistoryItem } from "./chat-history-sidebar";

const items: ChatHistoryItem[] = [
  { id: "c1", title: "Refund policy", at: new Date(Date.now() - 3 * 3_600_000).toISOString() },
  { id: "c2", preview: "How do I reset my password", at: null },
  { id: "c3" },
];

function matchMedia(matches: boolean) {
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

afterEach(() => {
  Reflect.deleteProperty(window, "matchMedia");
});

describe("ChatHistorySidebar", () => {
  it("lists conversations by title, then preview, then a fallback, with relative time", () => {
    render(<ChatHistorySidebar items={items} activeId="c1" onSelect={vi.fn()} onNew={vi.fn()} />);
    expect(screen.getByText("Refund policy")).toBeInTheDocument();
    expect(screen.getByText("How do I reset my password")).toBeInTheDocument();
    expect(screen.getByText("New conversation")).toBeInTheDocument();
    expect(screen.getByText(/3 hours ago/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Refund policy/ })).toHaveClass("Mui-selected");
  });

  it("selects a conversation and starts a new chat", () => {
    const onSelect = vi.fn();
    const onNew = vi.fn();
    render(<ChatHistorySidebar items={items} activeId={null} onSelect={onSelect} onNew={onNew} />);
    fireEvent.click(screen.getByText("Refund policy"));
    expect(onSelect).toHaveBeenCalledWith("c1");
    fireEvent.click(screen.getByRole("button", { name: "New chat" }));
    expect(onNew).toHaveBeenCalledTimes(1);
  });

  it("shows who the history belongs to", () => {
    render(
      <ChatHistorySidebar
        items={[]}
        activeId={null}
        onSelect={vi.fn()}
        onNew={vi.fn()}
        identity={{ name: "Support agent", initial: "S", subtitle: "Online" }}
      />
    );
    expect(screen.getByText("Support agent")).toBeInTheDocument();
    expect(screen.getByText("Online")).toBeInTheDocument();
  });

  it("loads more only when there is more and the app can", () => {
    const onLoadMore = vi.fn();
    const { rerender } = render(
      <ChatHistorySidebar items={items} activeId={null} onSelect={vi.fn()} onNew={vi.fn()} hasMore onLoadMore={onLoadMore} />
    );
    fireEvent.click(screen.getByRole("button", { name: "Load more" }));
    expect(onLoadMore).toHaveBeenCalledTimes(1);
    rerender(<ChatHistorySidebar items={items} activeId={null} onSelect={vi.fn()} onNew={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Load more" })).not.toBeInTheDocument();
  });

  it("folds behind a Conversations button on a narrow screen and closes after a choice", () => {
    matchMedia(true);
    const onSelect = vi.fn();
    render(<ChatHistorySidebar items={items} activeId={null} onSelect={onSelect} onNew={vi.fn()} />);
    expect(screen.queryByText("Refund policy")).not.toBeInTheDocument();
    const toggle = screen.getByRole("button", { name: "Conversations" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(toggle);
    fireEvent.click(screen.getByText("Refund policy"));
    expect(onSelect).toHaveBeenCalledWith("c1");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  it("stays open as a column on a wide screen", () => {
    matchMedia(false);
    render(<ChatHistorySidebar items={items} activeId={null} onSelect={vi.fn()} onNew={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Conversations" })).not.toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Conversations" })).toBeInTheDocument();
  });
});
