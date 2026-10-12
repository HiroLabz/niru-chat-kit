import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { ChatHistorySidebar, type ChatHistoryItem, type SavedItem } from "./chat-history-sidebar";

const now = new Date(2026, 6, 15, 15, 0, 0);
const at = (days: number) => new Date(2026, 6, 15 - days, 9, 0, 0).toISOString();

const items: ChatHistoryItem[] = [
  { id: "a", title: "Refund policy", at: at(0) },
  { id: "b", title: "Weekly report", at: at(1), pinned: true },
  { id: "c", title: "Pricing ideas", at: at(5) },
  { id: "d", title: "Roadmap", at: at(8), pinned: true },
];

const saved: SavedItem[] = [
  { id: "s1", kind: "conversation", conversationId: "a", title: "Refund policy", at: at(3) },
  { id: "s2", kind: "message", conversationId: "c", messageId: "m9", title: "Pricing ideas", text: "Tiers start at nine dollars", at: at(1) },
  { id: "s3", kind: "message", conversationId: "b", messageId: "m2", title: "Weekly report", text: "Send it on Friday", at: at(0) },
];

function setup(props: Partial<Parameters<typeof ChatHistorySidebar>[0]> = {}) {
  return render(
    <ChatHistorySidebar items={items} activeId={null} onSelect={vi.fn()} onNew={vi.fn()} now={now} {...props} />
  );
}

afterEach(() => {
  vi.useRealTimers();
});

