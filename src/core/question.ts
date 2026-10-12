import { APPROVAL_INTERRUPT_KIND } from "./approval-answers";
import type { Interrupt } from "./types";

/** A pause that asks the person something in words. Approvals are a separate kind with their own card. */
export function isQuestionInterrupt(interrupt: Interrupt | null | undefined): interrupt is Interrupt {
  return Boolean(interrupt) && interrupt?.kind !== APPROVAL_INTERRUPT_KIND;
}

/** Lower case, markdown marks and punctuation at the edges removed, white space collapsed. */
function plain(text: string): string {
  return text
    .toLowerCase()
    .replace(/[*_`>#~]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[\s.,;:!?"'()‘’“”-]+|[\s.,;:!?"'()‘’“”-]+$/g, "");
}

/**
 * True when the agent's visible reply already ends with the question text, so a card
 * showing it again would say it twice. A reply that only mentions the question somewhere
 * in the middle does not count.
 */
export function replyEndsWithQuestion(reply: string | null | undefined, question: string): boolean {
  const asked = plain(question);
  if (!reply || !asked) return false;
  return plain(reply).endsWith(asked);
}
