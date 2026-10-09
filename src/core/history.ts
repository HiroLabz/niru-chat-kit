import type { GeneratedFileRef } from "./generated-file";
import { shapingFromResult } from "./stream/parse-sse";
import { approvalAnswerLabel } from "./approval-answers";
import type {
  ChatMessage,
  ChatRole,
  Citation,
  CitationCheck,
  MessageStatus,
  StreamResultData,
} from "./types";

/** A stored message as a backend returns it; the Hiro API's `MessageOut` fits this shape. */
export type MessageOut = {
  id: string;
  role: string;
  status: MessageStatus;
  content: string;
  created_at: string;
  citations?: Citation[] | null;
  output?: Record<string, unknown> | null;
  citation_check?: Record<string, unknown> | null;
  file_refs?: GeneratedFileRef[] | null;
  sibling_ids?: string[];
  sibling_index: number;
  [extra: string]: unknown;
};

const RENDERABLE_ROLES: ReadonlySet<string> = new Set<ChatRole>(["user", "assistant", "system"]);

function isRenderable(row: MessageOut): row is MessageOut & { role: ChatRole } {
  return RENDERABLE_ROLES.has(row.role);
}

/**
 * Narrows the loosely typed `citation_check` object the API sends. A shape this client
 * does not recognise reads as "no check", so the warning never fires on a guess.
 */
export function readCitationCheck(value: unknown): CitationCheck | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const grounded = record.grounded;
  if (grounded !== null && typeof grounded !== "boolean") return null;
  return {
    grounded,
    required: record.required === true,
    kept: typeof record.kept === "number" ? record.kept : 0,
    dropped: Array.isArray(record.dropped)
      ? record.dropped.filter((item): item is string => typeof item === "string")
      : [],
    renumbered: record.renumbered === true,
  };
}

function branchFields(row: MessageOut): Partial<ChatMessage> {
  const siblingIds = row.sibling_ids ?? [];
  return {
    serverId: row.id,
    status: row.status,
    citationCheck: readCitationCheck(row.citation_check),
    siblingIds: siblingIds.length > 0 ? siblingIds : [row.id],
    siblingIndex: row.sibling_index,
  };
}

/** The stored turn's generated files as chip data, or nothing when it made none. */
export function filesFromRow(
  refs: readonly GeneratedFileRef[] | null | undefined
): Pick<ChatMessage, "files"> {
  return refs && refs.length > 0 ? { files: [...refs] } : {};
}

/** A stored conversation's active branch as chat turns, keyed by their server ids. */
export function toChatMessages(rows: MessageOut[]): ChatMessage[] {
  return rows.filter(isRenderable).map((row, index, all) => ({
    id: row.id,
    role: row.role,
    text: row.role === "user" && all[index - 1]?.role === "assistant" ? approvalAnswerLabel(row.content) : row.content,
    at: Date.parse(row.created_at),
    citations: row.citations ?? null,
    output: row.output ?? null,
    ...filesFromRow(row.file_refs),
    ...branchFields(row),
  }));
}

/**
 * Attaches server ids and branch positions to a live transcript, newest turn first.
 *
 * The live turns keep their own ids so nothing re-mounts; matching stops at the first
 * role that disagrees, which leaves an unmatched turn without actions rather than
 * pinning another turn's id to it.
 */
export function annotateFromHistory(local: ChatMessage[], rows: MessageOut[]): ChatMessage[] {
  const server = rows.filter(isRenderable);
  const next = [...local];
  let serverIndex = server.length - 1;
  for (let index = next.length - 1; index >= 0 && serverIndex >= 0; index -= 1) {
    const row = server[serverIndex];
    if (next[index].role !== row.role) break;
    next[index] = { ...next[index], ...branchFields(row) };
    serverIndex -= 1;
  }
  return next;
}

/**
 * What a terminal `result` frame says about the settled bubble.
 *
 * The corrected `message` replaces the streamed text only when the server changed it on
 * purpose: a citation check that dropped markers, or a stop that returns the partial
 * answer. Otherwise the streamed text stands, so a schema-shaped run keeps its prose.
 */
export function resultFields(data: StreamResultData, streamedText: string): Partial<ChatMessage> {
  const citationCheck = readCitationCheck(data.citation_check);
  const stopped = data.status === "stopped";
  const corrected = Boolean(data.message) && (stopped || citationCheck !== null || !streamedText);
  return {
    ...(corrected && data.message ? { text: data.message } : {}),
    ...(data.citations ? { citations: data.citations } : {}),
    ...(stopped ? { status: "stopped" as const } : {}),
    citationCheck,
    ...shapingFromResult(data),
  };
}
