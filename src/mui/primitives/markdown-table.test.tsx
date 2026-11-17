import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

vi.mock("shiki", () => ({ codeToHtml: () => new Promise(() => {}) }));

import { Conversation } from "../blocks/conversation";
import { Markdown } from "./markdown";
import { WIDE_AREA_ATTRIBUTE } from "./markdown-table";

const TABLE = "| a | b |\n|---|---|\n| 1 | 2 |";

type Box = { left: number; width: number; top?: number; height?: number };

/**
 * jsdom has no layout, so each element gets a box from `boxes` (by a data attribute) and
 * `clientWidth` follows it. The page below is the full-page Niru chat at 2300 px with a 340 px
 * sidebar: a 1960 px transcript, a 712 px column centred in it (624 px side padding), a 36 px
 * avatar and a 668 px reply.
 */
function stubLayout(boxes: Record<string, Box>) {
  const boxOf = (el: Element): Box | undefined => {
    for (const [selector, box] of Object.entries(boxes)) if (el.matches(selector)) return box;
    return undefined;
  };
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    const box = boxOf(this) ?? { left: 0, width: 0 };
    const top = box.top ?? 0;
    const height = box.height ?? 0;
    return { left: box.left, right: box.left + box.width, width: box.width, top, bottom: top + height, height, x: box.left, y: top, toJSON: () => ({}) } as DOMRect;
  });
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(function (this: HTMLElement) {
    return boxOf(this)?.width ?? 0;
  });
}

function page(bubbleBackground: string) {
  return render(
    <div {...{ [WIDE_AREA_ATTRIBUTE]: "" }} data-testid="area" style={{ paddingLeft: "624px", paddingRight: "624px" }}>
      <div data-message-id="a1" style={{ display: "flex" }}>
        <div data-testid="avatar" />
        <div data-chat="turn-body">
          <div data-chat-bubble="assistant" style={{ background: bubbleBackground }}>
            <Markdown>{TABLE}</Markdown>
          </div>
        </div>
      </div>
    </div>
  );
}

const FULL_PAGE: Record<string, Box> = {
  "[data-testid=area]": { left: 340, width: 1960 },
  "[data-message-id]": { left: 964, width: 712 },
  "[data-testid=avatar]": { left: 964, width: 36, top: 0, height: 36 },
  "[data-chat-bubble] > div": { left: 1008, width: 668 },
  "[data-chat-table]": { left: 1008, width: 668, top: 0, height: 300 },
  "[data-chat-table] > table": { left: 364, width: 1912, top: 0, height: 300 },
};

afterEach(() => vi.restoreAllMocks());

describe("MarkdownTable", () => {
  it("wraps a markdown table so it can be placed without touching the prose around it", () => {
    const { container } = render(<Markdown>{"Intro\n\n" + TABLE}</Markdown>);
    const wrapper = container.querySelector("[data-chat-table]");
    expect(wrapper).not.toBeNull();
    expect(wrapper!.querySelector("table")).not.toBeNull();
    // Outside a wide area nothing breaks out.
    expect(wrapper!.getAttribute("data-breakout")).toBeNull();
  });

  it("marks the transcript as a wide area only when the turns sit in a centred column", () => {
    const messages = [{ id: "a1", role: "assistant" as const, text: TABLE }];
    const { container, rerender } = render(<Conversation messages={messages} columnMaxWidth={712} />);
    expect(container.querySelector('[role="log"]')!.hasAttribute(WIDE_AREA_ATTRIBUTE)).toBe(true);
    rerender(<Conversation messages={messages} />);
    expect(container.querySelector('[role="log"]')!.hasAttribute(WIDE_AREA_ATTRIBUTE)).toBe(false);
  });

  it("lets a wide table use the transcript's width less a 24 px gutter, centred on the column", () => {
    stubLayout(FULL_PAGE);
    const { container } = page("transparent");
    const wrapper = container.querySelector<HTMLElement>("[data-chat-table]")!;
    expect(wrapper.getAttribute("data-breakout")).toBe("on");
    // The area runs from 340 + 24 to 2300 - 24: 1912 px, and the reply starts 644 px into it.
    expect(wrapper.style.getPropertyValue("--nck-table-area")).toBe("1912px");
    expect(wrapper.style.getPropertyValue("--nck-table-pull")).toBe("644px");
    // The turn's centre (1320) is 956 px into the area, exactly half of it: no bias either way.
    expect(wrapper.style.getPropertyValue("--nck-table-before")).toBe("0px");
    expect(wrapper.style.getPropertyValue("--nck-table-after")).toBe("0px");
    // A table this wide runs under the avatar's column, so it starts below the avatar.
    expect(wrapper.style.getPropertyValue("--nck-table-clear")).toBe("44px");
  });

  it("keeps the table inside a visible (tinted) bubble", () => {
    stubLayout(FULL_PAGE);
    const { container } = page("rgb(240, 240, 240)");
    expect(container.querySelector("[data-chat-table]")!.getAttribute("data-breakout")).toBeNull();
  });

  it("does not break out where the turns already reach the gutter (a phone)", () => {
    stubLayout({
      "[data-testid=area]": { left: 0, width: 390 },
      "[data-message-id]": { left: 24, width: 342 },
      "[data-testid=avatar]": { left: 24, width: 36, height: 36 },
      "[data-chat-bubble] > div": { left: 68, width: 298 },
      "[data-chat-table]": { left: 68, width: 298 },
    });
    const { container } = render(
      <div {...{ [WIDE_AREA_ATTRIBUTE]: "" }} data-testid="area" style={{ paddingLeft: "24px", paddingRight: "24px" }}>
        <div data-message-id="a1">
          <div data-chat-bubble="assistant" style={{ background: "transparent" }}>
            <Markdown>{TABLE}</Markdown>
          </div>
        </div>
      </div>
    );
    expect(container.querySelector("[data-chat-table]")!.getAttribute("data-breakout")).toBeNull();
  });
});
