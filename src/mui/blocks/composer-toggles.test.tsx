import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Composer } from "./composer";

const base = { value: "", onChange: vi.fn(), onSubmit: vi.fn() };

describe("Composer toggles and More menu", () => {
  it("renders nothing extra by default", () => {
    render(<Composer {...base} />);
    expect(screen.queryByRole("button", { name: "More" })).not.toBeInTheDocument();
    expect(screen.queryByText("Search the web")).not.toBeInTheDocument();
  });

  it("draws toggles with aria-pressed and calls onToggle", () => {
    const onToggle = vi.fn();
    const { rerender } = render(
      <Composer
        {...base}
        toggles={[{ id: "web", label: "Search the web", icon: <span>i</span>, active: false, onToggle }]}
      />
    );
    const chip = screen.getByRole("button", { name: /Search the web/ });
    expect(chip).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(chip);
    expect(onToggle).toHaveBeenCalledTimes(1);
    rerender(
      <Composer
        {...base}
        toggles={[{ id: "web", label: "Search the web", icon: <span>i</span>, active: true, onToggle }]}
      />
    );
    expect(screen.getByRole("button", { name: /Search the web/ })).toHaveAttribute("aria-pressed", "true");
  });

  it("disables a toggle and every toggle when the composer is disabled", () => {
    const toggles = [
      { id: "a", label: "Alpha", icon: null, active: false, onToggle: vi.fn(), disabled: true },
      { id: "b", label: "Beta", icon: null, active: false, onToggle: vi.fn() },
    ];
    const { rerender } = render(<Composer {...base} toggles={toggles} />);
    expect(screen.getByRole("button", { name: /Alpha/ })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("button", { name: /Beta/ })).not.toHaveAttribute("aria-disabled", "true");
    rerender(<Composer {...base} toggles={toggles} disabled />);
    expect(screen.getByRole("button", { name: /Beta/ })).toHaveAttribute("aria-disabled", "true");
  });

  it("opens the More menu with the supplied actions", () => {
    const onPick = vi.fn();
    render(<Composer {...base} moreActions={<li role="menuitem" onClick={onPick}>Add a photo</li>} />);
    const more = screen.getByRole("button", { name: "More" });
    expect(more).toHaveAttribute("aria-haspopup", "menu");
    expect(screen.queryByText("Add a photo")).not.toBeInTheDocument();
    fireEvent.click(more);
    fireEvent.click(screen.getByText("Add a photo"));
    expect(onPick).toHaveBeenCalled();
  });
});
