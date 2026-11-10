import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ComposerPills, FOLLOW_UPS_LABEL, SuggestionPills } from "./composer-pills";

describe("ComposerPills", () => {
  it("shows the starters before the first message and fills the box on click", () => {
    const onFill = vi.fn();
    const onSend = vi.fn();
    render(
      <ComposerPills followUps={[]} starters={["What can you do?"]} hasMessages={false} onSend={onSend} onFill={onFill} />
    );
    fireEvent.click(screen.getByRole("button", { name: "What can you do?" }));
    expect(onFill).toHaveBeenCalledWith("What can you do?");
    expect(onSend).not.toHaveBeenCalled();
  });

  it("shows the follow-ups after a reply and sends on click", () => {
    const onSend = vi.fn();
    render(
      <ComposerPills
        followUps={["Tell me more"]}
        starters={["What can you do?"]}
        hasMessages
        onSend={onSend}
        onFill={vi.fn()}
      />
    );
    expect(screen.getByRole("group", { name: FOLLOW_UPS_LABEL })).toBeInTheDocument();
    expect(screen.queryByText("What can you do?")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Tell me more" }));
    expect(onSend).toHaveBeenCalledWith("Tell me more");
  });

  it("shows nothing once the chat has started and there are no follow-ups", () => {
    const { container } = render(
      <ComposerPills followUps={[]} starters={["a"]} hasMessages onSend={vi.fn()} onFill={vi.fn()} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders no group for an empty list", () => {
    const { container } = render(<SuggestionPills suggestions={[]} onSelect={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  describe("disabled", () => {
    const items = ["One", "Two"];

    it("is enabled by default and selects", () => {
      const onSelect = vi.fn();
      render(<SuggestionPills suggestions={items} onSelect={onSelect} disabledReason="Wait" />);
      const pill = screen.getByRole("button", { name: "One" });
      expect(pill).not.toBeDisabled();
      expect(pill).not.toHaveAttribute("aria-disabled", "true");
      fireEvent.click(pill);
      expect(onSelect).toHaveBeenCalledWith("One");
      expect(screen.getByRole("group", { name: "Suggestions" })).not.toHaveAttribute("aria-describedby");
    });

    it("calls nothing on click, Enter or Space and sets the disabled attribute", () => {
      const onSelect = vi.fn();
      render(<SuggestionPills suggestions={items} onSelect={onSelect} disabled />);
      for (const name of items) {
        const pill = screen.getByRole("button", { name });
        expect(pill).toHaveAttribute("disabled");
        fireEvent.click(pill);
        fireEvent.keyUp(pill, { key: " " });
        fireEvent.keyDown(pill, { key: "Enter" });
        fireEvent.keyDown(pill, { key: " " });
      }
      expect(onSelect).not.toHaveBeenCalled();
      expect(screen.getByRole("group", { name: "Suggestions" })).toBeInTheDocument();
    });

    it("exposes disabledReason as the group description only while disabled", () => {
      const { rerender } = render(
        <SuggestionPills suggestions={items} onSelect={vi.fn()} disabled disabledReason="Wait for the answer first" />
      );
      expect(screen.getByRole("group", { name: "Suggestions" })).toHaveAccessibleDescription("Wait for the answer first");
      rerender(<SuggestionPills suggestions={items} onSelect={vi.fn()} disabledReason="Wait for the answer first" />);
      expect(screen.getByRole("group", { name: "Suggestions" })).not.toHaveAttribute("aria-describedby");
      expect(screen.queryByText("Wait for the answer first")).not.toBeInTheDocument();
    });

    it("restores selection when disabled goes back to false", () => {
      const onSelect = vi.fn();
      const { rerender } = render(<SuggestionPills suggestions={items} onSelect={onSelect} disabled />);
      fireEvent.click(screen.getByRole("button", { name: "Two" }));
      expect(onSelect).not.toHaveBeenCalled();
      rerender(<SuggestionPills suggestions={items} onSelect={onSelect} disabled={false} />);
      fireEvent.click(screen.getByRole("button", { name: "Two" }));
      expect(onSelect).toHaveBeenCalledWith("Two");
    });
  });
});
