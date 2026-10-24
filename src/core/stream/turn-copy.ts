/** User-facing copy for the per-turn chat controls, shared by the components and their specs. */
export const MESSAGE_NOTE_COPY = {
  stopped: "Stopped",
  notGrounded: "Not grounded in the provided sources, check before relying on it.",
} as const;

export const TURN_ACTION_COPY = {
  regenerate: "Regenerate",
  edit: "Edit",
  previous: "Previous version",
  next: "Next version",
  copy: "Copy",
  copied: "Copied",
  copyFailed: "Could not copy",
  save: "Save reply",
  saved: "Saved",
} as const;

export const DELETE_CONFIRM_COPY = {
  action: "Delete message",
  title: "Delete this message?",
  body: "It will be removed from the conversation. This cannot be undone.",
  confirm: "Delete",
  cancel: "Cancel",
} as const;

export const EDIT_FORM_COPY = {
  label: "Edit message",
  save: "Save",
  cancel: "Cancel",
} as const;

export const FEEDBACK_COPY = {
  up: "Good response",
  down: "Bad response",
  error: "Could not record feedback. Try again.",
} as const;

/**
 * Exact backend label for a model step that picked no tool
 * (`services/builder_progress.py`'s `_thought_label` fallback). Steps carrying
 * this label are generic filler — "Thought for 1s / Prepared the response"
 * repeated tells the reader nothing — so the trigger folds their time into the
 * total and the expanded list omits them entirely.
 */
export const GENERIC_THOUGHT_TITLE = "Prepared the response";

const MAX_LISTED_TOOLS = 3;

/** "Web search" / "Web search, Read file" / "Web search, Read file, Send email and 2 more". */
function summarizeToolNames(names: string[]): string {
  if (names.length <= MAX_LISTED_TOOLS) return names.join(", ");
  const shown = names.slice(0, MAX_LISTED_TOOLS).join(", ");
  return `${shown} and ${names.length - MAX_LISTED_TOOLS} more`;
}

/** The working process's always-visible disclosure trigger, so a settled turn's
 *  steps stay reachable after `Reasoning` auto-collapses them. */
export const REASONING_TRIGGER_COPY = {
  hide: "Hide steps",
  /**
   * Closed-state label: total thought time across every thought step (generic
   * ones included — their time still counts even though they drop out of the
   * expanded list), plus which tools ran, if any.
   */
  summary(totalSeconds: number, toolNames: string[]): string {
    const base = `Thought for ${totalSeconds}s`;
    return toolNames.length > 0 ? `${base} · used ${summarizeToolNames(toolNames)}` : base;
  },
} as const;

/** The activity timeline's header and summary copy. */
export const TURN_TIMELINE_COPY = {
  working: (elapsed: string) => `Working for ${elapsed}`,
  reasoning: "Reasoning",
  worked: (duration: string) => `Worked for ${duration}`,
  workedNoDuration: "Worked",
  more: (head: string, count: number) => `${head} and ${count} more`,
} as const;

/** The sources disclosure under a reply: one button that shows or hides the source chips. */
export const SOURCE_LIST_COPY = {
  toggle: "View Sources",
} as const;
