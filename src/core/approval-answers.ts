export const APPROVAL_INTERRUPT_KIND = "tool_approval";
export const APPROVE_ANSWER = "approve";
export const EDIT_ANSWER = "edit";
export const DENY_ANSWER = "deny";

const ANSWER_LABELS: Record<string, string> = {
  [APPROVE_ANSWER]: "Approved",
  [EDIT_ANSWER]: "Approved with changes",
  [DENY_ANSWER]: "Denied",
};

/** What the transcript says for an approval answer; a request still carries the raw word. */
export function approvalAnswerLabel(answer: string): string {
  return ANSWER_LABELS[answer] ?? answer;
}
