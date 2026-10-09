import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ApprovalInterrupt } from "../../core/approval";
import { APPROVAL_INTERRUPT_KIND, APPROVE_ANSWER, DENY_ANSWER } from "../../core/approval-answers";
import { ChatKitProvider } from "../theme";
import { ApprovalCard } from "./approval-card";

const INTERRUPT: ApprovalInterrupt = {
  kind: APPROVAL_INTERRUPT_KIND,
  question: "",
  actions: [],
  can_edit: false,
  fields: [],
};
const REASON = "You approved this. It needs a different person to finish.";

function show(disabledAnswers?: Partial<Record<string, string>>) {
  const onAnswer = vi.fn();
  render(
    <ChatKitProvider>
      <ApprovalCard interrupt={INTERRUPT} onAnswer={onAnswer} disabledAnswers={disabledAnswers} />
    </ChatKitProvider>
  );
  return onAnswer;
}

describe("ApprovalCard", () => {
  it("answers Approve and Deny when nothing is disabled", () => {
    const onAnswer = show();
    fireEvent.click(screen.getByRole("button", { name: "Approve" }));
    fireEvent.click(screen.getByRole("button", { name: "Deny" }));
    expect(onAnswer).toHaveBeenNthCalledWith(1, APPROVE_ANSWER);
    expect(onAnswer).toHaveBeenNthCalledWith(2, DENY_ANSWER);
  });

  it("disables only the answers listed and still lets the others through", () => {
    const onAnswer = show({ [APPROVE_ANSWER]: REASON });
    const approve = screen.getByRole("button", { name: "Approve" });
    expect(approve).toBeDisabled();
    fireEvent.click(approve);
    expect(onAnswer).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Deny" }));
    expect(onAnswer).toHaveBeenCalledWith(DENY_ANSWER);
  });

  it("shows the reason as a tooltip on the disabled answer", async () => {
    show({ [APPROVE_ANSWER]: REASON });
    fireEvent.mouseOver(screen.getByRole("button", { name: "Approve" }).parentElement as HTMLElement);
    expect(await screen.findByText(REASON)).toBeInTheDocument();
  });
});
