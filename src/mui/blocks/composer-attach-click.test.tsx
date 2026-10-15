import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Composer } from "./composer";
import { ComposerAttachmentList } from "./index";

const base = { value: "", onChange: vi.fn(), onSubmit: vi.fn(), onAttach: vi.fn() };

describe("Composer onAttachClick", () => {
  it("opens the file chooser at once without it", () => {
    const { container } = render(<Composer {...base} />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const click = vi.spyOn(input, "click");
    fireEvent.click(screen.getByRole("button", { name: "Attach a document" }));
    expect(click).toHaveBeenCalledTimes(1);
  });

  it("hands the chooser to the app instead of opening it", () => {
    const onAttachClick = vi.fn();
    const { container } = render(<Composer {...base} onAttachClick={onAttachClick} />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const click = vi.spyOn(input, "click");
    fireEvent.click(screen.getByRole("button", { name: "Attach a document" }));
    expect(onAttachClick).toHaveBeenCalledTimes(1);
    expect(click).not.toHaveBeenCalled();
    onAttachClick.mock.calls[0][0]();
    expect(click).toHaveBeenCalledTimes(1);
  });
});

describe("ComposerAttachmentList export", () => {
  it("draws read-only chips without a remove button", () => {
    render(<ComposerAttachmentList attachments={[{ id: "a", name: "report.pdf", kind: "pdf" }]} />);
    expect(screen.getByText("report.pdf")).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();
  });
});
