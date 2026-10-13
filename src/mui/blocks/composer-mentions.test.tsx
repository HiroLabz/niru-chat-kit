import { describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ComposerMention } from "../../core/mentions";
import type { SlashCommand } from "../../core/slash-commands";
import { Composer, type ComposerProps } from "./composer";

const items: ComposerMention[] = [
  { id: "gmail", label: "Gmail", description: "Read and send email", group: "Apps", keywords: ["mail"], icon: <span>G</span> },
  { id: "cal", label: "Calendar", description: "Your events", group: "Apps" },
  { id: "read", label: "Read file", description: "Open a file", group: "Niru" },
  { id: "jp", label: "日本語" },
];

function Harness(props: Partial<ComposerProps> & { start?: string; onSubmit?: () => void }) {
  const [value, setValue] = useState(props.start ?? "");
  return <Composer mentions={items} {...props} value={value} onChange={setValue} onSubmit={props.onSubmit ?? vi.fn()} />;
}

function type(text: string) {
  const box = screen.getByRole("combobox") as HTMLTextAreaElement;
  fireEvent.change(box, { target: { value: text } });
  return box;
}

describe("Composer mentions", () => {
  it("without the prop typing @ opens nothing and the field is a plain textbox", () => {
    render(<Harness mentions={undefined} />);
    const box = screen.getByRole("textbox");
    fireEvent.change(box, { target: { value: "@" } });
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("opens on @ at the start or after whitespace, grouped, and filters while typing", () => {
    render(<Harness />);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    type("@");
    expect(screen.getByRole("listbox", { name: "Mentions" })).toBeInTheDocument();
    expect(screen.getAllByRole("option")).toHaveLength(4);
    expect(screen.getByText("Apps")).toBeInTheDocument();
    expect(screen.getByText("Read and send email")).toBeInTheDocument();
    type("tell @cal");
    expect(screen.getAllByRole("option")).toHaveLength(1);
    type("tell\n@mail");
    expect(screen.getAllByRole("option")).toHaveLength(1);
    expect(screen.getByRole("option")).toHaveTextContent("Gmail");
  });

  it("stays closed for an email address and an @ inside a word", () => {
    render(<Harness />);
    type("write me@example.com");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    type("word@");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("stays open over spaces while something matches, and closes when nothing does", () => {
    render(<Harness />);
    type("@Read fi");
    expect(screen.getAllByRole("option")).toHaveLength(1);
    type("@Read fix");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    type("@zzz");
    expect(screen.getByText("No matches")).toBeInTheDocument();
  });

  it("shows custom empty and loading words", () => {
    render(<Harness mentions={[]} mentionsEmptyText="Nothing here" mentionsLabel="Tools" />);
    type("@");
    expect(screen.getByRole("listbox", { name: "Tools" })).toHaveTextContent("Nothing here");
  });

  it("shows a loading row while items arrive", () => {
    render(<Harness mentions={[]} mentionsLoading />);
    type("@");
    expect(screen.getByRole("status")).toHaveTextContent("Loading");
    expect(screen.queryByText("No matches")).not.toBeInTheDocument();
  });

  it("picks with Enter: writes @Label and a space, puts the caret after it, calls onMention and onChange", () => {
    const onMention = vi.fn();
    render(<Harness onMention={onMention} />);
    const box = type("hi @ca");
    fireEvent.keyDown(box, { key: "Enter" });
    expect(box).toHaveValue("hi @Calendar ");
    expect(box.selectionStart).toBe("hi @Calendar ".length);
    expect(document.activeElement).toBe(box);
    expect(onMention).toHaveBeenCalledWith(items[1]);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("picks with Tab and with a click that keeps focus in the box", () => {
    render(<Harness onMention={vi.fn()} />);
    let box = type("@gm");
    fireEvent.keyDown(box, { key: "Tab" });
    expect(box).toHaveValue("@Gmail ");
    box = type("@Read f");
    const option = screen.getByRole("option");
    expect(fireEvent.mouseDown(option)).toBe(false);
    fireEvent.click(option);
    expect(box).toHaveValue("@Read file ");
  });

  it("moves with the arrows, Home and End; Escape closes and keeps the text", () => {
    render(<Harness />);
    const box = type("@");
    expect(screen.getAllByRole("option")[0]).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(box, { key: "ArrowDown" });
    expect(screen.getAllByRole("option")[1]).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(box, { key: "End" });
    expect(screen.getAllByRole("option")[3]).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(box, { key: "ArrowDown" });
    expect(screen.getAllByRole("option")[0]).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(box, { key: "ArrowUp" });
    expect(screen.getAllByRole("option")[3]).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(box, { key: "Escape" });
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(box).toHaveValue("@");
  });

  it("with nothing matching, Enter sends as usual", () => {
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} start="x" />);
    const box = type("@zzz");
    fireEvent.keyDown(box, { key: "Enter" });
    expect(onSubmit).toHaveBeenCalled();
  });

  it("replaces the whole word when the caret was in the middle of it", () => {
    render(<Harness />);
    const box = type("hi @calen now");
    box.setSelectionRange(8, 8);
    fireEvent.select(box);
    expect(screen.getAllByRole("option")).toHaveLength(1);
    fireEvent.keyDown(box, { key: "Enter" });
    expect(box).toHaveValue("hi @Calendar now");
  });

  it("finds a non-Latin label", () => {
    render(<Harness />);
    const box = type("@日");
    fireEvent.keyDown(box, { key: "Enter" });
    expect(box).toHaveValue("@日本語 ");
  });

  it("is a combobox that points at the open list", () => {
    render(<Harness />);
    const box = type("@");
    expect(box).toHaveAttribute("aria-expanded", "true");
    expect(box).toHaveAttribute("aria-controls", screen.getByRole("listbox").id);
    expect(box.getAttribute("aria-activedescendant")).toBe(screen.getAllByRole("option")[0].id);
  });

  it("is never open together with the slash list", () => {
    const commands: SlashCommand[] = [{ id: "s", name: "summarize", insert: "Summarize: " }];
    render(<Harness commands={commands} />);
    type("/");
    expect(screen.getByRole("listbox", { name: "Commands" })).toBeInTheDocument();
    type("/@");
    expect(screen.getAllByRole("listbox")).toHaveLength(1);
    type("/sum @ca");
    expect(screen.getAllByRole("listbox")).toHaveLength(1);
    expect(screen.getByRole("listbox", { name: "Mentions" })).toBeInTheDocument();
    type("@");
    expect(screen.getAllByRole("listbox")).toHaveLength(1);
    expect(screen.getByRole("listbox", { name: "Mentions" })).toBeInTheDocument();
  });
});
