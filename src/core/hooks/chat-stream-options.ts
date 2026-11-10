import type { BranchReplay } from "./use-conversation-branches";
import type { ChatMessage, Interrupt } from "../types";

/** What a failed turn replays on Retry, whole. */
export type ChatReplay<TParams> =
  | BranchReplay
  | { kind: "run"; message: string; overrides?: Partial<TParams>; echo: boolean; regenerateId?: string }
  | { kind: "resume"; answer: string; values?: Record<string, unknown>; interruptKind: string };

/** Options of `useChatStream`. */
export type UseChatStreamOptions<TParams> = {
  /** Handed to the transport on every turn, merged under the per-turn overrides of `send`. */
  params?: TParams;
  /**
   * Messages this conversation starts with, read once on mount, for a surface that
   * unmounts its chat panel but must come back holding the same transcript.
   */
  initialMessages?: ChatMessage[];
  /**
   * The conversation and in-flight thread this hook resumes, read once on mount
   * alongside {@link initialMessages}; without them a re-mounted surface would start a
   * fresh conversation and the agent would lose all memory of what is on screen.
   */
  initialConversationId?: string | null;
  initialThreadId?: string | null;
  /**
   * The question or approval this conversation is paused on, read once on mount
   * alongside {@link initialThreadId}. A surface that reloads while a run waits on
   * a person passes what the server still holds, so the card comes back and
   * `resume` can answer it; without it the paused run could never be answered.
   */
  initialInterrupt?: Interrupt | null;
  /**
   * Offer regenerate, edit and version switching (needs `transport.branches`). After
   * each run the active branch is read back so the new turns carry their server ids;
   * a surface without those controls leaves this off and makes no extra reads.
   */
  branching?: boolean;
};
