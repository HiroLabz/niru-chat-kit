import type { AgentStreamEvent, ChatMessage, InvokeResponse } from "../types";
import { readRunShaping, type RunShapingFields } from "../shaping";

/**
 * Parses a `text/event-stream` body from a `fetch` `ReadableStream`.
 * `EventSource` cannot send a POST body, so the widget drives SSE parsing
 * itself: split on blank-line-delimited frames, read `event:`/`data:`
 * fields, JSON-parse the payload, and yield one typed event per frame.
 * Per the SSE spec a line break is CRLF, LF, or CR — the backend
 * (sse-starlette) emits CRLF, so frame boundaries must match all forms.
 *
 * Generic over the frame type so other SSE surfaces (the agent-plan ledger tail)
 * reuse this parser instead of growing a second copy; it defaults to
 * `AgentStreamEvent` so existing chat callers are unchanged.
 */
const FRAME_BOUNDARY = /\r\n\r\n|\n\n|\r\r/;

/**
 * How long the body may deliver no bytes at all before the stream counts as dead.
 *
 * Mirrors the published SDK's `STREAM_IDLE_TIMEOUT_MS`, deliberately: both clients
 * consume the same endpoint, so they must agree on when it has stopped talking.
 * A gap is the only usable liveness signal — an agent can legitimately run for
 * minutes, so elapsed time says nothing, while every `EventSourceResponse` in the
 * API pings on sse-starlette's 15s default. Four missed pings is dead.
 */
export const SSE_IDLE_TIMEOUT_MS = 60_000;

/**
 * Shown to the user when a stream stalls, so the copy is one string rather than one
 * per surface. Every chat surface renders the hook's `error` verbatim beside a Retry.
 */
export const SSE_STALL_MESSAGE =
  "The agent stopped responding — the connection went quiet. Retry to run it again.";

/** A stream whose body stayed open but delivered nothing for {@link SSE_IDLE_TIMEOUT_MS}. */
export class SseStallError extends Error {
  constructor(message: string = SSE_STALL_MESSAGE) {
    super(message);
    this.name = "SseStallError";
  }
}

export type SseFrame<TData = unknown> = { event: string; data: TData };

/**
 * Rejects `pending` with {@link SseStallError} if it has not settled within `idleMs`.
 *
 * `idleMs <= 0` disables the guard, for a caller that genuinely wants to wait forever.
 */
function withIdleDeadline<T>(pending: Promise<T>, idleMs: number): Promise<T> {
  if (idleMs <= 0) return pending;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const stalled = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new SseStallError()), idleMs);
  });
  return Promise.race([pending, stalled]).finally(() => clearTimeout(timer));
}

/**
 * Yields one typed event per SSE frame, and throws {@link SseStallError} when the body
 * goes quiet for `idleTimeoutMs`.
 *
 * The stall guard measures raw reads, not parsed frames, which is the whole point: a
 * `: ping` comment carries no data lines and so produces no frame, yet it is exactly
 * the proof that the server is still there. Without this a held-open body is
 * indistinguishable from a slow model, and the surface above spins forever with
 * nothing to show or retry (86d42m12e).
 *
 * A stalled race leaves its `reader.read()` in flight, so the body is cancelled before
 * the throw — otherwise the dead connection is held until the caller happens to abort.
 * The losing read is also given a no-op handler, since it settles after nobody is
 * listening and an unhandled rejection there would surface as a page error.
 */
export async function* parseSseStream<TFrame = AgentStreamEvent>(
  body: ReadableStream<Uint8Array>,
  signal?: AbortSignal,
  idleTimeoutMs: number = SSE_IDLE_TIMEOUT_MS
): AsyncGenerator<TFrame> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      if (signal?.aborted) {
        return;
      }
      const pending = reader.read();
      pending.catch(() => undefined);
      const { value, done } = await withIdleDeadline(pending, idleTimeoutMs);
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let boundary = FRAME_BOUNDARY.exec(buffer);
      while (boundary !== null) {
        const frame = buffer.slice(0, boundary.index);
        buffer = buffer.slice(boundary.index + boundary[0].length);
        const parsed = parseFrame<TFrame>(frame);
        if (parsed) yield parsed;
        boundary = FRAME_BOUNDARY.exec(buffer);
      }
    }

    const trailing = parseFrame<TFrame>(buffer);
    if (trailing) yield trailing;
  } catch (error) {
    if (error instanceof SseStallError) await reader.cancel().catch(() => undefined);
    throw error;
  } finally {
    reader.releaseLock();
  }
}

function parseFrame<TFrame>(frame: string): TFrame | null {
  let eventName = "message";
  const dataLines: string[] = [];

  for (const rawLine of frame.split(/\r?\n|\r/)) {
    const line = rawLine.trimEnd();
    if (line.startsWith("event:")) {
      eventName = line.slice("event:".length).trim();
    } else if (line.startsWith("data:")) {
      dataLines.push(line.slice("data:".length).trim());
    }
  }

  if (dataLines.length === 0) return null;

  try {
    const data = JSON.parse(dataLines.join("\n"));
    return { event: eventName, data } as TFrame;
  } catch {
    return null;
  }
}

/** The response-schema half of a chat turn, read from a stream's terminal `result`
 * frame or from a buffered run response — the two are the same payload, so they are
 * read by one function rather than once per surface.
 *
 * Without this the bubble showed prose while the run's `output` was dropped on the
 * floor, and a schema that was ignored looked exactly like no schema at all. */
export function shapingFromResult(
  data: (RunShapingFields & Pick<InvokeResponse, "output">) | null | undefined
): Pick<ChatMessage, "output" | "outputSchemaName" | "shapingStatus" | "shapingError"> {
  const shaping = readRunShaping(data);
  return {
    output: data?.output ?? null,
    outputSchemaName: shaping.schemaName,
    shapingStatus: shaping.status,
    shapingError: shaping.errorMessage,
  };
}
