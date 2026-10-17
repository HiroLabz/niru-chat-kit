import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { FullChat, type FullChatStream } from "./full-chat";

function stream(): FullChatStream {
  return {
    messages: [{ id: "a1", role: "assistant", text: "Hello there" }],
    status: "idle",
    error: null,
    interrupt: null,
    followUps: [],
    turnActions: null,
    send: vi.fn(),
    stop: vi.fn(),
    retry: vi.fn(),
    resume: vi.fn(),
  };
}

const agent = { name: "Helper", initial: "H" };
const DRAG_EVENTS = ["dragenter", "dragleave", "dragover", "drop"];

function spyOnWindowListeners() {
  const add = vi.spyOn(window, "addEventListener");
  return () => add.mock.calls.filter(([type]) => DRAG_EVENTS.includes(type as string)).map(([type]) => type);
}

function filesOf(...names: string[]) {
  const files = names.map((name) => new File(["x"], name, { type: "text/plain" }));
  return { files, dataTransfer: { items: files.map(() => ({})), files } };
}

describe("FullChat dropScope", () => {
  it("listens on the window by default (window mode unchanged)", () => {
    const dragListeners = spyOnWindowListeners();
    const onAttach = vi.fn();
    render(<FullChat stream={stream()} agent={agent} onAttach={onAttach} />);
    expect(dragListeners().sort()).toEqual([...DRAG_EVENTS].sort());
    const { files, dataTransfer } = filesOf("a.txt");
    fireEvent.dragEnter(window, { dataTransfer });
    fireEvent.drop(window, { dataTransfer });
    expect(onAttach).toHaveBeenCalledWith(files);
    expect(document.querySelector('[data-chat="drop-zone"]')).toBeNull();
    expect(screen.queryByText("Drop files to attach")).toBeNull();
  });

  it("adds no window listeners in zone mode", () => {
    const dragListeners = spyOnWindowListeners();
    render(<FullChat stream={stream()} agent={agent} onAttach={vi.fn()} dropScope="zone" />);
    expect(dragListeners()).toEqual([]);
  });

  it("adds the files dropped on the chat and lights the whole panel while dragging", () => {
    const onAttach = vi.fn();
    render(<FullChat stream={stream()} agent={agent} onAttach={onAttach} dropScope="zone" dropLabel="Drop here" />);
    const zone = document.querySelector('[data-chat="drop-zone"]') as HTMLElement;
    expect(zone).toContainElement(screen.getByText("Hello there"));
    expect(zone).toContainElement(screen.getByRole("textbox"));
    const { files, dataTransfer } = filesOf("a.txt", "b.txt");
    fireEvent.dragEnter(screen.getByText("Hello there"), { dataTransfer });
    expect(zone).toContainElement(screen.getByText("Drop here"));
    fireEvent.drop(screen.getByRole("textbox"), { dataTransfer });
    expect(onAttach).toHaveBeenCalledExactlyOnceWith(files);
    expect(screen.queryByText("Drop here")).toBeNull();
  });

  it("does nothing for a drop elsewhere on the page", () => {
    const onAttach = vi.fn();
    render(
      <div>
        <p>Host page</p>
        <FullChat stream={stream()} agent={agent} onAttach={onAttach} dropScope="zone" />
      </div>
    );
    const { dataTransfer } = filesOf("a.txt");
    const dragOver = new Event("dragover", { bubbles: true, cancelable: true });
    fireEvent.dragEnter(screen.getByText("Host page"), { dataTransfer });
    fireEvent(screen.getByText("Host page"), dragOver);
    fireEvent.drop(screen.getByText("Host page"), { dataTransfer });
    fireEvent.drop(window, { dataTransfer });
    expect(onAttach).not.toHaveBeenCalled();
    expect(dragOver.defaultPrevented).toBe(false);
    expect(screen.queryByText("Drop files to attach")).toBeNull();
  });

  it("makes the zone a flex column that passes the height on", () => {
    render(<FullChat stream={stream()} agent={agent} onAttach={vi.fn()} dropScope="zone" />);
    const zone = document.querySelector('[data-chat="drop-zone"]') as HTMLElement;
    const style = getComputedStyle(zone);
    expect(style.display).toBe("flex");
    expect(style.flexDirection).toBe("column");
    expect(style.position).toBe("relative");
  });

  it("ignores drops in zone mode when there is no onAttach", () => {
    render(<FullChat stream={stream()} agent={agent} dropScope="zone" />);
    fireEvent.dragEnter(screen.getByText("Hello there"), { dataTransfer: filesOf("a.txt").dataTransfer });
    expect(screen.queryByText("Drop files to attach")).toBeNull();
  });
});
