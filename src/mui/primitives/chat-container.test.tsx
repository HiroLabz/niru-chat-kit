import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ChatContainer } from "./chat-container";

function setLogMetrics(log: HTMLElement, metrics: { scrollHeight: number; clientHeight: number }) {
  Object.defineProperty(log, "scrollHeight", { configurable: true, value: metrics.scrollHeight });
  Object.defineProperty(log, "clientHeight", { configurable: true, value: metrics.clientHeight });
}

afterEach(() => vi.restoreAllMocks());

describe("ChatContainer", () => {
  it("renders an aria-live log holding its content and anchor", () => {
    render(
      <ChatContainer.Root>
        <ChatContainer.Content>
          <p>turn</p>
        </ChatContainer.Content>
        <ChatContainer.ScrollAnchor />
      </ChatContainer.Root>
    );
    const log = screen.getByRole("log");
    expect(log).toHaveAttribute("aria-live", "polite");
    expect(log).toContainElement(screen.getByText("turn"));
    expect(log.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });

  it("opens at the newest content", () => {
    vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockReturnValue(9000);
    render(
      <ChatContainer.Root>
        <ChatContainer.Content>long</ChatContainer.Content>
      </ChatContainer.Root>
    );
    expect(screen.getByRole("log").scrollTop).toBe(9000);
  });

  it("follows new content until the person scrolls away, then offers a way back", () => {
    const { rerender } = render(
      <ChatContainer.Root>
        <p>one</p>
      </ChatContainer.Root>
    );
    const log = screen.getByRole("log");
    setLogMetrics(log, { scrollHeight: 1000, clientHeight: 400 });
    expect(screen.queryByRole("button", { name: "Jump to latest message" })).toBeNull();

    fireEvent.wheel(log);
    log.scrollTop = 100;
    fireEvent.scroll(log);
    const jump = screen.getByRole("button", { name: "Jump to latest message" });

    setLogMetrics(log, { scrollHeight: 2000, clientHeight: 400 });
    rerender(
      <ChatContainer.Root>
        <p>one</p>
        <p>two</p>
      </ChatContainer.Root>
    );
    expect(log.scrollTop).toBe(100);

    fireEvent.click(jump);
    expect(log.scrollTop).toBe(2000);
    expect(screen.queryByRole("button", { name: "Jump to latest message" })).toBeNull();
  });

  it("stops following on a scrolling key and resumes when a new rearmKey says the person sent something", () => {
    const { rerender } = render(
      <ChatContainer.Root rearmKey={null}>
        <p>one</p>
      </ChatContainer.Root>
    );
    const log = screen.getByRole("log");
    setLogMetrics(log, { scrollHeight: 1000, clientHeight: 400 });
    fireEvent.keyDown(log, { key: "PageUp" });
    log.scrollTop = 50;

    setLogMetrics(log, { scrollHeight: 1500, clientHeight: 400 });
    rerender(
      <ChatContainer.Root rearmKey={null}>
        <p>one</p>
        <p>two</p>
      </ChatContainer.Root>
    );
    expect(log.scrollTop).toBe(50);

    rerender(
      <ChatContainer.Root rearmKey="user-turn-2">
        <p>one</p>
        <p>two</p>
        <p>three</p>
      </ChatContainer.Root>
    );
    expect(log.scrollTop).toBe(1500);
  });

  it("hides the jump button when asked", () => {
    render(
      <ChatContainer.Root scrollButton={false}>
        <p>one</p>
      </ChatContainer.Root>
    );
    const log = screen.getByRole("log");
    setLogMetrics(log, { scrollHeight: 1000, clientHeight: 400 });
    fireEvent.scroll(log);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("passes extra attributes to the log element", () => {
    render(
      <ChatContainer.Root data-mask="on">
        <p>one</p>
      </ChatContainer.Root>
    );
    expect(screen.getByRole("log")).toHaveAttribute("data-mask", "on");
  });

  it("shows a thin scrollbar instead of hiding it", () => {
    render(
      <ChatContainer.Root>
        <p>one</p>
      </ChatContainer.Root>
    );
    const css = Array.from(document.querySelectorAll("style"))
      .map((tag) => tag.textContent ?? "")
      .join("");
    expect(css).toMatch(/scrollbar-width:\s*thin/);
    expect(css).toContain("::-webkit-scrollbar-thumb");
    expect(css).not.toMatch(/scrollbar-width:\s*none/);
    expect(css).not.toMatch(/::-webkit-scrollbar\{display:\s*none/);
  });

  it("stops following when the scrollbar is dragged up, even with no pointer or wheel event, and resumes at the bottom", () => {
    const { rerender } = render(
      <ChatContainer.Root>
        <p>one</p>
      </ChatContainer.Root>
    );
    const log = screen.getByRole("log");
    setLogMetrics(log, { scrollHeight: 1000, clientHeight: 400 });
    log.scrollTop = 600;
    fireEvent.scroll(log);

    // The thumb is dragged up: a scroll event only, nothing else fires.
    log.scrollTop = 300;
    fireEvent.scroll(log);
    setLogMetrics(log, { scrollHeight: 2000, clientHeight: 400 });
    rerender(
      <ChatContainer.Root>
        <p>one</p>
        <p>two</p>
      </ChatContainer.Root>
    );
    expect(log.scrollTop).toBe(300);

    // Dragged back to the bottom: following resumes.
    log.scrollTop = 1600;
    fireEvent.scroll(log);
    setLogMetrics(log, { scrollHeight: 2400, clientHeight: 400 });
    rerender(
      <ChatContainer.Root>
        <p>one</p>
        <p>two</p>
        <p>three</p>
      </ChatContainer.Root>
    );
    expect(log.scrollTop).toBe(2400);
  });

  it("does not read a gap left by new content below our own scroll as the person scrolling", () => {
    const { rerender } = render(
      <ChatContainer.Root>
        <p>one</p>
      </ChatContainer.Root>
    );
    const log = screen.getByRole("log");
    setLogMetrics(log, { scrollHeight: 1000, clientHeight: 400 });
    log.scrollTop = 600;
    fireEvent.scroll(log);

    // Content grew before the scroll event for our own move arrived: the gap is not intent.
    setLogMetrics(log, { scrollHeight: 1200, clientHeight: 400 });
    fireEvent.scroll(log);
    rerender(
      <ChatContainer.Root>
        <p>one</p>
        <p>two</p>
      </ChatContainer.Root>
    );
    expect(log.scrollTop).toBe(1200);
  });
});
