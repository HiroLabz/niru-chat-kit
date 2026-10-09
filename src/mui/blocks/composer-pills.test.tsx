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
});