describe("ChatHistorySidebar pin", () => {
  it("shows nothing new without the new props", () => {
    setup({ items: items.map(({ id, title, at: when }) => ({ id, title, at: when })), grouped: true });
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
    expect(screen.queryByText("Pinned")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Options for/ })).not.toBeInTheDocument();
  });

  it("adds Pin or Unpin to the row menu and reports the value asked for", () => {
    const onPin = vi.fn();
    setup({ onPin });
    fireEvent.click(screen.getByRole("button", { name: "Options for Refund policy" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Pin" }));
    expect(onPin).toHaveBeenCalledWith("a", true);
    fireEvent.click(screen.getByRole("button", { name: "Options for Weekly report" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Unpin" }));
    expect(onPin).toHaveBeenLastCalledWith("b", false);
  });

  it("draws a Pinned group above the date groups, in the listed order", () => {
    setup({ grouped: true });
    const pinned = screen.getByRole("list", { name: "Pinned" });
    expect(within(pinned).getAllByRole("button").map((b) => b.textContent)).toEqual(["Weekly reportyesterday", "Roadmap8 days ago"]);
    const lists = screen.getAllByRole("list").map((list) => list.getAttribute("aria-label"));
    expect(lists.indexOf("Pinned")).toBeLessThan(lists.indexOf("Today"));
    expect(screen.queryByRole("list", { name: "Yesterday" })).not.toBeInTheDocument();
  });

  it("puts pinned first without a heading when grouping is off", () => {
    setup();
    expect(screen.queryByText("Pinned")).not.toBeInTheDocument();
    const names = screen.getAllByRole("button").map((b) => b.textContent ?? "");
    expect(names[1]).toContain("Weekly report");
    expect(names[2]).toContain("Roadmap");
    expect(names[3]).toContain("Refund policy");
  });

  it("takes the group name from labels", () => {
    setup({ grouped: true, labels: { pinnedGroup: "Vastgezet" } });
    expect(screen.getByRole("list", { name: "Vastgezet" })).toBeInTheDocument();
  });
});

describe("ChatHistorySidebar saved tab", () => {
  it("adds the Chats and Saved tabs only when saved is given", () => {
    setup({ saved });
    expect(screen.getByRole("tab", { name: "Chats", selected: true })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Saved", selected: false })).toBeInTheDocument();
    expect(screen.getByText("Refund policy")).toBeInTheDocument();
  });

  it("lists saved items newest first with their kind, title, preview and age", () => {
    setup({ saved });
    fireEvent.click(screen.getByRole("tab", { name: "Saved" }));
    const list = screen.getByRole("list", { name: "Saved" });
    const rows = within(list).getAllByRole("listitem");
    expect(rows.map((row) => row.getAttribute("data-saved-id"))).toEqual(["s3", "s2", "s1"]);
    expect(within(rows[0]).getByText("Send it on Friday")).toBeInTheDocument();
    expect(within(rows[0]).getByTitle("Saved message")).toBeInTheDocument();
    expect(within(rows[0]).getByText(/ago$/)).toBeInTheDocument();
    expect(within(rows[2]).getByTitle("Saved chat")).toBeInTheDocument();
    expect(within(rows[2]).queryByText("Send it on Friday")).not.toBeInTheDocument();
    expect(screen.queryByText("Weekly report1 day ago")).not.toBeInTheDocument();
  });

  it("moves between tabs with the arrow keys", () => {
    setup({ saved });
    const chats = screen.getByRole("tab", { name: "Chats" });
    chats.focus();
    fireEvent.keyDown(chats, { key: "ArrowRight" });
    expect(screen.getByRole("tab", { name: "Saved" })).toHaveAttribute("aria-selected", "true");
  });

  it("works controlled with tab and onTabChange", () => {
    const onTabChange = vi.fn();
    const { rerender } = setup({ saved, tab: "chats", onTabChange });
    fireEvent.click(screen.getByRole("tab", { name: "Saved" }));
    expect(onTabChange).toHaveBeenCalledWith("saved");
    expect(screen.getByRole("tab", { name: "Chats" })).toHaveAttribute("aria-selected", "true");
    rerender(
      <ChatHistorySidebar items={items} activeId={null} onSelect={vi.fn()} onNew={vi.fn()} now={now} saved={saved} tab="saved" />
    );
    expect(screen.getByRole("tab", { name: "Saved" })).toHaveAttribute("aria-selected", "true");
  });

  it("reports the picked item, and removes from saved from the row menu without a confirm", () => {
    const onOpenSaved = vi.fn();
    const onUnsave = vi.fn();
    setup({ saved, onOpenSaved, onUnsave });
    fireEvent.click(screen.getByRole("tab", { name: "Saved" }));
    fireEvent.click(screen.getByText("Tiers start at nine dollars"));
    expect(onOpenSaved).toHaveBeenCalledWith(saved[1]);
    fireEvent.click(screen.getByRole("button", { name: "Options for Pricing ideas" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Remove from saved" }));
    expect(onUnsave).toHaveBeenCalledWith(saved[1]);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("has no row menu without onUnsave, and says when nothing is saved", () => {
    const { unmount } = setup({ saved });
    fireEvent.click(screen.getByRole("tab", { name: "Saved" }));
    expect(screen.queryByRole("button", { name: /Options for/ })).not.toBeInTheDocument();
    unmount();
    setup({ saved: [] });
    fireEvent.click(screen.getByRole("tab", { name: "Saved" }));
    expect(screen.getByText("Nothing saved yet.")).toBeInTheDocument();
  });

  it("searches the active tab: titles and message text in Saved", () => {
    setup({ saved, searchable: true });
    const box = screen.getByRole("searchbox", { name: "Search conversations" });
    fireEvent.change(box, { target: { value: "friday" } });
    expect(screen.queryByText("Refund policy")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Saved" }));
    expect(screen.getByText("Send it on Friday")).toBeInTheDocument();
    expect(screen.queryByText("Tiers start at nine dollars")).not.toBeInTheDocument();
    fireEvent.change(box, { target: { value: "zzz" } });
    expect(screen.getByText("No conversations match your search.")).toBeInTheDocument();
  });

  it("takes its words from labels", () => {
    setup({ saved, labels: { chatsTab: "Gesprekken", savedTab: "Bewaard", savedAt: (when) => `Bewaard ${when}` } });
    expect(screen.getByRole("tab", { name: "Gesprekken" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Bewaard" }));
    expect(screen.getAllByText(/^Bewaard /).length).toBeGreaterThan(0);
  });
});

describe("ChatHistorySidebar highlight", () => {
  it("flashes the row when highlightId changes, then stops", () => {
    vi.useFakeTimers();
    const { rerender } = setup({ highlightId: undefined });
    const row = () => document.querySelector('[data-chat-history-id="c"]');
    expect(row()).not.toHaveAttribute("data-highlighted");
    rerender(
      <ChatHistorySidebar items={items} activeId={null} onSelect={vi.fn()} onNew={vi.fn()} now={now} highlightId="c" />
    );
    expect(row()).toHaveAttribute("data-highlighted", "true");
    act(() => {
      vi.advanceTimersByTime(2600);
    });
    expect(row()).not.toHaveAttribute("data-highlighted");
  });

  it("does not flash while the Saved tab is open", () => {
    setup({ saved, highlightId: "c", tab: "saved" });
    expect(document.querySelector("[data-highlighted]")).toBeNull();
  });
});
