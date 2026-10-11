import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ChatTransportError, type ChatTransport, type ChatTurn } from "../transport";
import type { AgentStreamEvent, ChatMessage, InvokeResponse } from "../types";
import { useChatStream } from "./use-chat-stream";

type Params = { model?: string };

const STARTED = {
  event: "status",
  data: { status: "started", conversation_id: "c1", thread_id: "t1", principal_id: "p1", run_id: "r1" },
} as const;

const RESULT = {
  event: "result",
  data: { status: "completed", message: "Hello there", shaping_status: "none" },
} as const;

async function* frames(list: AgentStreamEvent[]): AsyncGenerator<AgentStreamEvent> {
  for (const frame of list) yield frame;
}

function transportOf(overrides: Partial<ChatTransport<Params>> = {}): ChatTransport<Params> {
  return {
    send: vi.fn(async () =>
      frames([
        STARTED,
        { event: "token", data: { text: "Hello " } },
        { event: "token", data: { text: "there" } },
        RESULT,
        { event: "done", data: {} },
      ])
    ),
    stop: vi.fn(async () => false),
    ...overrides,
  };
}

describe("useChatStream", () => {
  it("streams tokens into one assistant turn and settles on the result frame", async () => {
    const transport = transportOf();
    const { result } = renderHook(() => useChatStream(transport, { params: { model: "m1" } }));
    await act(async () => {
      await result.current.send("Hi", { model: "m2" });
    });
    expect(result.current.status).toBe("done");
    expect(result.current.messages.map((m) => [m.role, m.text, m.pending ?? false])).toEqual([
      ["user", "Hi", false],
      ["assistant", "Hello there", false],
    ]);
    expect(result.current.conversationId).toBe("c1");
    expect(result.current.threadId).toBe("t1");
    const turn = vi.mocked(transport.send).mock.calls[0][0] as ChatTurn<Params>;
    expect(turn).toMatchObject({
      message: "Hi",
      conversationId: null,
      startNewConversation: true,
      params: { model: "m2" },
    });
  });

  it("continues the conversation it adopted on the next turn", async () => {
    const transport = transportOf();
    const { result } = renderHook(() => useChatStream(transport));
    await act(async () => result.current.send("one"));
    await act(async () => result.current.send("two"));
    const second = vi.mocked(transport.send).mock.calls[1][0];
    expect(second).toMatchObject({ conversationId: "c1", startNewConversation: false });
  });

  it("shows follow-ups from the suggestions frame and clears them on the next send", async () => {
    const transport = transportOf({
      send: vi.fn(async () => frames([STARTED, { event: "suggestions", data: { items: ["a", "", "b"] } }, RESULT])),
    });
    const { result } = renderHook(() => useChatStream(transport));
    await act(async () => result.current.send("Hi"));
    expect(result.current.followUps).toEqual(["a", "b"]);
    vi.mocked(transport.send).mockImplementationOnce(() => new Promise(() => undefined));
    act(() => void result.current.send("again"));
    expect(result.current.followUps).toEqual([]);
  });

  it("reports a transport failure with the backend's code and status, and retries the same turn", async () => {
    const send = vi
      .fn<ChatTransport<Params>["send"]>()
      .mockRejectedValueOnce(new ChatTransportError("Rate limited", "rate_limited", 429))
      .mockImplementation(async () => frames([STARTED, RESULT, { event: "done", data: {} }]));
    const { result } = renderHook(() => useChatStream(transportOf({ send })));
    await act(async () => result.current.send("Hi"));
    expect(result.current.status).toBe("error");
    expect(result.current.error).toBe("Rate limited");
    expect(result.current.errorCode).toBe("rate_limited");
    expect(result.current.errorStatus).toBe(429);
    await act(async () => result.current.retry());
    await waitFor(() => expect(result.current.status).toBe("done"));
    expect(result.current.error).toBeNull();
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("retries a failed turn without adding the question a second time", async () => {
    const send = vi
      .fn<ChatTransport<Params>["send"]>()
      .mockRejectedValueOnce(new ChatTransportError("Rate limited", "rate_limited", 429))
      .mockImplementation(async () => frames([STARTED, RESULT, { event: "done", data: {} }]));
    const { result } = renderHook(() => useChatStream(transportOf({ send })));
    await act(async () => result.current.send("Hi"));
    await act(async () => result.current.retry());
    await waitFor(() => expect(result.current.status).toBe("done"));
    const questions = result.current.messages.filter((m) => m.role === "user");
    expect(questions.map((m) => m.text)).toEqual(["Hi"]);
    await act(async () => result.current.send("Again"));
    expect(result.current.messages.filter((m) => m.role === "user").map((m) => m.text)).toEqual(["Hi", "Again"]);
  });

  it("settles a stream that ends without a terminal frame as an error", async () => {
    const transport = transportOf({ send: vi.fn(async () => frames([STARTED, { event: "token", data: { text: "par" } }])) });
    const { result } = renderHook(() => useChatStream(transport));
    await act(async () => result.current.send("Hi"));
    expect(result.current.status).toBe("error");
    expect(result.current.error).toMatch(/connection ended/i);
  });

  it("pauses on needs_input and resumes through the transport", async () => {
    const interrupt = { kind: "ask_user", question: "Which one?" };
    const resumed: InvokeResponse = { status: "completed", message: "Done", conversation_id: "c1" };
    const resume = vi.fn(async () => resumed);
    const transport = transportOf({
      send: vi.fn(async () => frames([STARTED, { event: "needs_input", data: { question: "Which one?", interrupt }, }])),
      resume,
    });
    const { result } = renderHook(() => useChatStream(transport));
    await act(async () => result.current.send("Hi"));
    expect(result.current.status).toBe("needs_input");
    expect(result.current.interrupt).toEqual(interrupt);
    await act(async () => result.current.resume("A"));
    expect(resume).toHaveBeenCalledWith(
      { conversationId: "c1", threadId: "t1", interruptKind: "ask_user", answer: "A", values: undefined },
      expect.any(AbortSignal)
    );
    expect(result.current.status).toBe("done");
    expect(result.current.messages.at(-1)?.text).toBe("Done");
  });

  it("stop asks the transport and keeps the stream open when it accepts", async () => {
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => (release = resolve));
    async function* held(): AsyncGenerator<AgentStreamEvent> {
      yield STARTED;
      await gate;
      yield { event: "result", data: { status: "stopped", message: "part", shaping_status: "none" } };
    }
    const stopFn = vi.fn(async () => true);
    const transport = transportOf({ send: vi.fn(async () => held()), stop: stopFn });
    const { result } = renderHook(() => useChatStream(transport));
    let pending: Promise<void> = Promise.resolve();
    act(() => {
      pending = result.current.send("Hi");
    });
    await waitFor(() => expect(result.current.status).toBe("streaming"));
    await act(async () => {
      await result.current.stop();
    });
    expect(stopFn).toHaveBeenCalledWith("r1");
    release();
    await act(async () => pending);
    expect(result.current.messages.at(-1)).toMatchObject({ text: "part" });
  });

  it("regenerates through transport.regenerate, else through send with the regenerate field", async () => {
    const rows: ChatMessage[] = [
      { id: "q", role: "user", text: "Hi", serverId: "sq", siblingIds: ["sq"], siblingIndex: 0 },
      { id: "a", role: "assistant", text: "Old", serverId: "sa", siblingIds: ["sa"], siblingIndex: 0 },
    ];
    const send = vi.fn<ChatTransport<Params>["send"]>(async () => frames([STARTED, RESULT]));
    const transport = transportOf({
      send,
      branches: { load: async () => rows, switchTo: async () => rows },
    });
    const { result } = renderHook(() => useChatStream(transport, { branching: true, initialMessages: rows, initialConversationId: "c1" }));
    await act(async () => result.current.turnActions?.onRegenerate?.("sa"));
    await waitFor(() => expect(send).toHaveBeenCalled());
    expect(send.mock.calls[0][0]).toMatchObject({ message: "", regenerate: { messageId: "sa" } });
    expect(result.current.turnActions?.canEdit).toBeUndefined();

    const regenerate = vi.fn<NonNullable<ChatTransport<Params>["regenerate"]>>(async () => frames([STARTED, RESULT]));
    const second = transportOf({ send: vi.fn(), regenerate, branches: { load: async () => rows, switchTo: async () => rows, canEdit: false } });
    const again = renderHook(() => useChatStream(second, { branching: true, initialMessages: rows, initialConversationId: "c1" }));
    await act(async () => again.result.current.turnActions?.onRegenerate?.("sa"));
    await waitFor(() => expect(regenerate).toHaveBeenCalled());
    expect(second.send).not.toHaveBeenCalled();
    expect(again.result.current.turnActions?.canEdit).toBe(false);
  });

  it("forks through the transport, adopts the returned branch and runs its message", async () => {
    const fork = vi.fn(async () => ({
      conversationId: "c2",
      messages: [{ id: "q2", role: "user" as const, text: "Edited", serverId: "q2" }],
      message: "Edited",
    }));
    const send = vi.fn<ChatTransport<Params>["send"]>(async () => frames([STARTED, RESULT]));
    const transport = transportOf({ send, branches: { load: async () => [], switchTo: async () => [], fork } });
    const { result } = renderHook(() =>
      useChatStream(transport, { branching: true, initialConversationId: "c1", params: { model: "m1" } })
    );
    await act(async () => result.current.turnActions?.onEdit?.("q1", "Edited"));
    expect(fork).toHaveBeenCalledWith("edit", "c1", "q1", "Edited", { model: "m1" });
    await waitFor(() => expect(send).toHaveBeenCalled());
    expect(send.mock.calls[0][0]).toMatchObject({ message: "Edited" });
  });
});
