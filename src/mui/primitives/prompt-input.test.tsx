import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { PromptInput } from "./prompt-input";

describe("PromptInput", () => {
  it("submits on Enter", () => {
    const onSubmit = vi.fn();
    render(
      <PromptInput defaultValue="hello" onSubmit={onSubmit}>
        <PromptInput.Textarea />
      </PromptInput>
    );
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" });
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("lets Shift+Enter add a line instead of submitting", () => {
    const onSubmit = vi.fn();
    render(
      <PromptInput defaultValue="hello" onSubmit={onSubmit}>
        <PromptInput.Textarea />
      </PromptInput>
    );
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter", shiftKey: true });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("never submits on Enter while an IME composition is in progress", () => {
    const onSubmit = vi.fn();
    render(
      <PromptInput defaultValue="hello" onSubmit={onSubmit}>
        <PromptInput.Textarea />
      </PromptInput>
    );
    const field = screen.getByRole("textbox");

    fireEvent.compositionStart(field);
    fireEvent.keyDown(field, { key: "Enter" });
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.compositionEnd(field);
    fireEvent.keyDown(field, { key: "Enter" });
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("also respects the native isComposing flag on the keydown event", () => {
    const onSubmit = vi.fn();
    render(
      <PromptInput defaultValue="hello" onSubmit={onSubmit}>
        <PromptInput.Textarea />
      </PromptInput>
    );
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter", isComposing: true });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("keeps its own value when uncontrolled", () => {
    const onSubmit = vi.fn();
    render(
      <PromptInput onSubmit={onSubmit}>
        <PromptInput.Textarea />
      </PromptInput>
    );
    const field = screen.getByRole("textbox") as HTMLTextAreaElement;
    fireEvent.change(field, { target: { value: "typed text" } });
    expect(field.value).toBe("typed text");
  });

  it("calls onValueChange and does not manage its own value when controlled", () => {
    const onValueChange = vi.fn();
    const onSubmit = vi.fn();
    render(
      <PromptInput value="hello" onValueChange={onValueChange} onSubmit={onSubmit}>
        <PromptInput.Textarea />
      </PromptInput>
    );
    const field = screen.getByRole("textbox") as HTMLTextAreaElement;
    fireEvent.change(field, { target: { value: "hello!" } });
    expect(onValueChange).toHaveBeenCalledWith("hello!");
    // The caller owns the value in controlled mode: without it feeding back in,
    // the field keeps showing the prop it was given.
    expect(field.value).toBe("hello");
  });

  it("disables submit while isLoading, even with text and Enter", () => {
    const onSubmit = vi.fn();
    render(
      <PromptInput defaultValue="hello" onSubmit={onSubmit} isLoading>
        <PromptInput.Textarea />
      </PromptInput>
    );
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("throws the documented error when a part renders outside the provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<PromptInput.Textarea />)).toThrow(
      "PromptInput parts must be used inside <PromptInput>"
    );
    spy.mockRestore();
  });
});
