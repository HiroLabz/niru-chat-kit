import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { ChatHistorySidebar, type ChatHistoryItem } from "./chat-history-sidebar";

const now = new Date(2026, 6, 15, 15, 0, 0);
const at = (days: number) => new Date(2026, 6, 15 - days, 9, 0, 0).toISOString();

const items: ChatHistoryItem[] = [
  { id: "a", title: "Refund policy", preview: "how long do refunds take", at: at(0) },
  { id: "b", title: "Weekly report", at: at(1) },
  { id: "c", title: "Pricing ideas", preview: "REFUND tiers", at: at(5) },
  { id: "d", title: "Old chat", at: at(90) },
  { id: "e", title: "No date" },
];

function setup(props: Partial<Parameters<typeof ChatHistorySidebar>[0]> = {}) {
  return render(
    <ChatHistorySidebar items={items} activeId={null} onSelect={vi.fn()} onNew={vi.fn()} now={now} {...props} />
  );
}

describe("ChatHistorySidebar search", () => {
  it("has no search box and no groups by default", () => {
    setup();
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
    expect(screen.queryByText("Today")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Options for/ })).not.toBeInTheDocument();
  });

  it("filters by title and preview, ignoring case, and says when nothing matches", () => {
    setup({ searchable: true });
    const box = screen.getByRole("searchbox", { name: "Search conversations" });
    fireEvent.change(box, { target: { value: "refund" } });
    expect(screen.getByText("Refund policy")).toBeInTheDocument();
    expect(screen.getByText("Pricing ideas")).toBeInTheDocument();
    expect(screen.queryByText("Weekly report")).not.toBeInTheDocument();
    fireEvent.change(box, { target: { value: "zzz" } });
    expect(screen.getByText("No conversations match your search.")).toBeInTheDocument();
  });
});

describe("ChatHistorySidebar groups", () => {
  it("groups by age against the injected time, with undated chats in Older", () => {
    setup({ grouped: true });
    const groups = ["Today", "Yesterday", "Previous 7 days", "Older"];
    for (const name of groups) expect(screen.getByText(name)).toBeInTheDocument();
    expect(screen.queryByText("Previous 30 days")).not.toBeInTheDocument();
    const older = screen.getByRole("list", { name: "Older" });
    expect(within(older).getByText("Old chat")).toBeInTheDocument();
    expect(within(older).getByText("No date")).toBeInTheDocument();
    expect(within(screen.getByRole("list", { name: "Today" })).getByText("Refund policy")).toBeInTheDocument();
  });

  it("takes group names from labels", () => {
    setup({ grouped: true, labels: { today: "Vandaag", newChat: "Nieuw" } });
    expect(screen.getByText("Vandaag")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nieuw" })).toBeInTheDocument();
  });
});

describe("ChatHistorySidebar rename and delete", () => {
  it("renames from the row menu with Enter and cancels with Escape", () => {
    const onRename = vi.fn();
    setup({ onRename });
    fireEvent.click(screen.getByRole("button", { name: "Options for Refund policy" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Rename" }));
    const field = screen.getByRole("textbox", { name: "Conversation title" });
    fireEvent.change(field, { target: { value: "Refunds" } });
    fireEvent.keyDown(field, { key: "Enter" });
    expect(onRename).toHaveBeenCalledWith("a", "Refunds");

    fireEvent.click(screen.getByRole("button", { name: "Options for Weekly report" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Rename" }));
    const second = screen.getByRole("textbox", { name: "Conversation title" });
    fireEvent.change(second, { target: { value: "Nope" } });
    fireEvent.keyDown(second, { key: "Escape" });
    expect(onRename).toHaveBeenCalledTimes(1);
  });

  it("deletes only after the confirm", async () => {
    const onDelete = vi.fn();
    setup({ onDelete });
    expect(screen.queryByRole("menuitem", { name: "Rename" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Options for Weekly report" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Delete" }));
    expect(onDelete).not.toHaveBeenCalled();
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(onDelete).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Options for Weekly report" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Delete" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Delete" }));
    expect(onDelete).toHaveBeenCalledWith("b");
  });

  it("does not select the conversation when its menu opens", () => {
    const onSelect = vi.fn();
    setup({ onDelete: vi.fn(), onSelect });
    fireEvent.click(screen.getByRole("button", { name: "Options for Weekly report" }));
    expect(onSelect).not.toHaveBeenCalled();
  });
});
