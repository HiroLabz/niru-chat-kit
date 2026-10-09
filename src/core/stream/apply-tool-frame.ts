import type { GeneratedFileRef } from "../generated-file";
import type { StepDetails, WorkingStep } from "../working-process";

/**
 * One tool call entering or leaving the working process — the `tool` SSE frame's
 * `data` payload, exactly as `domain/stream.py StreamFrame.tool` builds it. A public or
 * share-link frame never carries the call's arguments or its result. A finished `create_file`
 * call names the file it made (`file`; never its bytes), and a signed-in console session also
 * gets a plain `summary` of the outcome and `details` (redacted inputs, a short output preview).
 */
export type ToolFrameData = {
  id: string;
  name: string;
  title: string;
  phase: "start" | "end";
  status: "success" | "error" | "interrupted" | null;
  parent_id: string | null;
  duration_ms?: number | null;
  file?: GeneratedFileRef | null;
  summary?: string | null;
  details?: StepDetails | null;
};

/**
 * Folds one `tool` frame into the process list, in arrival order.
 *
 * Used by the live run stream (`stream-steps.ts`) and the turn parts (`turn-parts.ts`), so a
 * tool frame is interpreted identically wherever it is consumed.
 */
export function applyToolFrame(steps: WorkingStep[], data: ToolFrameData): WorkingStep[] {
  const { id, name, title, phase, status, parent_id: parentId } = data;
  if (phase === "start") {
    if (steps.some((step) => step.id === id)) return steps;
    return [...steps, { id, kind: "tool", name, title, status: "running", parentId }];
  }
  const settled: WorkingStep["status"] =
    status === "error" ? "error" : status === "interrupted" ? "interrupted" : "success";
  return steps.map((step) =>
    step.id === id
      ? {
          ...step,
          title: title || step.title,
          status: settled,
          durationMs: data.duration_ms,
          file: data.file ?? step.file,
          summary: data.summary ?? step.summary,
          details: data.details ?? step.details,
        }
      : step
  );
}

/**
 * One completed model step entering the working process — the `thinking` SSE frame's
 * `data` payload, exactly as `domain/stream.py StreamFrame.thinking` builds it. Label
 * and timing only: never the model's completion, prompt or private reasoning.
 */
export type ThinkingFrameData = {
  id: string;
  label: string;
  duration_ms: number;
  parent_id: string | null;
};

/**
 * Folds one `thinking` frame into the process list, in arrival order.
 *
 * Unlike a tool call, a model step arrives already finished — there is no separate
 * start frame — so this always appends a settled `thought` row rather than looking
 * for a `running` one to update. Used by the live run stream (`stream-steps.ts`) and the
 * turn parts (`turn-parts.ts`), so a thinking frame is interpreted identically wherever it
 * is consumed.
 */
export function applyThinkingFrame(steps: WorkingStep[], data: ThinkingFrameData): WorkingStep[] {
  const { id, label, duration_ms: durationMs, parent_id: parentId } = data;
  if (steps.some((step) => step.id === id)) return steps;
  return [
    ...steps,
    { id, kind: "thought", name: "thought", title: label, status: "success", parentId, durationMs },
  ];
}

/**
 * Settles every still-`running` step to `status`, so a turn that ends in `needs_input`,
 * Stop or an error never leaves a step spinning. Returns the same array when nothing is
 * running, preserving the message's identity for `MessageBubble`'s memo.
 */
export function settleRunningSteps(
  steps: WorkingStep[],
  status: Extract<WorkingStep["status"], "interrupted" | "error">
): WorkingStep[] {
  if (!steps.some((step) => step.status === "running")) return steps;
  return steps.map((step) => (step.status === "running" ? { ...step, status } : step));
}
