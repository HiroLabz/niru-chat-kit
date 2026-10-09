import { hasVisibleActivity, splitTurnParts } from "./turn-parts";
import type { ChatMessage } from "../types";

/**
 * The markdown source of a settled reply, exactly what the bubble renders as the answer:
 * the last text part of a turn that streamed activity, otherwise the message text. Interim
 * narration, reasoning and tool details are never part of it.
 */
export function answerSource(message: ChatMessage): string {
  if (!message.parts || !hasVisibleActivity(message.parts)) return message.text;
  const { answer } = splitTurnParts(message.parts, false);
  if (answer !== null) return answer;
  return message.parts.some((part) => part.kind === "text") ? "" : message.text;
}
