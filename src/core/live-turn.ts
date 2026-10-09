import type { ChatMessage } from "./types";

/**
 * The newest agent turn in a thread — the only one allowed to run Hiro's particle
 * simulation, since a second instance means a second WebGL context.
 *
 * Kept out of `message-list` so a surface can ask this question without pulling in
 * the transcript component (and so a test that mocks the transcript still gets the
 * real answer).
 */
export function newestAssistantId(messages: ChatMessage[]): string | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index].role === "assistant") return messages[index].id;
  }
  return null;
}
