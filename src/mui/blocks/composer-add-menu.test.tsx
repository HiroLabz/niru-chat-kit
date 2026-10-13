import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { Composer, type ComposerAddMenuOptions, type ComposerProps } from "./composer";

const rowsOf = (panel: HTMLElement) => Array.from(panel.querySelectorAll<HTMLElement>('[role^="menuitem"]'));
const base = { value: "", onChange: vi.fn(), onSubmit: vi.fn() };

function menu(extra: Partial<ComposerAddMenuOptions["sections"][number]>[] = [], select = vi.fn()): ComposerAddMenuOptions {
  return {
    sections: [
      {
        id: "modes",
        items: [
          { id: "goal", label: "Goal", description: "Set a goal to keep pursuing", icon: <span>g</span>, onSelect: () => select("goal") },
          { id: "plan", label: "Plan mode", description: "Turn plan mode on", checked: true, keepOpen: true, onSelect: () => select("plan") },
          { id: "off", label: "Edit commands", disabled: true, disabledReason: "Not available here", onSelect: () => select("off") },
        ],
      },
      ...extra.map((section, index) => ({ id: `extra${index}`, items: [], ...section })),
    ],
  };
}

function open(props: Partial<ComposerProps> = {}) {
  render(<Composer {...base} {...props} />);
  fireEvent.click(screen.getByRole("button", { name: "Add" }));
  return screen.getByRole("menu", { name: "Add" });
}

