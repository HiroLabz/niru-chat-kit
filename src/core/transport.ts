import type { AgentStreamEvent, ChatMessage, InvokeResponse } from "./types";

/**
 * A failed transport call. `message` is what the surface shows beside Retry; `code`
 * and `status` are the backend's own, when it sent any.
 */
export class ChatTransportError extends Error {
  readonly code: string | null;
  readonly status: number | null;

  constructor(message: string, code: string | null = null, status: number | null = null) {
    super(message);
    this.name = "ChatTransportError";
    this.code = code;
    this.status = status;
  }
}

/** One turn handed to {@link ChatTransport.send}; `params` is whatever the app configured, untouched by the kit. */
export type ChatTurn<TParams = unknown> = {
  message: string;
  conversationId: string | null;
  startNewConversation: boolean;
  /** Set when the turn re-answers an existing reply instead of sending a new message. */
  regenerate?: { messageId: string };
  params?: TParams;
};

/** The answer to a paused run. */
export type ChatResumeTurn = {
  conversationId: string;
  threadId: string | null;
  interruptKind: string;
  answer: string;
  values?: Record<string, unknown>;
};

/** What a fork (regenerate or edit) hands back: the branch to show and the message to run. */
export type ChatForkResult = {
  conversationId: string;
  messages: ChatMessage[];
  message: string;
};

/**
 * Reads and switches the conversation tree. The server owns the tree; the kit renders
 * what these calls return and never builds a branch locally.
 *
 * Without `fork`, a regenerate drops the reply and asks the transport to stream a new
 * one through {@link ChatTransport.regenerate}. `canEdit: false` hides the Edit control.
 * `params` is the app's own configuration as of the call (for the Hiro API, the end user a branch call runs as).
 */
export type ChatBranches<TParams = unknown> = {
  load: (conversationId: string, params?: TParams) => Promise<ChatMessage[]>;
  switchTo: (conversationId: string, messageId: string, params?: TParams) => Promise<ChatMessage[]>;
  fork?: (
    kind: "regenerate" | "edit",
    conversationId: string,
    messageId: string,
    content?: string,
    params?: TParams
  ) => Promise<ChatForkResult>;
  canEdit?: boolean;
};

/**
 * The only door between the kit and a backend. The kit never knows a URL: an app
 * implements this once and every chat surface it renders talks through it.
 *
 * - `send` starts a run and resolves once the response is open, with the run's frames
 *   in order (the Hiro frame set: status, token, tool, thinking, reasoning,
 *   suggestions, needs_input, result, error, done). Reading the frames ends when the
 *   run does or `signal` aborts.
 * - `regenerate` streams a new answer to an existing reply; when absent, `send` is
 *   used with `turn.regenerate` set.
 * - `resume` answers a paused run and resolves with its result.
 * - `stop` asks the backend to stop a run; true means it accepted, and the stream
 *   then ends on its own `result` frame with status `stopped`.
 * - `branches` enables regenerate, edit and version switching.
 *
 * Every method rejects with {@link ChatTransportError} (or any `Error`) on failure.
 */
export type ChatTransport<TParams = unknown> = {
  send: (turn: ChatTurn<TParams>, signal: AbortSignal) => Promise<AsyncIterable<AgentStreamEvent>>;
  regenerate?: (
    turn: ChatTurn<TParams> & { regenerate: { messageId: string } },
    signal: AbortSignal
  ) => Promise<AsyncIterable<AgentStreamEvent>>;
  resume?: (turn: ChatResumeTurn, signal: AbortSignal) => Promise<InvokeResponse>;
  stop: (runId: string) => Promise<boolean>;
  branches?: ChatBranches<TParams>;
};
