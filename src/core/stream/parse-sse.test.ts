import { afterEach, describe, expect, it, vi } from "vitest";
import {
  SSE_IDLE_TIMEOUT_MS,
  SseStallError,
  parseSseStream,
  shapingFromResult,
} from "./parse-sse";
import type { AgentStreamEvent } from "../types";

function streamFromParts(parts: string[]): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      for (const part of parts) {
        controller.enqueue(new TextEncoder().encode(part));
      }
      controller.close();
    },
  });
}

async function collect(stream: ReadableStream<Uint8Array>): Promise<AgentStreamEvent[]> {
  const events: AgentStreamEvent[] = [];
  for await (const event of parseSseStream(stream)) {
    events.push(event);
  }
  return events;
}

describe("parseSseStream", () => {
  it("parses CRLF-delimited frames", async () => {
    const frame1 = `event: status\r\ndata: ${JSON.stringify({
      status: "started",
      conversation_id: "c1",
      thread_id: "t1",
      principal_id: "p1",
    })}\r\n\r\n`;
    const frame2 = `event: token\r\ndata: ${JSON.stringify({ text: "hi" })}\r\n\r\n`;

    const events = await collect(streamFromParts([frame1, frame2]));

    expect(events).toHaveLength(2);
    expect(events[0]).toEqual({
      event: "status",
      data: { status: "started", conversation_id: "c1", thread_id: "t1", principal_id: "p1" },
    });
    expect(events[1]).toEqual({ event: "token", data: { text: "hi" } });
  });

  it("parses a CRLFCRLF frame boundary split mid-way across reader chunks", async () => {
    const full =
      `event: token\r\ndata: ${JSON.stringify({ text: "a" })}\r\n\r\n` +
      `event: token\r\ndata: ${JSON.stringify({ text: "b" })}\r\n\r\n`;

    const boundaryIndex = full.indexOf("\r\n\r\n");
    const splitIndex = boundaryIndex + 3;
    const chunk1 = full.slice(0, splitIndex);
    const chunk2 = full.slice(splitIndex);

    expect(chunk1.endsWith("\r\n\r")).toBe(true);
    expect(chunk2.startsWith("\n")).toBe(true);

    const events = await collect(streamFromParts([chunk1, chunk2]));

    expect(events).toEqual([
      { event: "token", data: { text: "a" } },
      { event: "token", data: { text: "b" } },
    ]);
  });

  it("parses LF-LF delimited frames", async () => {
    const frame1 = `event: token\ndata: ${JSON.stringify({ text: "x" })}\n\n`;
    const frame2 = `event: token\ndata: ${JSON.stringify({ text: "y" })}\n\n`;

    const events = await collect(streamFromParts([frame1, frame2]));

    expect(events).toEqual([
      { event: "token", data: { text: "x" } },
      { event: "token", data: { text: "y" } },
    ]);
  });

  it("ignores an unknown event between tokens so the tokens and result still arrive", async () => {
    const frames = [
      `event: token\r\ndata: ${JSON.stringify({ text: "a" })}\r\n\r\n`,
      `event: future_thing\r\ndata: ${JSON.stringify({ anything: "goes" })}\r\n\r\n`,
      `event: token\r\ndata: ${JSON.stringify({ text: "b" })}\r\n\r\n`,
      `event: result\r\ndata: ${JSON.stringify({ status: "completed" })}\r\n\r\n`,
    ];

    const events = await collect(streamFromParts(frames));

    expect(events.map((event) => event.event)).toEqual(["token", "future_thing", "token", "result"]);
    expect(events.map((event) => event.data)).toEqual([
      { text: "a" },
      { anything: "goes" },
      { text: "b" },
      { status: "completed" },
    ]);
  });

  it("lands the event name and JSON data correctly", async () => {
    const payload = {
      status: "started",
      conversation_id: "abc",
      thread_id: "def",
      principal_id: "ghi",
    };
    const frame = `event: status\r\ndata: ${JSON.stringify(payload)}\r\n\r\n`;

    const events = await collect(streamFromParts([frame]));

    expect(events).toEqual([{ event: "status", data: payload }]);
  });
});

/**
 * A body that stays open: it emits `parts`, then only what `keepAlive` returns, on a
 * timer, and never closes. This is the shape a stalled agent run actually has on the
 * wire — sse-starlette holds the response and pings into it.
 */