describe("Composer Add menu", () => {
  it("without addMenu the paperclip stays and no plus button exists", () => {
    render(<Composer {...base} onAttach={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Attach a document" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add" })).not.toBeInTheDocument();
  });

  it("replaces the paperclip with a plus button that reports its state", () => {
    render(<Composer {...base} onAttach={vi.fn()} addMenu={menu()} />);
    expect(screen.queryByRole("button", { name: "Attach a document" })).not.toBeInTheDocument();
    const plus = screen.getByRole("button", { name: "Add" });
    expect(plus).toHaveAttribute("aria-haspopup", "menu");
    expect(plus).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(plus);
    expect(plus).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("menu", { name: "Add" })).toBeInTheDocument();
  });

  it("takes its name and heading from the label", () => {
    render(<Composer {...base} addMenu={{ ...menu(), label: "Hinzufuegen" }} />);
    fireEvent.click(screen.getByRole("button", { name: "Hinzufuegen" }));
    expect(screen.getByRole("menu", { name: "Hinzufuegen" })).toBeInTheDocument();
    expect(screen.getAllByText("Hinzufuegen").length).toBeGreaterThan(0);
  });

  it("puts the upload action first and opens the same file chooser", () => {
    const click = vi.spyOn(HTMLInputElement.prototype, "click").mockImplementation(() => {});
    const panel = open({ onAttach: vi.fn(), attachLabel: "Upload a file", addMenu: menu() });
    const rows = rowsOf(panel);
    expect(rows[0]).toHaveAccessibleName("Upload a file");
    expect(rows).toHaveLength(4);
    fireEvent.click(rows[0]);
    expect(click).toHaveBeenCalled();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    click.mockRestore();
  });

  it("has no upload row without onAttach or while disabled", () => {
    const panel = open({ addMenu: menu() });
    expect(rowsOf(panel)).toHaveLength(3);
  });

  it("shows sections with titles, descriptions, checks and disabled reasons", () => {
    const panel = open({ addMenu: menu([{ title: "Plugins", items: [{ id: "g", label: "Gmail", onSelect: vi.fn() }] }]) });
    expect(within(panel).getByRole("group", { name: "Plugins" })).toBeInTheDocument();
    expect(within(panel).getByText("Set a goal to keep pursuing")).toBeInTheDocument();
    const plan = within(panel).getByRole("menuitemcheckbox", { name: /Plan mode/ });
    expect(plan).toHaveAttribute("aria-checked", "true");
    expect(within(panel).getByRole("menuitem", { name: /Goal/ })).not.toHaveAttribute("aria-checked");
    const off = within(panel).getByRole("menuitem", { name: /Edit commands/ });
    expect(off).toHaveAttribute("aria-disabled", "true");
    expect(within(off).getByText("Not available here")).toBeInTheDocument();
  });

  it("choosing an item calls onSelect and closes, except keepOpen and disabled rows", () => {
    const select = vi.fn();
    open({ addMenu: menu([], select) });
    fireEvent.click(screen.getByRole("menuitemcheckbox", { name: /Plan mode/ }));
    expect(select).toHaveBeenLastCalledWith("plan");
    expect(screen.getByRole("menu")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("menuitem", { name: /Edit commands/ }));
    expect(select).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("menuitem", { name: /Goal/ }));
    expect(select).toHaveBeenLastCalledWith("goal");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("filters a searchable section by label and description, and says when nothing matches", () => {
    const panel = open({
      addMenu: menu([
        {
          title: "Tools",
          searchable: true,
          searchPlaceholder: "Search tools",
          emptyText: "No tool found",
          items: [
            { id: "a", label: "Send email", description: "Gmail", onSelect: vi.fn() },
            { id: "b", label: "List events", description: "Calendar", onSelect: vi.fn() },
          ],
        },
      ]),
    });
    const search = within(panel).getByRole("textbox", { name: "Search tools" });
    fireEvent.change(search, { target: { value: "calendar" } });
    expect(within(panel).queryByRole("menuitem", { name: /Send email/ })).not.toBeInTheDocument();
    expect(within(panel).getByRole("menuitem", { name: /List events/ })).toBeInTheDocument();
    expect(within(panel).getByRole("menuitem", { name: /Goal/ })).toBeInTheDocument();
    fireEvent.change(search, { target: { value: "zzz" } });
    expect(within(panel).getByText("No tool found")).toBeInTheDocument();
    expect(search).toBeInTheDocument();
  });

  it("uses the default search and empty words, and shows a loading row", () => {
    const panel = open({ addMenu: menu([{ title: "Tools", searchable: true, loading: true, items: [] }]) });
    expect(within(panel).getByRole("textbox", { name: "Search" })).toBeInTheDocument();
    expect(within(panel).getByRole("status")).toHaveTextContent("Loading");
    expect(within(panel).queryByText("No matches")).not.toBeInTheDocument();
  });

  it("shows the empty text of a searchable section that has no items", () => {
    const panel = open({ addMenu: menu([{ title: "Tools", searchable: true, items: [] }]) });
    expect(within(panel).getByText("No matches")).toBeInTheDocument();
  });

  it("moves with the arrows, Home and End, skipping disabled rows, and starts on the first row", () => {
    const panel = open({ addMenu: menu() });
    const goal = within(panel).getByRole("menuitem", { name: /Goal/ });
    const plan = within(panel).getByRole("menuitemcheckbox", { name: /Plan mode/ });
    expect(document.activeElement).toBe(goal);
    fireEvent.keyDown(goal, { key: "ArrowDown" });
    expect(document.activeElement).toBe(plan);
    fireEvent.keyDown(plan, { key: "ArrowDown" });
    expect(document.activeElement).toBe(goal);
    fireEvent.keyDown(goal, { key: "ArrowUp" });
    expect(document.activeElement).toBe(plan);
    fireEvent.keyDown(plan, { key: "Home" });
    expect(document.activeElement).toBe(goal);
    fireEvent.keyDown(goal, { key: "End" });
    expect(document.activeElement).toBe(plan);
  });

  it("chooses with Enter", () => {
    const select = vi.fn();
    const panel = open({ addMenu: menu([], select) });
    fireEvent.keyDown(within(panel).getByRole("menuitem", { name: /Goal/ }), { key: "Enter" });
    expect(select).toHaveBeenCalledWith("goal");
  });

  it("Escape closes and puts focus back on the plus button", () => {
    const panel = open({ addMenu: menu() });
    fireEvent.keyDown(within(panel).getByRole("menuitem", { name: /Goal/ }), { key: "Escape" });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Add" }));
  });

  it("returns focus to the plus button after choosing", () => {
    open({ addMenu: menu() });
    fireEvent.click(screen.getByRole("menuitem", { name: /Goal/ }));
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Add" }));
  });

  it("typing in the search field does not trigger row shortcuts, and arrows leave it", () => {
    const select = vi.fn();
    const panel = open({ addMenu: menu([{ title: "Tools", searchable: true, items: [{ id: "a", label: "Alpha", onSelect: () => select("a") }] }], select) });
    const search = within(panel).getByRole("textbox", { name: "Search" });
    search.focus();
    fireEvent.keyDown(search, { key: "Home" });
    fireEvent.keyDown(search, { key: "End" });
    fireEvent.keyDown(search, { key: "a" });
    expect(document.activeElement).toBe(search);
    expect(select).not.toHaveBeenCalled();
    fireEvent.keyDown(search, { key: "ArrowDown" });
    expect(document.activeElement).toBe(within(panel).getByRole("menuitem", { name: /Alpha/ }));
  });

  it("Enter in a search field chooses the first match of that section", () => {
    const select = vi.fn();
    const panel = open({ addMenu: menu([{ title: "Tools", searchable: true, items: [{ id: "a", label: "Alpha", onSelect: () => select("a") }, { id: "b", label: "Beta", onSelect: () => select("b") }] }], select) });
    const search = within(panel).getByRole("textbox", { name: "Search" });
    fireEvent.change(search, { target: { value: "bet" } });
    fireEvent.keyDown(search, { key: "Enter" });
    expect(select).toHaveBeenCalledWith("b");
  });

  it("closes on a press outside, and the plus button toggles it", () => {
    open({ addMenu: menu() });
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("disables the plus button while the composer is disabled", () => {
    render(<Composer {...base} disabled addMenu={menu()} />);
    expect(screen.getByRole("button", { name: "Add" })).toBeDisabled();
  });

  it("keeps the plus button in the row of a narrow composer", () => {
    vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} unobserve() {} });
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ width: 300, height: 40, top: 0, left: 0, right: 300, bottom: 40, x: 0, y: 0, toJSON: () => ({}) });
    render(<Composer {...base} addMenu={menu()} toggles={[{ id: "w", label: "Web", icon: <span>i</span>, active: false, onToggle: vi.fn() }]} />);
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
});
