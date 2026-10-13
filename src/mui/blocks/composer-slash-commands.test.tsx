import { describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import type { SlashCommand } from "../../core/slash-commands";
import { Composer, type ComposerProps } from "./composer";

const commands: SlashCommand[] = [
  { id: "sum", name: "summarize", description: "Short version", insert: "Summarize this: ", group: "Prompts" },
  { id: "tr", name: "translate", description: "Another language", insert: "Translate to ", group: "Prompts" },
  { id: "clear", name: "clear", description: "Start over", group: "Actions" },
  { id: "off", name: "summon", description: "Not available", insert: "x", disabled: true, group: "Actions" },
];

function Harness(props: Partial<ComposerProps> & { start?: string; onSubmit?: () => void }) {
  const [value, setValue] = useState(props.start ?? "");
  return <Composer commands={commands} {...props} value={value} onChange={setValue} onSubmit={props.onSubmit ?? vi.fn()} />;
}

function type(text: string) {
  const box = screen.getByRole("combobox");
  fireEvent.change(box, { target: { value: text } });
  return box as HTMLTextAreaElement;
}

describe("Composer slash commands", () => {
  it("opens on a slash, filters while typing and closes when the text is no longer a command", () => {
    render(<Harness />);
    expect(screen.queryByRole("listbox", { name: "Commands" })).not.toBeInTheDocument();
    type("/");
    expect(screen.getAllByRole("option")).toHaveLength(4);
    expect(screen.getByText("Prompts")).toBeInTheDocument();
    expect(screen.getByText("/summarize")).toBeInTheDocument();
    expect(screen.getByText("Short version")).toBeInTheDocument();
    type("/tr");
    expect(screen.getAllByRole("option")).toHaveLength(1);
    type("/tr and more");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    type("so and/or");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("picks with the keyboard: inserts the template, puts the caret after it and calls onCommand", () => {
    const onCommand = vi.fn();
    render(<Harness onCommand={onCommand} />);
    const box = type("/");
    expect(screen.getAllByRole("option")[0]).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(box, { key: "ArrowDown" });
    fireEvent.keyDown(box, { key: "Enter" });
    expect(box).toHaveValue("Translate to ");
    expect(box.selectionStart).toBe("Translate to ".length);
    expect(document.activeElement).toBe(box);
    expect(onCommand).toHaveBeenCalledWith(commands[1]);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("picks with Tab, and with a click that does not take focus from the box", () => {
    const onCommand = vi.fn();
    render(<Harness onCommand={onCommand} />);
    const box = type("/sum");
    fireEvent.keyDown(box, { key: "Tab" });
    expect(box).toHaveValue("Summarize this: ");
    type("/");
    const row = screen.getByText("/translate");
    expect(fireEvent.mouseDown(row)).toBe(false);
    fireEvent.click(row);
    expect(box).toHaveValue("Translate to ");
    expect(onCommand).toHaveBeenCalledTimes(2);
  });

  it("wraps with the arrows, jumps with Home and End and follows the mouse", () => {
    render(<Harness />);
    const box = type("/");
    const selected = () => screen.getAllByRole("option").findIndex((row) => row.getAttribute("aria-selected") === "true");
    expect(selected()).toBe(0);
    fireEvent.keyDown(box, { key: "ArrowUp" });
    expect(selected()).toBe(2);
    fireEvent.keyDown(box, { key: "ArrowDown" });
    expect(selected()).toBe(0);
    fireEvent.keyDown(box, { key: "End" });
    expect(selected()).toBe(2);
    fireEvent.keyDown(box, { key: "Home" });
    expect(selected()).toBe(0);
    fireEvent.mouseEnter(screen.getByText("/clear"));
    expect(selected()).toBe(2);
  });

  it("clears the token for an action command and leaves the rest of the text", () => {
    const onCommand = vi.fn();
    render(<Harness onCommand={onCommand} />);
    const box = type("/cl");
    fireEvent.keyDown(box, { key: "Enter" });
    expect(box).toHaveValue("");
    expect(onCommand).toHaveBeenCalledWith(commands[2]);
  });

  it("does not submit on Enter while the list is open with a match", () => {
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);
    const box = type("/sum");
    fireEvent.keyDown(box, { key: "Enter" });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("closes on Escape, keeps the text and stays closed until the text changes", () => {
    render(<Harness />);
    const box = type("/sum");
    fireEvent.keyDown(box, { key: "Escape" });
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(box).toHaveValue("/sum");
    fireEvent.keyDown(box, { key: "ArrowDown" });
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    type("/summ");
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  it("says nothing matches and lets Enter send the text as it is", () => {
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} commandsEmptyText="Nothing like that" />);
    const box = type("/zzz");
    expect(screen.getByText("Nothing like that")).toBeInTheDocument();
    expect(screen.queryAllByRole("option")).toHaveLength(0);
    fireEvent.keyDown(box, { key: "Enter" });
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("shows disabled commands but cannot pick them", () => {
    const onCommand = vi.fn();
    render(<Harness onCommand={onCommand} />);
    const box = type("/sum");
    const rows = screen.getAllByRole("option");
    expect(rows).toHaveLength(2);
    expect(rows[1]).toHaveAttribute("aria-disabled", "true");
    expect(rows[0]).toHaveAttribute("aria-disabled", "false");
    fireEvent.click(rows[1]);
    expect(onCommand).not.toHaveBeenCalled();
    fireEvent.keyDown(box, { key: "ArrowDown" });
    expect(rows[0]).toHaveAttribute("aria-selected", "true");
    expect(box).toHaveValue("/sum");
  });

  it("ends the list with a manage row that calls onManageCommands and closes the list", () => {
    const onManageCommands = vi.fn();
    render(<Harness onManageCommands={onManageCommands} manageCommandsLabel="Change commands" />);
    const box = type("/");
    const rows = screen.getAllByRole("option");
    expect(rows[rows.length - 1]).toHaveTextContent("Change commands");
    fireEvent.click(rows[rows.length - 1]);
    expect(onManageCommands).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(box).toHaveValue("/");
  });

  it("reaches the manage row with the keyboard, also when nothing matches", () => {
    const onManageCommands = vi.fn();
    render(<Harness onManageCommands={onManageCommands} />);
    const box = type("/zzz");
    fireEvent.keyDown(box, { key: "ArrowDown" });
    fireEvent.keyDown(box, { key: "Enter" });
    expect(onManageCommands).toHaveBeenCalledTimes(1);
  });

  it("follows the combobox pattern while open and has no such attributes without commands", () => {
    const { unmount } = render(<Harness />);
    const box = type("/");
    expect(box).toHaveAttribute("role", "combobox");
    expect(box).toHaveAttribute("aria-expanded", "true");
    const list = screen.getByRole("listbox", { name: "Commands" });
    expect(box).toHaveAttribute("aria-controls", list.id);
    const active = screen.getAllByRole("option")[0];
    expect(box).toHaveAttribute("aria-activedescendant", active.id);
    expect(screen.getByText("Prompts")).toHaveAttribute("role", "presentation");
    fireEvent.keyDown(box, { key: "Escape" });
    expect(box).toHaveAttribute("aria-expanded", "false");
    expect(box).not.toHaveAttribute("aria-controls");
    expect(box).not.toHaveAttribute("aria-activedescendant");
    unmount();

    render(<Harness commands={undefined} />);
    const plain = screen.getByRole("textbox");
    fireEvent.change(plain, { target: { value: "/" } });
    expect(plain).not.toHaveAttribute("role");
    expect(plain).not.toHaveAttribute("aria-activedescendant");
    expect(plain).not.toHaveAttribute("aria-autocomplete");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("names the list from commandsLabel and stays quiet for an empty list", () => {
    const { unmount } = render(<Harness commandsLabel="Slash commands" />);
    type("/");
    expect(screen.getByRole("listbox", { name: "Slash commands" })).toBeInTheDocument();
    unmount();
    render(<Harness commands={[]} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "/" } });
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("closes when the caret leaves the command token", () => {
    render(<Harness />);
    const box = type("/sum");
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    box.setSelectionRange(0, 0);
    fireEvent.select(box);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("closes on a click outside the composer", () => {
    render(<Harness />);
    type("/");
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("keeps the autocomplete suggestions out of the way while the command list is open", () => {
    render(<Harness suggestions={["/summarize the report"]} />);
    type("/summ");
    expect(screen.getAllByRole("listbox")).toHaveLength(1);
    expect(screen.getByRole("listbox", { name: "Commands" })).toBeInTheDocument();
  });
});
