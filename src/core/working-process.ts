/**
 * The step type of an agent turn's working process, and the words for a step.
 *
 * Each action row's words come from the server, derived from that call's own safe
 * display arguments. This is a working process, not chain-of-thought: private reasoning,
 * prompts, raw tool arguments and results never cross the wire.
 */

import type { GeneratedFileRef } from "./generated-file";

/**
 * What a console surface may show about a finished call: its inputs as a key to value list
 * (`inputs`) or, where the source only has one readable line, that line (`inputsText`), and a short
 * redacted preview of its output (`output`). Built on the server for signed-in console sessions
 * only; a public widget or share-link step never has it.
 */
export type StepDetails = {
  inputs?: Record<string, unknown> | null;
  inputsText?: string | null;
  output?: string | null;
};

/** One tool call in the working process. Name, title and status; summary and details on console surfaces only. */
export type WorkingStep = {
  id: string;
  kind?: "tool" | "thought";
  name: string;
  /**
   * What the agent is doing on this call, in words. Derived server-side from the
   * call's own arguments, so a row reads "Searching the docs for pricing" rather
   * than a fixed string per tool name, and flips to past tense on success.
   */
  title: string;
  status: "running" | "success" | "error" | "interrupted";
  parentId: string | null;
  /** Measured on the server; absent on a start frame and on older history. */
  durationMs?: number | null;
  /** The file a finished `create_file` call made; absent on every other step. */
  file?: GeneratedFileRef | null;
  /** A plain line about what the finished call did ("Found 12 agents"); console surfaces only. */
  summary?: string | null;
  /** Inputs and an output preview, collapsed under "Details"; console surfaces only. */
  details?: StepDetails | null;
};

const ACRONYMS: Record<string, string> = {
  ai: "AI",
  api: "API",
  csv: "CSV",
  crm: "CRM",
  http: "HTTP",
  id: "ID",
  json: "JSON",
  llm: "LLM",
  mcp: "MCP",
  pdf: "PDF",
  sms: "SMS",
  sql: "SQL",
  url: "URL",
};

/**
 * Last-resort label for a call whose title never arrived: `ask_user` -> "Ask user".
 * Mirrors the server's own fallback so an older backend never renders a raw
 * snake_case tool name at the user. An app with its own naming rules passes its own
 * formatter to {@link stepTitle}.
 */
export function humanizeToolName(name: string): string {
  const joined = name
    .split(/[_.\-\s]+/)
    .filter(Boolean)
    .map((word) => ACRONYMS[word.toLowerCase()] ?? word)
    .join(" ");
  return joined.charAt(0).toUpperCase() + joined.slice(1);
}

/** The server-derived label for a step, humanizing the tool name if none arrived. */
export function stepTitle(step: WorkingStep, humanize: (name: string) => string = humanizeToolName): string {
  return step.title || humanize(step.name);
}

export function formatStepDuration(durationMs: number | null | undefined): string {
  return `${Math.max(1, Math.round((durationMs ?? 0) / 1000))}s`;
}
