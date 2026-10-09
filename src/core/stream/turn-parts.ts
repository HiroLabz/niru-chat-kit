import {
  applyThinkingFrame,
  applyToolFrame,
  settleRunningSteps,
  type ThinkingFrameData,
  type ToolFrameData,
} from "./apply-tool-frame";
import { GENERIC_THOUGHT_TITLE, TURN_TIMELINE_COPY } from "./turn-copy";
import { stepTitle, type WorkingStep } from "../working-process";

/**
 * One stretch of a turn, in stream order: prose the agent wrote, or a run of tool and
 * thought steps. Built only on the pending assistant message, immutably, next to the
 * flat `text` and `steps` that history, copy and other callers keep reading.
 */
export type TurnPart =
  | { kind: "text"; id: string; text: string }
  | { kind: "activity"; id: string; steps: WorkingStep[] }
  /** Model reasoning text (console only). Never part of `message.text`, copy or history. */
  | { kind: "reasoning"; id: string; text: string };

type ActivityPart = Extract<TurnPart, { kind: "activity" }>;

/** Parts are only ever appended (or the last one swapped), so `<message>:<length>` is unique and stable. */
const partId = (messageId: string, parts: TurnPart[]) => `${messageId}:${parts.length}`;

/** Appends streamed prose to the trailing text part, starting a new one after an activity part. */
export function appendTokenPart(
  parts: TurnPart[] | undefined,
  messageId: string,
  text: string
): TurnPart[] {
  const list = parts ?? [];
  const last = list[list.length - 1];
  if (last?.kind === "text") {
    return [...list.slice(0, -1), { ...last, text: last.text + text }];
  }
  return [...list, { kind: "text", id: partId(messageId, list), text }];
}

/**
 * Appends a reasoning delta to the trailing reasoning part with the same frame id; any
 * other trailing part (or a different id) starts a new one, so order is preserved.
 */
export function appendReasoningPart(
  parts: TurnPart[] | undefined,
  frame: { id: string; text: string }
): TurnPart[] {
  const list = parts ?? [];
  const last = list[list.length - 1];
  if (last?.kind === "reasoning" && last.id === frame.id) {
    return [...list.slice(0, -1), { ...last, text: last.text + frame.text }];
  }
  const base = last?.kind === "text" && last.text.trim() === "" ? list.slice(0, -1) : list;
  return [...base, { kind: "reasoning", id: frame.id, text: frame.text }];
}

/**
 * Folds `fold` over the trailing activity part's steps; opens a new activity part when the
 * last part is non-empty text or there is none. A whitespace-only trailing text part
 * (a stray newline before a tool call) is replaced rather than kept as an empty interim.
 */
function intoTrailingActivity(
  parts: TurnPart[] | undefined,
  messageId: string,
  fold: (steps: WorkingStep[]) => WorkingStep[]
): TurnPart[] {
  const list = parts ?? [];
  const last = list[list.length - 1];
  if (last?.kind === "activity") {
    const steps = fold(last.steps);
    return steps === last.steps ? list : [...list.slice(0, -1), { ...last, steps }];
  }
  const base = last?.kind === "text" && last.text.trim() === "" ? list.slice(0, -1) : list;
  const steps = fold([]);
  if (steps.length === 0) return list;
  return [...base, { kind: "activity", id: partId(messageId, base), steps }];
}

const holder = (parts: TurnPart[], stepId: string): ActivityPart | undefined =>
  parts.find(
    (part): part is ActivityPart => part.kind === "activity" && part.steps.some((s) => s.id === stepId)
  );

/** A start frame joins the trailing activity part; an end frame updates its step wherever it lives. */
export function applyToolFrameToParts(
  parts: TurnPart[] | undefined,
  messageId: string,
  data: ToolFrameData
): TurnPart[] {
  const list = parts ?? [];
  if (data.phase === "end") {
    const owner = holder(list, data.id);
    if (!owner) return list;
    return list.map((part) =>
      part === owner ? { ...owner, steps: applyToolFrame(owner.steps, data) } : part
    );
  }
  if (holder(list, data.id)) return list;
  return intoTrailingActivity(list, messageId, (steps) => applyToolFrame(steps, data));
}

