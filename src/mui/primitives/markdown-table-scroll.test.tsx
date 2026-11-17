import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";

vi.mock("shiki", () => ({ codeToHtml: () => new Promise(() => {}) }));

import { Markdown } from "./markdown";

const TABLE = "| Customer name | Renewal date |\n|---|---|\n| Ada | 2026-11-18 |";

type Scroll = { scrollWidth: number; clientWidth: number; clientHeight: number; offsetHeight?: number };

/**
 * jsdom has no layout: the table's scroller gets the given sizes, and `scrollLeft` is kept per
 * element so scrolling (and the mirrored scrollbar following it) can be checked.
 */
function stubScroller(size: Scroll) {
  const isScroller = (el: Element) => el.matches("[data-chat-table-scroll]");
  const isMirror = (el: Element) => el.matches("[data-chat-table-mirror]");
  const scrollLefts = new WeakMap<Element, number>();
  vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockImplementation(function (this: HTMLElement) {
    return isScroller(this) || isMirror(this) ? size.scrollWidth : 0;
  });
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(function (this: HTMLElement) {
    return isScroller(this) || isMirror(this) ? size.clientWidth : 0;
  });
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockImplementation(function (this: HTMLElement) {
    return isScroller(this) ? size.clientHeight : 0;
  });
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(function (this: HTMLElement) {
    return isScroller(this) ? (size.offsetHeight ?? size.clientHeight) : 0;
  });
  vi.spyOn(Element.prototype, "scrollLeft", "get").mockImplementation(function (this: Element) {
    return scrollLefts.get(this) ?? 0;
  });
  vi.spyOn(Element.prototype, "scrollLeft", "set").mockImplementation(function (this: Element, value: number) {
    scrollLefts.set(this, value);
  });
}

const scroller = (container: HTMLElement) => container.querySelector<HTMLElement>("[data-chat-table-scroll]")!;

afterEach(() => vi.restoreAllMocks());

describe("MarkdownTable scrolling cues", () => {
  it("shows no fade, mirror or Expand button for a table that fits", () => {
    stubScroller({ scrollWidth: 600, clientWidth: 600, clientHeight: 400 });
    const { container } = render(<Markdown>{TABLE}</Markdown>);
    const el = scroller(container);
    expect(el.hasAttribute("data-overflow")).toBe(false);
    expect(el.hasAttribute("data-more-left")).toBe(false);
    expect(el.hasAttribute("data-more-right")).toBe(false);
    expect(el.hasAttribute("tabindex")).toBe(false);
    expect(container.querySelector("[data-chat-table-mirror]")).toBeNull();
    expect(screen.queryByRole("button", { name: "Expand table" })).toBeNull();
  });

  it("fades the right edge, repeats the scrollbar above a tall table and offers Expand while it overflows", () => {
    // Vee's 20-column table at the 2300 px full page: 2522 px of table in a 1940 px box.
    stubScroller({ scrollWidth: 2522, clientWidth: 1940, clientHeight: 400, offsetHeight: 410 });
    const { container } = render(<Markdown>{TABLE}</Markdown>);
    const el = scroller(container);
    expect(el.hasAttribute("data-overflow")).toBe(true);
    expect(el.hasAttribute("data-more-right")).toBe(true);
    expect(el.hasAttribute("data-more-left")).toBe(false);
    // The fade stops above the scroller's own 10 px scrollbar.
    expect(el.style.getPropertyValue("--nck-table-bar")).toBe("10px");
    // Keyboard reachable, with a name.
    expect(screen.getByRole("region", { name: "Table, scrolls sideways" })).toBe(el);
    expect(el.getAttribute("tabindex")).toBe("0");
    const mirror = container.querySelector<HTMLElement>("[data-chat-table-mirror]")!;
    expect(mirror).not.toBeNull();
    expect(mirror.getAttribute("aria-hidden")).toBe("true");
    expect((mirror.firstElementChild as HTMLElement).style.width).toBe("2522px");
    expect(screen.getByRole("button", { name: "Expand table" })).toBeInTheDocument();
  });

  it("fades the left edge once scrolled, the right one not at the end, and keeps the mirror in step", () => {
    stubScroller({ scrollWidth: 2522, clientWidth: 1940, clientHeight: 400 });
    const { container } = render(<Markdown>{TABLE}</Markdown>);
    const el = scroller(container);
    const mirror = container.querySelector<HTMLElement>("[data-chat-table-mirror]")!;

    el.scrollLeft = 300;
    fireEvent.scroll(el);
    expect(el.hasAttribute("data-more-left")).toBe(true);
    expect(el.hasAttribute("data-more-right")).toBe(true);
    expect(mirror.scrollLeft).toBe(300);

    // Dragging the mirrored scrollbar moves the table.
    mirror.scrollLeft = 582;
    fireEvent.scroll(mirror);
    expect(el.scrollLeft).toBe(582);
    fireEvent.scroll(el);
    expect(el.hasAttribute("data-more-left")).toBe(true);
    expect(el.hasAttribute("data-more-right")).toBe(false);
  });

  it("keeps a single scrollbar under a short wide table, where it is already in view", () => {
    stubScroller({ scrollWidth: 1200, clientWidth: 298, clientHeight: 90 });
    const { container } = render(<Markdown>{TABLE}</Markdown>);
    expect(scroller(container).hasAttribute("data-more-right")).toBe(true);
    expect(container.querySelector("[data-chat-table-mirror]")).toBeNull();
    expect(screen.getByRole("button", { name: "Expand table" })).toBeInTheDocument();
  });

  it("opens the whole table in a full-window dialog, and Escape closes it", () => {
    stubScroller({ scrollWidth: 2522, clientWidth: 1940, clientHeight: 400 });
    render(<Markdown>{TABLE}</Markdown>);
    fireEvent.click(screen.getByRole("button", { name: "Expand table" }));
    const dialog = screen.getByRole("dialog", { name: "Table" });
    const table = within(dialog).getByRole("table");
    expect(within(table).getByRole("columnheader", { name: "Renewal date" })).toBeInTheDocument();
    expect(within(table).getByRole("cell", { name: "2026-11-18" })).toBeInTheDocument();
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("closes the dialog with its Close button", () => {
    stubScroller({ scrollWidth: 2522, clientWidth: 1940, clientHeight: 400 });
    render(<Markdown>{TABLE}</Markdown>);
    fireEvent.click(screen.getByRole("button", { name: "Expand table" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
