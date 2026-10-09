import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { REQUIRED_FIELD_ERROR, type ApprovalField, type ApprovalInterrupt } from "../../core/approval";
import { APPROVAL_INTERRUPT_KIND } from "../../core/approval-answers";
import { ChatKitProvider } from "../theme";
import { InterruptPrompt } from "./interrupt-prompt";

const FIELDS: ApprovalField[] = [
  { name: "reason", type: "string", description: "Why", required: true, repeated: false, enum_values: [] },
  { name: "ceiling", type: "number", description: "Ceiling", required: false, repeated: false, enum_values: [] },
];

function approval(fields: ApprovalField[] = []): ApprovalInterrupt {
  return {
    kind: APPROVAL_INTERRUPT_KIND,
    question: "Approve the refund action?",
    options: ["approve", "deny"],
    can_edit: false,
    tool: "refund",
    fields,
  };
}

function show(interrupt: ApprovalInterrupt | { kind: string; question: string }, onAnswer = vi.fn()) {
  render(
    <ChatKitProvider>
      <InterruptPrompt interrupt={interrupt} onAnswer={onAnswer} />
    </ChatKitProvider>
  );
  return onAnswer;
}

describe("InterruptPrompt", () => {
  it("keeps the free-text box for a plain question and trims the answer", () => {
    const onAnswer = show({ kind: "question", question: "Which region?" });
    expect(screen.getByText("Waiting for your answer")).toBeInTheDocument();
    const answer = screen.getByRole("button", { name: "Answer" });
    expect(answer).toBeDisabled();
    fireEvent.change(screen.getByPlaceholderText("Your answer"), { target: { value: "  EU  " } });
    fireEvent.click(answer);
    expect(onAnswer).toHaveBeenCalledWith("EU");
  });

  it("approves and denies with no form when none was authored", () => {
    const onAnswer = show(approval());
    expect(screen.getByText("Approval needed")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Approve" }));
    fireEvent.click(screen.getByRole("button", { name: "Deny" }));
    expect(onAnswer).toHaveBeenNthCalledWith(1, "approve");
    expect(onAnswer).toHaveBeenNthCalledWith(2, "deny");
  });

  it("sends coerced form values with the approval and blocks a missing required field", () => {
    const onAnswer = show(approval(FIELDS));
    fireEvent.click(screen.getByRole("button", { name: "Approve" }));
    expect(onAnswer).not.toHaveBeenCalled();
    expect(screen.getByText(REQUIRED_FIELD_ERROR)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Why/), { target: { value: "verified" } });
    fireEvent.change(screen.getByLabelText(/Ceiling/), { target: { value: "50" } });
    fireEvent.click(screen.getByRole("button", { name: "Approve" }));
    expect(onAnswer).toHaveBeenCalledWith("approve", { reason: "verified", ceiling: 50 });
  });

  it("never blocks a denial on the form", () => {
    const onAnswer = show(approval(FIELDS));
    fireEvent.click(screen.getByRole("button", { name: "Deny" }));
    expect(onAnswer).toHaveBeenCalledWith("deny");
  });

  it("keeps the engine's line breaks in the paused message", () => {
    show({ kind: APPROVAL_INTERRUPT_KIND, question: "Needs approval\n\nTool: send_email" });
    expect(getComputedStyle(screen.getByText(/Tool: send_email/)).whiteSpace).toBe("pre-wrap");
  });

  describe("editing the call", () => {
    const editable = {
      ...approval(),
      can_edit: true,
      actions: [{ name: "refund", args: { order: "A1", amount: 500, notify: true, lines: [1] } }],
    } as ApprovalInterrupt;

    it("hides Edit unless the pause allows it", () => {
      show(approval());
      expect(screen.queryByRole("button", { name: "Edit" })).toBeNull();
    });

    it("sends the changed arguments as an edit", () => {
      const onAnswer = show(editable);
      fireEvent.click(screen.getByRole("button", { name: "Edit" }));
      fireEvent.change(screen.getByLabelText("amount"), { target: { value: "50" } });
      fireEvent.change(screen.getByLabelText("lines"), { target: { value: "[1, 2]" } });
      fireEvent.click(screen.getByRole("button", { name: "Approve with changes" }));
      expect(onAnswer).toHaveBeenCalledWith("edit", {
        edited_action: { name: "refund", args: { order: "A1", amount: 50, notify: true, lines: [1, 2] } },
      });
    });

    it("blocks invalid JSON", () => {
      const onAnswer = show(editable);
      fireEvent.click(screen.getByRole("button", { name: "Edit" }));
      fireEvent.change(screen.getByLabelText("lines"), { target: { value: "[1," } });
      fireEvent.click(screen.getByRole("button", { name: "Approve with changes" }));
      expect(onAnswer).not.toHaveBeenCalled();
      expect(screen.getByText("Enter valid JSON.")).toBeInTheDocument();
    });
  });

  it("says approve and deny cover every call when several wait", () => {
    show({
      ...approval(),
      actions: [
        { name: "a", args: {} },
        { name: "b", args: {} },
      ],
    } as ApprovalInterrupt);
    expect(screen.getByText(/applies to all of them/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit" })).toBeNull();
  });
});
