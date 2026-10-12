import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import type { ChatMessage } from "../../core/types";
import { Conversation } from "./conversation";
import { ConversationHeader } from "./conversation-header";
import { FullChat, type FullChatStream } from "./full-chat";

const messages: ChatMessage[] = [
  { id: "u1", role: "user", text: "First question" },
  { id: "a1", serverId: "srv-a1", role: "assistant", text: "First answer" },
  { id: "u2", role: "user", text: "Second question" },
  { id: "a2", role: "assistant", text: "Second answer" },
];

const turn = (id: string) => document.querySelector(`[data-message-id="${id}"]`) as HTMLElement;

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("Conversation highlightMessageId", () => {
  it("gives every turn a data-message-id and highlights nothing by default", () => {
    render(<Conversation messages={messages} />);
    expect(turn("u1")).toBeInTheDocument();
    expect(turn("a2")).toBeInTheDocument();
    expect(document.querySelector("[data-highlighted]")).toBeNull();
  });

  it("scrolls the log (not the page) to the turn and highlights it for about 2.5 seconds", () => {
    vi.useFakeTimers();
    const pageScroll = vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
    const scrollTo = vi.fn();
    Element.prototype.scrollTo = scrollTo as never;
    render(<Conversation messages={messages} highlightMessageId="a1" />);
    expect(turn("a1")).toHaveAttribute("data-highlighted", "true");
    expect(turn("u1")).not.toHaveAttribute("data-highlighted");
    expect(scrollTo).toHaveBeenCalled();
    expect(scrollTo.mock.contexts[0]).toBe(screen.getByRole("log"));
    expect(pageScroll).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(2600);
    });
    expect(turn("a1")).not.toHaveAttribute("data-highlighted");
    Reflect.deleteProperty(Element.prototype, "scrollTo");
  });

  it("matches a server id, and runs again when the value changes", () => {
    vi.useFakeTimers();
    const { rerender } = render(<Conversation messages={messages} highlightMessageId="srv-a1" />);
    expect(turn("a1")).toHaveAttribute("data-highlighted", "true");
    rerender(<Conversation messages={messages} highlightMessageId="u2" />);
    expect(turn("u2")).toHaveAttribute("data-highlighted", "true");
    expect(turn("a1")).not.toHaveAttribute("data-highlighted");
    rerender(<Conversation messages={messages} highlightMessageId={undefined} />);
    expect(document.querySelector("[data-highlighted]")).toBeNull();
  });

  it("waits for the message to exist, then highlights it", () => {
    const { rerender } = render(<Conversation messages={messages.slice(0, 2)} highlightMessageId="a2" />);
    expect(document.querySelector("[data-highlighted]")).toBeNull();
    rerender(<Conversation messages={messages} highlightMessageId="a2" />);
    expect(turn("a2")).toHaveAttribute("data-highlighted", "true");
  });

  it("scrolls to the turn once its messages arrive after the value was set, and follow-bottom does not undo it", () => {
    const scrollTo = vi.fn();
    Element.prototype.scrollTo = scrollTo as never;
    const height = vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockReturnValue(5000);
    const rect = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      const top = this.dataset.messageId === "a1" ? 700 : 0;
      return { top, bottom: top, left: 0, right: 0, width: 0, height: 0, x: 0, y: top, toJSON: () => ({}) };
    });
    // The chat was switched: the value is set first, with the new chat's messages still empty.
    const { rerender } = render(<Conversation messages={[]} highlightMessageId="a1" />);
    expect(scrollTo).not.toHaveBeenCalled();
    rerender(<Conversation messages={messages} highlightMessageId="a1" />);
    expect(turn("a1")).toHaveAttribute("data-highlighted", "true");
    expect(scrollTo).toHaveBeenCalled();
    expect(scrollTo.mock.calls[0][0].top).toBe(684);
    // Follow-bottom would have written scrollHeight (5000) into scrollTop.
    expect(screen.getByRole("log").scrollTop).not.toBe(5000);
    height.mockRestore();
    rect.mockRestore();
    Reflect.deleteProperty(Element.prototype, "scrollTo");
  });

  it("is not pulled back to the bottom when a late scroll event or the end of the highlight follows", () => {
    Element.prototype.scrollTo = vi.fn() as never;
    let height = 100;
    const spy = vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockImplementation(() => height);
    const { rerender } = render(<Conversation messages={messages} highlightMessageId="a1" />);
    const log = screen.getByRole("log");
    // The scroll event of the chat's own first move to the bottom arrives after the hold began.
    log.scrollTop = 100;
    fireEvent.scroll(log);
    log.scrollTop = 40;
    height = 5000;
    rerender(<Conversation messages={messages} highlightMessageId={undefined} />);
    expect(log.scrollTop).toBe(40);
    spy.mockRestore();
    Reflect.deleteProperty(Element.prototype, "scrollTo");
  });

  it("draws the tint as an overlay so it shows over opaque bubbles", () => {
    render(<Conversation messages={messages} highlightMessageId="a1" />);
    const css = Array.from(document.querySelectorAll("style")).map((node) => node.textContent).join("");
    expect(css).toMatch(/chatKitFlashOverlay/);
    expect(css).toMatch(/::after/);
  });

  it("still marks the turn under reduced motion (the style swaps the fade for an outline)", () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query.includes("reduce"),
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
    }));
    const scrollTo = vi.fn();
    Element.prototype.scrollTo = scrollTo as never;
    render(<Conversation messages={messages} highlightMessageId="a2" />);
    expect(turn("a2")).toHaveAttribute("data-highlighted", "true");
    expect(scrollTo.mock.calls[0][0]).toMatchObject({ behavior: "auto" });
    const css = Array.from(document.querySelectorAll("style")).map((node) => node.textContent).join("");
    expect(css).toMatch(/prefers-reduced-motion:\s*reduce/);
    Reflect.deleteProperty(Element.prototype, "scrollTo");
  });
});

function stream(overrides: Partial<FullChatStream> = {}): FullChatStream {
  return {
    messages,
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

describe("FullChat header and highlight", () => {
  it("draws nothing extra without the props", () => {
    render(<FullChat stream={stream()} agent={{ name: "H", initial: "H" }} />);
    expect(document.querySelector('[data-chat="conversation-header"]')).toBeNull();
    expect(document.querySelector("[data-highlighted]")).toBeNull();
  });

  it("draws the header above the conversation and forwards highlightMessageId", () => {
    render(
      <FullChat
        stream={stream()}
        agent={{ name: "H", initial: "H" }}
        header={<ConversationHeader title="Refund policy" />}
        highlightMessageId="a2"
      />
    );
    const header = screen.getByRole("heading", { name: "Refund policy" });
    const log = screen.getByRole("log");
    expect(header.compareDocumentPosition(log) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(turn("a2")).toHaveAttribute("data-highlighted", "true");
  });
});
