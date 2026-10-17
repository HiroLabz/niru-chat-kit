import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { FileUpload } from "./file-upload";

function dragOverWindow(files: File[]) {
  fireEvent.dragEnter(window, { dataTransfer: { items: files.map(() => ({})), files } });
}

describe("FileUpload", () => {
  it("opens the picker from its trigger and hands picked files over", () => {
    const onFilesAdded = vi.fn();
    const { container } = render(
      <FileUpload onFilesAdded={onFilesAdded} accept=".pdf">
        <FileUpload.Trigger aria-label="Attach">+</FileUpload.Trigger>
      </FileUpload>
    );
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const click = vi.spyOn(input, "click");

    fireEvent.click(screen.getByRole("button", { name: "Attach" }));
    expect(click).toHaveBeenCalledTimes(1);

    const pdf = new File(["a"], "a.pdf", { type: "application/pdf" });
    const exe = new File(["b"], "b.exe", { type: "application/octet-stream" });
    fireEvent.change(input, { target: { files: [pdf, exe] } });
    expect(onFilesAdded).toHaveBeenCalledExactlyOnceWith([pdf]);
  });

  it("takes only the first file when multiple is off", () => {
    const onFilesAdded = vi.fn();
    const { container } = render(<FileUpload onFilesAdded={onFilesAdded} multiple={false} />);
    const a = new File(["a"], "a.txt", { type: "text/plain" });
    const b = new File(["b"], "b.txt", { type: "text/plain" });
    fireEvent.change(container.querySelector("input") as HTMLInputElement, { target: { files: [a, b] } });
    expect(onFilesAdded).toHaveBeenCalledWith([a]);
  });

  it("makes its single child the trigger with asChild and keeps the child's own click", () => {
    const own = vi.fn();
    const { container } = render(
      <FileUpload onFilesAdded={vi.fn()}>
        <FileUpload.Trigger asChild>
          <button type="button" onClick={own}>
            pick
          </button>
        </FileUpload.Trigger>
      </FileUpload>
    );
    const click = vi.spyOn(container.querySelector("input") as HTMLInputElement, "click");
    fireEvent.click(screen.getByRole("button", { name: "pick" }));
    expect(click).toHaveBeenCalledTimes(1);
    expect(own).toHaveBeenCalledTimes(1);
  });

  it("is operable from the keyboard: the trigger is a focusable button", () => {
    render(
      <FileUpload onFilesAdded={vi.fn()}>
        <FileUpload.Trigger aria-label="Attach">+</FileUpload.Trigger>
      </FileUpload>
    );
    const trigger = screen.getByRole("button", { name: "Attach" });
    trigger.focus();
    expect(trigger).toHaveFocus();
  });

  it("shows Content full-screen while files are dragged over the window, and hides it on drop", () => {
    const onFilesAdded = vi.fn();
    render(
      <FileUpload onFilesAdded={onFilesAdded}>
        <FileUpload.Content>Drop here</FileUpload.Content>
      </FileUpload>
    );
    expect(screen.queryByText("Drop here")).toBeNull();
    const file = new File(["a"], "a.txt", { type: "text/plain" });
    dragOverWindow([file]);
    expect(screen.getByText("Drop here")).toBeInTheDocument();
    fireEvent.drop(window, { dataTransfer: { files: [file] } });
    expect(screen.queryByText("Drop here")).toBeNull();
    expect(onFilesAdded).toHaveBeenCalledWith([file]);
  });

  it("does nothing while disabled", () => {
    const onFilesAdded = vi.fn();
    const { container } = render(
      <FileUpload onFilesAdded={onFilesAdded} disabled>
        <FileUpload.Trigger aria-label="Attach">+</FileUpload.Trigger>
        <FileUpload.Content>Drop here</FileUpload.Content>
      </FileUpload>
    );
    const click = vi.spyOn(container.querySelector("input") as HTMLInputElement, "click");
    fireEvent.click(screen.getByRole("button", { name: "Attach" }));
    dragOverWindow([new File(["a"], "a.txt")]);
    expect(click).not.toHaveBeenCalled();
    expect(screen.queryByText("Drop here")).toBeNull();
  });

  it("scopes a zone to its own box and shows Content inside it", () => {
    render(
      <FileUpload scope="zone" onFilesAdded={vi.fn()}>
        <div>transcript</div>
        <FileUpload.Content>Drop here</FileUpload.Content>
      </FileUpload>
    );
    fireEvent.dragEnter(screen.getByText("transcript").parentElement as HTMLElement);
    expect(screen.getByText("transcript").parentElement).toContainElement(screen.getByText("Drop here"));
  });

  it("keeps a zone lit while a drag moves between its children, and drops it on leave", () => {
    render(
      <FileUpload scope="zone" onFilesAdded={vi.fn()}>
        <div>transcript</div>
        <div>composer</div>
        <FileUpload.Content>Drop here</FileUpload.Content>
      </FileUpload>
    );
    const transcript = screen.getByText("transcript");
    const composer = screen.getByText("composer");
    fireEvent.dragEnter(transcript);
    fireEvent.dragEnter(composer);
    fireEvent.dragLeave(transcript);
    expect(screen.getByText("Drop here")).toBeInTheDocument();
    fireEvent.dragLeave(composer);
    expect(screen.queryByText("Drop here")).toBeNull();
  });
});