function heldOpenStream(
  parts: string[],
  keepAlive: () => string | null,
  everyMs: number
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const part of parts) controller.enqueue(encoder.encode(part));
      setInterval(() => {
        const beat = keepAlive();
        if (beat !== null) controller.enqueue(encoder.encode(beat));
      }, everyMs);
    },
  });
}

const STATUS_FRAME = `event: status\r\ndata: ${JSON.stringify({
  status: "started",
  conversation_id: "c1",
  thread_id: "t1",
  principal_id: "p1",
})}\r\n\r\n`;
const PING_COMMENT = ": ping - 2026-08-23T00:00:00+00:00\r\n\r\n";
const PING_EVERY_MS = 15_000;

describe("parseSseStream stall guard", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("throws once a held-open body delivers nothing for the idle window", async () => {
    vi.useFakeTimers();
    const events: unknown[] = [];
    const run = (async () => {
      for await (const event of parseSseStream(
        heldOpenStream([STATUS_FRAME], () => null, PING_EVERY_MS)
      )) {
        events.push(event);
      }
    })();
    const settled = expect(run).rejects.toBeInstanceOf(SseStallError);

    await vi.advanceTimersByTimeAsync(SSE_IDLE_TIMEOUT_MS + 1);
    await settled;
    expect(events).toHaveLength(1);
  });

  it("counts ping comments as liveness even though they yield no frame", async () => {
    vi.useFakeTimers();
    const events: unknown[] = [];
    const run = (async () => {
      for await (const event of parseSseStream(
        heldOpenStream([STATUS_FRAME], () => PING_COMMENT, PING_EVERY_MS)
      )) {
        events.push(event);
      }
    })();
    let failure: unknown = null;
    void run.catch((error: unknown) => {
      failure = error;
    });

    await vi.advanceTimersByTimeAsync(SSE_IDLE_TIMEOUT_MS * 3);

    expect(failure).toBeNull();
    expect(events).toHaveLength(1);
  });

  it("leaves a stream that closes on its own untouched", async () => {
    vi.useFakeTimers();
    const collected = collect(streamFromParts([STATUS_FRAME]));
    await vi.advanceTimersByTimeAsync(SSE_IDLE_TIMEOUT_MS + 1);
    await expect(collected).resolves.toHaveLength(1);
  });

  it("waits forever when the guard is disabled", async () => {
    vi.useFakeTimers();
    let failure: unknown = null;
    const run = (async () => {
      for await (const _event of parseSseStream(
        heldOpenStream([STATUS_FRAME], () => null, PING_EVERY_MS),
        undefined,
        0
      )) {
        void _event;
      }
    })();
    void run.catch((error: unknown) => {
      failure = error;
    });

    await vi.advanceTimersByTimeAsync(SSE_IDLE_TIMEOUT_MS * 5);

    expect(failure).toBeNull();
  });
});

describe("shapingFromResult", () => {
  it("reads the response-schema outcome out of a terminal result frame", async () => {
    const frame = JSON.stringify({
      status: "completed",
      module: "chat",
      message: "",
      output: { merchant_name: "Kopi" },
      output_schema_name: "receipt_v1",
      shaping_status: "applied",
    });
    const [event] = await collect(
      streamFromParts([`event: result\r\ndata: ${frame}\r\n\r\n`])
    );

    expect(event.event).toBe("result");
    if (event.event !== "result") throw new Error("expected a result frame");
    expect(shapingFromResult(event.data)).toEqual({
      output: { merchant_name: "Kopi" },
      outputSchemaName: "receipt_v1",
      shapingStatus: "applied",
      shapingError: null,
    });
  });

  it("carries the failure message from an error envelope returned with the run", () => {
    expect(
      shapingFromResult({
        status: "completed",
        module: "chat",
        output: null,
        output_schema_name: "receipt_v1",
        shaping_status: "failed",
        error: { code: "structured_output_failed", message: "total was not a number" },
      } as never)
    ).toEqual({
      output: null,
      outputSchemaName: "receipt_v1",
      shapingStatus: "failed",
      shapingError: "total was not a number",
    });
  });

  it("reports a draft-only schema as not applied", () => {
    expect(
      shapingFromResult({
        output_schema_name: "receipt_v1",
        shaping_status: "draft_not_applied",
      } as never).shapingStatus
    ).toBe("draft_not_applied");
  });

  it("degrades an absent or unknown status to none rather than throwing", () => {
    expect(shapingFromResult(null).shapingStatus).toBe("none");
    expect(shapingFromResult({ shaping_status: "sideways" } as never).shapingStatus).toBe(
      "none"
    );
  });
});
