import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { PromptQueue } from "./prompt-queue";
import { Composer } from "./composer";

const items = [
  { id: "a", text: "First thing" },
  { id: "b", text: "Second thing" },
];

function handlers() {
  return { onSteer: vi.fn(), onEdit: vi.fn(), onDelete: vi.fn() };
}

describe("PromptQueue", () => {
  it("renders nothing without items or a note", () => {
    const { container } = render(<PromptQueue items={[]} {...handlers()} />);
    expect(container.querySelector('[data-chat="prompt-queue"]')).toBeNull();
  });

  it("shows the header and a row per prompt", () => {
    render(<PromptQueue items={items} {...handlers()} />);
    expect(screen.getByText("Queued")).toBeInTheDocument();
    expect(screen.getByText("First thing")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Edit" })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "Delete" })).toHaveLength(2);
  });

  it("calls the handlers with the row id", () => {
    const h = handlers();
    render(<PromptQueue items={items} {...h} />);
    fireEvent.click(screen.getByRole("button", { name: "Steer: Second thing" }));
    expect(h.onSteer).toHaveBeenCalledWith("b");
    fireEvent.click(screen.getAllByRole("button", { name: "Edit" })[0]);
    expect(h.onEdit).toHaveBeenCalledWith("a");
    fireEvent.click(screen.getAllByRole("button", { name: "Delete" })[1]);
    expect(h.onDelete).toHaveBeenCalledWith("b");
  });

  it("hides Steer when canSteer is false", () => {
    render(<PromptQueue items={items} {...handlers()} canSteer={false} />);
    expect(screen.queryByText("Steer")).toBeNull();
    expect(screen.getAllByRole("button", { name: "Edit" })).toHaveLength(2);
  });

  it("shows a spinner and waits while a row is steering", () => {
    render(<PromptQueue items={items} {...handlers()} steering={["a"]} />);
    const steer = screen.getByRole("button", { name: "Steer: First thing" });
    expect(steer).toBeDisabled();
    expect(steer).toHaveAttribute("aria-busy", "true");
    expect(steer.querySelector('[role="progressbar"]')).not.toBeNull();
  });

  it("shows the note and overrides labels", () => {
    render(<PromptQueue items={items} {...handlers()} note="Not now." labels={{ heading: "Up next", edit: "Change" }} />);
    expect(screen.getByRole("status")).toHaveTextContent("Not now.");
    expect(screen.getByText("Up next")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Change" })).toHaveLength(2);
  });
});

describe("Composer queue", () => {
  it("draws the queue inside the composer and still sends while running", () => {
    const onSubmit = vi.fn();
    render(<Composer value="more" onChange={vi.fn()} onSubmit={onSubmit} onStop={vi.fn()} running queue={{ items, ...handlers() }} />);
    expect(screen.getByText("First thing")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("draws no queue without the prop", () => {
    const { container } = render(<Composer value="" onChange={vi.fn()} onSubmit={vi.fn()} />);
    expect(container.querySelector('[data-chat="prompt-queue"]')).toBeNull();
  });
});
