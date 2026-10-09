import { describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { Composer, type ComposerProps } from "./composer";

function Harness(props: Partial<ComposerProps> & { onSubmit?: () => void }) {
  const [value, setValue] = useState(props.value ?? "");
  return (
    <Composer
      {...props}
      value={value}
      onChange={setValue}
      onSubmit={props.onSubmit ?? vi.fn()}
    />
  );
}

describe("Composer", () => {
  it("keeps Send off until there is text, then sends on click and on Enter", () => {
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
    const box = screen.getByRole("textbox");
    fireEvent.change(box, { target: { value: "hello" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(box, { key: "Enter" });
    expect(onSubmit).toHaveBeenCalledTimes(2);
    fireEvent.keyDown(box, { key: "Enter", shiftKey: true });
    expect(onSubmit).toHaveBeenCalledTimes(2);
  });

  it("turns Send into Stop while a run is busy", () => {
    const onStop = vi.fn();
    render(<Harness busy onStop={onStop} />);
    expect(screen.queryByRole("button", { name: "Send" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Stop" }));
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it("does nothing when disabled", () => {
    render(<Harness disabled value="text" />);
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
    expect(screen.getByRole("textbox")).toBeDisabled();
  });

  it("offers attach only when the surface handles files, and hands the files over", () => {
    const { rerender, container } = render(<Harness />);
    expect(screen.queryByRole("button", { name: "Attach a document" })).not.toBeInTheDocument();
    const onAttach = vi.fn();
    rerender(<Harness onAttach={onAttach} />);
    expect(screen.getByRole("button", { name: "Attach a document" })).toBeInTheDocument();
    const file = new File(["x"], "notes.txt", { type: "text/plain" });
    fireEvent.change(container.querySelector("input[type=file]") as HTMLInputElement, { target: { files: [file] } });
    expect(onAttach).toHaveBeenCalledWith([file]);
  });

  it("lists attachments as chips that can be removed", () => {
    const onRemoveAttachment = vi.fn();
    render(
      <Harness
        attachments={[{ id: "f1", name: "plan.pdf" }]}
        onRemoveAttachment={onRemoveAttachment}
      />
    );
    expect(screen.getByText("plan.pdf")).toBeInTheDocument();
    fireEvent.click(document.querySelector(".MuiChip-deleteIcon") as Element);
    expect(onRemoveAttachment).toHaveBeenCalledWith("f1");
  });

  it("fills the box from a matching suggestion with the arrow keys and Enter, without sending", () => {
    const onSubmit = vi.fn();
    render(<Harness suggestions={["Summarize my latest activity"]} onSubmit={onSubmit} />);
    const box = screen.getByRole("textbox");
    fireEvent.change(box, { target: { value: "summar" } });
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    fireEvent.keyDown(box, { key: "ArrowDown" });
    fireEvent.keyDown(box, { key: "Enter" });
    expect(box).toHaveValue("Summarize my latest activity");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("opens and closes the settings body in flow", () => {
    render(<Harness settings={<p>Reasoning effort</p>} />);
    expect(screen.queryByText("Reasoning effort")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Run settings" }));
    expect(screen.getByText("Reasoning effort")).toBeInTheDocument();
  });

  it("passes root attributes to the surface", () => {
    const { container } = render(<Harness rootProps={{ "data-ph-mask": "" }} />);
    expect(container.querySelector("[data-ph-mask]")).not.toBeNull();
  });
});
