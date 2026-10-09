import type { ReactNode } from "react";
import type { ThinkingFrameData, ToolFrameData } from "./stream/apply-tool-frame";
import type { TurnPart } from "./stream/turn-parts";
import type { WorkingStep } from "./working-process";
import type { GeneratedFileRef } from "./generated-file";
import type { ShapingStatus } from "./shaping";

export type Citation = {
  kind: string;
  label: string;
  document_id?: string | null;
  filename?: string | null;
  page?: number | null;
  url?: string | null;
  title?: string | null;
  scope?: string | null;
};

/** A pause waiting on the end user. Extra fields a backend adds (options, approval form) pass through untouched. */
export type Interrupt = {
  kind: string;
  question: string;
  options?: string[];
  [extra: string]: unknown;
};

export type MessageStatus = "completed" | "stopped";
export type FeedbackRating = "up" | "down";

/** The terminal result of a run, from a `result` frame or a buffered response. */
export type InvokeResponse = {
  status: string;
  module?: string | null;
  message?: string | null;
  output?: Record<string, unknown> | null;
  interrupt?: Interrupt | null;
  citations?: Citation[] | null;
  principal_id?: string | null;
  conversation_id?: string | null;
  thread_id?: string | null;
  run_id?: string | null;
  output_schema_name?: string | null;
  shaping_status?: string | null;
  files?: GeneratedFileRef[] | null;
  error?: { code?: string | null; message?: string | null } | null;
  citation_check?: unknown;
};

export type CitationCheck = {
  grounded: boolean | null;
  required: boolean;
  kept: number;
  dropped: string[];
  renumbered: boolean;
};

export type StreamResultData = Omit<InvokeResponse, "status"> & {
  status: InvokeResponse["status"] | "stopped";
  citation_check?: CitationCheck | null;
};

export type StatusEventData = {
  status: "started";
  conversation_id: string;
  thread_id: string;
  principal_id: string;
  run_id?: string | null;
};

export type TokenEventData = {
  text: string;
};

export type ReasoningEventData = {
  id: string;
  text: string;
};

export type SuggestionsEventData = {
  items: string[];
};

export type NeedsInputEventData = {
  question: string;
  interrupt: Interrupt;
};

export type ErrorEventData = {
  code: string;
  message: string;
};

export type AgentStreamEvent =
  | { event: "status"; data: StatusEventData }
  | { event: "token"; data: TokenEventData }
  | { event: "tool"; data: ToolFrameData }
  | { event: "thinking"; data: ThinkingFrameData }
  | { event: "reasoning"; data: ReasoningEventData }
  | { event: "suggestions"; data: SuggestionsEventData }
  | { event: "needs_input"; data: NeedsInputEventData }
  | { event: "result"; data: StreamResultData }
  | { event: "error"; data: ErrorEventData }
  | { event: "done"; data: Record<string, never> };

export type ChatRole = "user" | "assistant" | "system";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  pending?: boolean;
  at?: number;
  citations?: Citation[] | null;
  /** The schema-shaped payload this turn returned, when the run produced one. The
   *  bubble renders prose; this is what a caller's integration would consume. */
  output?: Record<string, unknown> | null;
  /** The response schema the run was asked for, whether or not it was applied. */
  outputSchemaName?: string | null;
  /** What the runtime did with that schema. Absent on a turn that predates the field. */
  shapingStatus?: ShapingStatus;
  /** Why shaping failed, verbatim from the run's error envelope. */
  shapingError?: string | null;
  /** `stopped` when the reply was cut short by Stop or a dropped connection. */
  status?: MessageStatus;
  citationCheck?: CitationCheck | null;
  /** The durable message id, once the server has one for this turn. */
  serverId?: string;
  /** Said or answered aloud in a call; the bubble shows a small microphone beside it. */
  spoken?: boolean;
  /** Every alternative at this turn's place, itself included, oldest first. */
  siblingIds?: string[];
  siblingIndex?: number;
  /** This turn's tool and thought rows, in arrival order. Only ever set on the
   *  pending assistant message, and updated immutably — see `use-agent-stream.ts`. */
  steps?: WorkingStep[];
  /** The same turn in stream order: interim prose and activity runs, interleaved. Set
   *  only on the streamed assistant message; `text` and `steps` stay the flat views. */
  parts?: TurnPart[];
  /** Files this turn generated, kept with the stored message so the chip survives a reload. */
  files?: GeneratedFileRef[];
  /** When the turn stopped working (ms epoch); with `at` it gives "Worked for …". */
  settledAt?: number;
  /** A settled turn whose duration nobody measured (loaded from history): its timeline header names no time. */
  timingUnknown?: boolean;
};

/** Per-turn actions a transcript offers; ids are server message ids. */
export type ChatTurnActions = {
  disabled: boolean;
  /** Absent on a surface that cannot regenerate a reply: the control is hidden. */
  onRegenerate?: (messageId: string) => void;
  /** Absent on a surface that cannot edit a question: the control is hidden. */
  onEdit?: (messageId: string, content: string) => void;
  /** `false` hides the Edit control on a surface that cannot edit a question. */
  canEdit?: boolean;
  /** Absent on a surface with no branches: the previous and next arrows are hidden. */
  onSwitchBranch?: (messageId: string) => void;
  /** Copies a reply's answer text; the kit draws the Copy control. Absent where a surface offers none. */
  onCopy?: (text: string) => Promise<void>;
  /** Renders a surface's own Copy control for a reply, instead of the kit's; used when `onCopy` is absent. */
  renderCopy?: (message: ChatMessage) => ReactNode;
  /** Thumbs up/down on a settled assistant turn; absent on a surface that offers
   *  no feedback (`FeedbackBar` then never renders). */
  onFeedback?: (messageId: string, rating: FeedbackRating) => Promise<void>;
};

export type AgentStreamStatus =
  | "idle"
  | "connecting"
  | "streaming"
  | "needs_input"
  | "done"
  | "error";