export function applyThinkingFrameToParts(
  parts: TurnPart[] | undefined,
  messageId: string,
  data: ThinkingFrameData
): TurnPart[] {
  const list = parts ?? [];
  if (holder(list, data.id)) return list;
  return intoTrailingActivity(list, messageId, (steps) => applyThinkingFrame(steps, data));
}

/** Settles still-running steps in every part; the same array when nothing was running. */
export function settleRunningParts(
  parts: TurnPart[],
  status: Extract<WorkingStep["status"], "interrupted" | "error">
): TurnPart[] {
  let changed = false;
  const next = parts.map((part) => {
    if (part.kind !== "activity") return part;
    const steps = settleRunningSteps(part.steps, status);
    if (steps === part.steps) return part;
    changed = true;
    return { ...part, steps };
  });
  return changed ? next : parts;
}

export type SplitParts = {
  /** Everything that renders inside the timeline, in order. */
  timeline: TurnPart[];
  /** The reply proper; null when the turn has no text part to give it. */
  answer: string | null;
};

/**
 * The last text part is the answer and the rest is the timeline. While the turn is still
 * pending, text followed by an activity part is interim narration, not an answer yet.
 */
export function splitTurnParts(parts: TurnPart[], pending: boolean): SplitParts {
  let lastText = -1;
  parts.forEach((part, index) => {
    if (part.kind === "text") lastText = index;
  });
  if (lastText < 0 || (pending && lastText !== parts.length - 1)) {
    return { timeline: parts, answer: null };
  }
  const answer = parts[lastText];
  return {
    timeline: parts.filter((_, index) => index !== lastText),
    answer: answer.kind === "text" ? answer.text : null,
  };
}

/**
 * Tools the agent calls for its own bookkeeping (discovering its other tools): not an
 * action the user would recognise, so they never show as activity. Their time still
 * counts toward the turn's duration.
 */
export const INTERNAL_TOOL_NAMES: readonly string[] = ["list_more_tools"];

export const isInternalStep = (step: WorkingStep): boolean =>
  step.kind !== "thought" && INTERNAL_TOOL_NAMES.includes(step.name);

/** A step worth listing: every user-meaningful tool, and thoughts whose label says more than the generic fallback. */
export const isListedStep = (step: WorkingStep): boolean =>
  !isInternalStep(step) && (step.kind !== "thought" || stepTitle(step) !== GENERIC_THOUGHT_TITLE);

/** True when some activity part has something the timeline would show. */
export function hasVisibleActivity(parts: TurnPart[] | undefined): boolean {
  return Boolean(
    parts?.some(
      (part) =>
        part.kind === "reasoning" || (part.kind === "activity" && part.steps.some(isListedStep))
    )
  );
}

export type ToolKind = "web" | "command" | "file" | "image" | "tool";

/** Picks an icon family from a tool's name; unknown names fall back to a generic tool. */
export function toolKindOf(name: string): ToolKind {
  const n = name.toLowerCase();
  if (/(web|browse|browser|http|url|internet)/.test(n)) return "web";
  if (/(image|vision|photo|picture)/.test(n)) return "image";
  if (/(command|code|exec|shell|python|bash|terminal|sandbox)/.test(n)) return "command";
  if (/(file|document|doc|knowledge|read|pdf)/.test(n)) return "file";
  if (/search/.test(n)) return "web";
  return "tool";
}

const lowerFirst = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);

/** One title as is; two joined with ", "; more as "first, second and N more". */
export function summarizeTitles(titles: string[]): string {
  if (titles.length <= 1) return titles[0] ?? "";
  const head = `${titles[0]}, ${lowerFirst(titles[1])}`;
  return titles.length === 2 ? head : TURN_TIMELINE_COPY.more(head, titles.length - 2);
}

/** "59s", "1m 05s", "1h 02m". */
export function formatTurnDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  if (total < 60) return `${total}s`;
  const minutes = Math.floor(total / 60);
  if (minutes < 60) return `${minutes}m ${String(total % 60).padStart(2, "0")}s`;
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;
}
