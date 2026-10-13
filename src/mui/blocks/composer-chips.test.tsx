import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Composer } from "./composer";

const base = { value: "", onChange: vi.fn(), onSubmit: vi.fn() };

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Composer chips", () => {
  it("draws no chip control without the prop", () => {
    const { container } = render(<Composer {...base} onAttach={vi.fn()} />);
    expect(container.querySelector('[data-chat="composer-chip"]')).toBeNull();
    expect(screen.getByRole("button", { name: "Attach a document" })).toBeInTheDocument();
  });

  it("draws each chip with its label, icon and tone", () => {
    const { container } = render(
      <Composer {...base} chips={[{ id: "plan", label: "Plan mode", icon: <span data-testid="i">p</span>, tone: "accent" }, { id: "w", label: "Careful", tone: "warning" }]} />
    );
    const chips = container.querySelectorAll('[data-chat="composer-chip"]');
    expect(chips).toHaveLength(2);
    expect(chips[0]).toHaveAttribute("data-tone", "accent");
    expect(chips[1]).toHaveAttribute("data-tone", "warning");
    expect(screen.getByTestId("i")).toBeInTheDocument();
  });

  it("calls onRemove and onClick, with the default and the given remove name", () => {
    const onRemove = vi.fn();
    const onClick = vi.fn();
    const onOther = vi.fn();
    render(
      <Composer
        {...base}
        chips={[
          { id: "goal", label: "Goal: ship it", onRemove, onClick },
          { id: "x", label: "Other", onRemove: onOther, removeLabel: "Turn it off" },
        ]}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Goal: ship it" }));
    expect(onClick).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Remove Goal: ship it" }));
    expect(onRemove).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Turn it off" }));
    expect(onOther).toHaveBeenCalledTimes(1);
  });

  it("uses the remove word from extrasLabels", () => {
    render(<Composer {...base} chips={[{ id: "a", label: "Plan", onRemove: vi.fn() }]} extrasLabels={{ remove: "Entfernen" }} />);
    expect(screen.getByRole("button", { name: "Entfernen Plan" })).toBeInTheDocument();
  });

  it("sits in the row after the plus button, before the toggles and Send", () => {
    const { container } = render(
      <Composer
        {...base}
        addMenu={{ sections: [] }}
        chips={[{ id: "a", label: "Plan mode" }]}
        toggles={[{ id: "w", label: "Web", icon: <span>i</span>, active: false, onToggle: vi.fn() }]}
      />
    );
    const add = screen.getByRole("button", { name: "Add" });
    const chip = container.querySelector('[data-chat="composer-chip"]') as HTMLElement;
    const web = screen.getByRole("button", { name: /Web/ });
    const send = container.querySelector('[data-chat="send"]') as HTMLElement;
    const before = (a: Element, b: Element) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
    expect(before(add, chip)).toBe(true);
    expect(before(chip, web)).toBe(true);
    expect(before(web, send)).toBe(true);
  });

  it("moves to a line above the row in a narrow composer", () => {
    vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} unobserve() {} });
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ width: 300, height: 40, top: 0, left: 0, right: 300, bottom: 40, x: 0, y: 0, toJSON: () => ({}) });
    const { container } = render(<Composer {...base} chips={[{ id: "a", label: "Plan mode" }]} />);
    const line = container.querySelector('[data-chat="composer-chips"]') as HTMLElement;
    expect(line).toBeTruthy();
    expect(line.compareDocumentPosition(container.querySelector('[data-chat="composer-bar"]') as HTMLElement) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(container.querySelector('[data-chat="composer-bar"] [data-chat="composer-chip"]')).toBeNull();
  });
});
