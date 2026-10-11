import type { AgentStreamEvent, Citation, GeneratedFileRef, Interrupt, StepDetails } from "@hiro/niru-chat-kit";

/** One step of a scripted run: a real stream frame, or a pause (ms) before the next one. */
export type ScriptStep = AgentStreamEvent | { wait: number };

/** What a script knows about the turn it answers. */
export type RunContext = {
  question: string;
  /** 0 for the first answer to a question, 1 for the first regenerate, and so on. */
  variant: number;
  /** How many times this exact question has been run before (an error script succeeds on the second). */
  attempt: number;
  /** Names of the files the person attached to this message. */
  attachments: string[];
};

export type Scenario = {
  id: string;
  /** The starter prompt that triggers it. */
  starter: string;
  /** Lowercase words that pick this scenario when found in the question. */
  keywords: string[];
  /** What the run shows, for the demo's capability list. */
  shows: string;
  steps: (ctx: RunContext) => ScriptStep[];
};

const WORDS_PER_TOKEN = 3;

/** The answer text as `token` frames, a few words at a time, whitespace kept so markdown survives. */
export function say(text: string): AgentStreamEvent[] {
  const words = text.split(/(?<=\s)/);
  const frames: AgentStreamEvent[] = [];
  for (let at = 0; at < words.length; at += WORDS_PER_TOKEN) {
    frames.push({ event: "token", data: { text: words.slice(at, at + WORDS_PER_TOKEN).join("") } });
  }
  return frames;
}

export function reasoning(id: string, ...chunks: string[]): ScriptStep[] {
  return chunks.flatMap((text): ScriptStep[] => [{ event: "reasoning", data: { id, text } }, { wait: 140 }]);
}

export function thought(id: string, label: string, durationMs: number): AgentStreamEvent {
  return { event: "thinking", data: { id, label, duration_ms: durationMs, parent_id: null } };
}

export function toolStart(id: string, name: string, title: string): AgentStreamEvent {
  return { event: "tool", data: { id, name, title, phase: "start", status: null, parent_id: null } };
}

export function toolEnd(
  id: string,
  name: string,
  title: string,
  extra: {
    status?: "success" | "error";
    durationMs?: number;
    summary?: string;
    details?: StepDetails;
    file?: GeneratedFileRef;
  } = {}
): AgentStreamEvent {
  return {
    event: "tool",
    data: {
      id,
      name,
      title,
      phase: "end",
      status: extra.status ?? "success",
      parent_id: null,
      duration_ms: extra.durationMs ?? 900,
      summary: extra.summary,
      details: extra.details,
      file: extra.file,
    },
  };
}

export function followUps(...items: string[]): AgentStreamEvent {
  return { event: "suggestions", data: { items } };
}

/** The terminal `result` frame of a run that finished. */
export function finish(message: string, extra: { citations?: Citation[] } = {}): AgentStreamEvent {
  return { event: "result", data: { status: "completed", message, shaping_status: "none", ...extra } };
}

export function pause(interrupt: Interrupt): AgentStreamEvent {
  return { event: "needs_input", data: { question: interrupt.question, interrupt } };
}

export function fail(code: string, message: string): AgentStreamEvent {
  return { event: "error", data: { code, message } };
}
