import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { PromptSuggestion } from "./prompt-suggestion";

describe("PromptSuggestion", () => {
  it("calls onSelect with its own text when clicked", () => {
    const onSelect = vi.fn();
    render(<PromptSuggestion onSelect={onSelect}>Summarize this</PromptSuggestion>);

    fireEvent.click(screen.getByText("Summarize this"));

    expect(onSelect).toHaveBeenCalledWith("Summarize this");
  });

  it("does not call onSelect when disabled", () => {
    const onSelect = vi.fn();
    render(
      <PromptSuggestion onSelect={onSelect} disabled>
        Summarize this
      </PromptSuggestion>
    );

    fireEvent.click(screen.getByText("Summarize this"));

    expect(onSelect).not.toHaveBeenCalled();
  });

  it("emphasises the case-insensitive matching part when highlight is set", () => {
    render(
      <PromptSuggestion onSelect={vi.fn()} highlight="sum">
        Summarize this
      </PromptSuggestion>
    );

    const mark = screen.getByText("Sum", { selector: "mark" });
    expect(mark.tagName).toBe("MARK");
    expect(mark.parentElement?.textContent).toBe("Summarize this");
  });

  it("renders the label unchanged when highlight is absent", () => {
    render(<PromptSuggestion onSelect={vi.fn()}>Summarize this</PromptSuggestion>);

    expect(screen.queryByText("Sum", { selector: "mark" })).not.toBeInTheDocument();
    expect(screen.getByText("Summarize this")).toBeInTheDocument();
  });

  it("still calls onSelect with the full text when highlighted", () => {
    const onSelect = vi.fn();
    render(
      <PromptSuggestion onSelect={onSelect} highlight="sum">
        Summarize this
      </PromptSuggestion>
    );

    fireEvent.click(screen.getByText("Sum", { selector: "mark" }));

    expect(onSelect).toHaveBeenCalledWith("Summarize this");
  });

  it("defaults to a pill (Chip) when no highlight is given", () => {
    render(<PromptSuggestion onSelect={vi.fn()}>Summarize this</PromptSuggestion>);

    expect(screen.getByText("Summarize this").closest(".MuiChip-root")).not.toBeNull();
  });

  it("defaults to a full-width row (not a Chip) once highlight is given, matching prompt-kit's own autocomplete look", () => {
    render(
      <PromptSuggestion onSelect={vi.fn()} highlight="sum">
        Summarize this
      </PromptSuggestion>
    );

    const mark = screen.getByText("Sum", { selector: "mark" });
    expect(mark.closest(".MuiChip-root")).toBeNull();
    expect(mark.closest("button")?.tagName).toBe("BUTTON");
  });

  it("can be forced into the row shape even without a highlight", () => {
    render(
      <PromptSuggestion onSelect={vi.fn()} variant="row">
        Summarize this
      </PromptSuggestion>
    );

    expect(screen.getByText("Summarize this").closest(".MuiChip-root")).toBeNull();
    expect(screen.getByText("Summarize this").closest("button")?.tagName).toBe("BUTTON");
  });

  it("can be forced into the pill shape even with a highlight", () => {
    render(
      <PromptSuggestion onSelect={vi.fn()} highlight="sum" variant="pill">
        Summarize this
      </PromptSuggestion>
    );

    const mark = screen.getByText("Sum", { selector: "mark" });
    expect(mark.closest(".MuiChip-root")).not.toBeNull();
  });

  it("dims the non-matching part of the label when highlighted, prompt-kit's own highlight treatment", () => {
    render(
      <PromptSuggestion onSelect={vi.fn()} highlight="sum">
        Summarize this
      </PromptSuggestion>
    );

    const rest = screen.getByText("marize this");
    expect(rest.tagName).toBe("SPAN");
    expect(rest).not.toBe(screen.getByText("Sum", { selector: "mark" }));
  });

  it("calls onSelect with the full text when the row variant is clicked", () => {
    const onSelect = vi.fn();
    render(
      <PromptSuggestion onSelect={onSelect} variant="row">
        Summarize this
      </PromptSuggestion>
    );

    fireEvent.click(screen.getByText("Summarize this"));

    expect(onSelect).toHaveBeenCalledWith("Summarize this");
  });

  /**
   * Regression: the three highlight pieces (dimmed prefix, `<mark>`, dimmed suffix)
   * used to render as direct children of the "row" variant's flex `ButtonBase`, which
   * blockifies them — block-edge whitespace collapsing then ate the space on either
   * side of the match, so "What can you help me with?" rendered as
   * "What can youhelpme with?". Asserting `textContent` (not individual `getByText`
   * calls, which can still find trimmed fragments) against the exact source string is
   * what would catch that: it is checked for a match in the middle, at the start and
   * at the end of the label.
   */
  it("preserves every space around a highlighted match in the middle of the label", () => {
    const label = "What can you help me with?";
    render(
      <PromptSuggestion onSelect={vi.fn()} highlight="help">
        {label}
      </PromptSuggestion>
    );

    expect(screen.getByRole("button").textContent).toBe(label);
  });

  it("preserves every space around a highlighted match at the start of the label", () => {
    const label = "What can you help me with?";
    render(
      <PromptSuggestion onSelect={vi.fn()} highlight="What">
        {label}
      </PromptSuggestion>
    );

    expect(screen.getByRole("button").textContent).toBe(label);
  });

  it("preserves every space around a highlighted match at the end of the label", () => {
    const label = "What can you help me with?";
    render(
      <PromptSuggestion onSelect={vi.fn()} highlight="with?">
        {label}
      </PromptSuggestion>
    );

    expect(screen.getByRole("button").textContent).toBe(label);
  });
});
