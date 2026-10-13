import { describe, expect, it, vi } from "vitest";
import { createEvent, fireEvent, render, screen } from "@testing-library/react";
import { Composer, type ComposerProps } from "./composer";

const base = { value: "", onChange: vi.fn(), onSubmit: vi.fn() };
const long = `Dear team,\n${"x".repeat(2500)}`;

/** Pastes `text` (and files) into the text box the way a browser reports it; returns the event to check preventDefault. */
function paste(target: Element, text: string, files: File[] = []) {
  const event = createEvent.paste(target, {
    clipboardData: { files, items: [], getData: (type: string) => (type === "text/plain" ? text : "") },
  });
  fireEvent(target, event);
  return event;
}

const field = () => screen.getByRole("textbox") as HTMLTextAreaElement;

function renderComposer(props: Partial<ComposerProps> = {}) {
  return render(<Composer {...base} {...props} />);
}

describe("Composer long pasted text", () => {
  it("without onPasteLongText a long paste is left to the browser, and no chip shows", () => {
    const { container } = renderComposer();
    expect(paste(field(), long).defaultPrevented).toBe(false);
    expect(container.querySelector('[data-chat="composer-pasted"]')).toBeNull();
  });

  it("hands a long paste to the app and keeps it out of the box", () => {
    const onPasteLongText = vi.fn();
    renderComposer({ onPasteLongText });
    expect(paste(field(), long).defaultPrevented).toBe(true);
    expect(onPasteLongText).toHaveBeenCalledWith(long);
    expect(field()).toHaveValue("");
  });

  it("leaves a short paste alone", () => {
    const onPasteLongText = vi.fn();
    renderComposer({ onPasteLongText });
    expect(paste(field(), "just a few words").defaultPrevented).toBe(false);
    expect(onPasteLongText).not.toHaveBeenCalled();
  });

  it("counts lines and honours the threshold prop", () => {
    const onPasteLongText = vi.fn();
    renderComposer({ onPasteLongText });
    paste(field(), Array(40).fill("line").join("\n"));
    expect(onPasteLongText).toHaveBeenCalledTimes(1);
    const second = vi.fn();
    renderComposer({ onPasteLongText: second, longPasteThreshold: { characters: 10 } });
    paste(screen.getAllByRole("textbox")[1], "twelve chars");
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("still attaches files in the same paste, and hands over the long text too", () => {
    const onAttach = vi.fn();
    const onPasteLongText = vi.fn();
    renderComposer({ onAttach, onPasteLongText });
    const file = new File(["a"], "shot.png", { type: "image/png" });
    expect(paste(field(), long, [file]).defaultPrevented).toBe(true);
    expect(onAttach).toHaveBeenCalledWith([file]);
    expect(onPasteLongText).toHaveBeenCalledWith(long);
  });

  it("attaches files with a short text as before, without handing the text over", () => {
    const onAttach = vi.fn();
    const onPasteLongText = vi.fn();
    renderComposer({ onAttach, onPasteLongText });
    const file = new File(["a"], "shot.png", { type: "image/png" });
    paste(field(), "hi", [file]);
    expect(onAttach).toHaveBeenCalledTimes(1);
    expect(onPasteLongText).not.toHaveBeenCalled();
  });

  it("does nothing while the composer is disabled", () => {
    const onPasteLongText = vi.fn();
    const onAttach = vi.fn();
    renderComposer({ onPasteLongText, onAttach, disabled: true });
    expect(paste(field(), long, [new File(["a"], "a.png")]).defaultPrevented).toBe(false);
    expect(onPasteLongText).not.toHaveBeenCalled();
    expect(onAttach).not.toHaveBeenCalled();
  });

  it("does not take a long paste into another input inside the composer", () => {
    const onPasteLongText = vi.fn();
    renderComposer({ onPasteLongText, settings: <input aria-label="Name" />, addMenu: { sections: [] } });
    fireEvent.click(screen.getByRole("button", { name: "Run settings" }));
    expect(paste(screen.getByLabelText("Name"), long).defaultPrevented).toBe(false);
    expect(onPasteLongText).not.toHaveBeenCalled();
  });

  it("draws each held text with the first line as title, the size, and a link and a remove button", () => {
    const onShow = vi.fn();
    const onRemove = vi.fn();
    const { container } = renderComposer({
      pastedTexts: [{ id: "p1", text: `\n  Dear team,\n${"y".repeat(3400)}` }, { id: "p2", text: "short", title: "My notes" }],
      onShowPastedText: onShow,
      onRemovePastedText: onRemove,
    });
    expect(container.querySelectorAll('[data-chat="composer-pasted-item"]')).toHaveLength(2);
    expect(screen.getByText("Dear team,")).toBeInTheDocument();
    expect(screen.getByText("My notes")).toBeInTheDocument();
    expect(screen.getByText("3,414 characters")).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: "Show in text field" })[0]);
    expect(onShow).toHaveBeenCalledWith("p1");
    fireEvent.click(screen.getByRole("button", { name: "Remove My notes" }));
    expect(onRemove).toHaveBeenCalledWith("p2");
    expect(field()).toHaveValue("");
  });

  it("omits the link and the remove button without their callbacks, and uses the label overrides", () => {
    renderComposer({ pastedTexts: [{ id: "p", text: "abc" }] });
    expect(screen.queryByRole("button", { name: "Show in text field" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Remove/ })).not.toBeInTheDocument();
    renderComposer({
      pastedTexts: [{ id: "q", text: "abc" }],
      onShowPastedText: vi.fn(),
      extrasLabels: { showPasted: "Anzeigen", pastedSize: "{count} Zeichen" },
    });
    expect(screen.getByRole("button", { name: "Anzeigen" })).toBeInTheDocument();
    expect(screen.getByText("3 Zeichen")).toBeInTheDocument();
  });

  it("only draws the list when texts are held", () => {
    const { container } = renderComposer({ pastedTexts: [], onPasteLongText: vi.fn() });
    expect(container.querySelector('[data-chat="composer-pasted"]')).toBeNull();
  });
});
