import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Composer } from "./composer";

const base = { value: "", onChange: vi.fn(), onSubmit: vi.fn() };

/** Makes every element report this width, so the composer thinks it sits in a narrow or a wide box. */
function width(px: number) {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ width: px, height: 40, top: 0, left: 0, right: px, bottom: 40, x: 0, y: 0, toJSON: () => ({}) });
}

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} unobserve() {} });
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Composer toggles on a narrow composer", () => {
  const make = (onToggle = vi.fn()) => [{ id: "web", label: "Search the web", icon: <span>i</span>, active: true, onToggle }];

  it("moves the toggles into the More menu as checkable items", () => {
    width(300);
    const onToggle = vi.fn();
    render(<Composer {...base} toggles={make(onToggle)} />);
    expect(screen.queryByRole("button", { name: /Search the web/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "More" }));
    const item = screen.getByRole("menuitemcheckbox", { name: /Search the web/ });
    expect(item).toHaveAttribute("aria-checked", "true");
    fireEvent.click(item);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("lists the toggles above the app's own More items, and keeps Send", () => {
    width(300);
    render(<Composer {...base} toggles={make()} moreActions={<li role="menuitem">Clear</li>} />);
    fireEvent.click(screen.getByRole("button", { name: "More" }));
    expect(screen.getByRole("menuitemcheckbox", { name: /Search the web/ })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Clear" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send", hidden: true })).toBeInTheDocument();
  });

  it("keeps the chips on a wide composer", () => {
    width(700);
    render(<Composer {...base} toggles={make()} />);
    expect(screen.getByRole("button", { name: /Search the web/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("button", { name: "More" })).not.toBeInTheDocument();
  });
});
