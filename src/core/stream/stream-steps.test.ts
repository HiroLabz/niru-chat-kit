import { describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import type { SetStateAction } from "react";
import { useStepFrames } from "./stream-steps";
import type { ChatMessage } from "../types";
import type { ToolFrameData } from "./apply-tool-frame";

const start = (id: string): ToolFrameData => ({
  id,
  name: "search_docs",
  title: "Searching the docs",
  phase: "start",
  status: null,
  parent_id: null,
  duration_ms: null,
});

const end = (id: string, status: "success" | "error" | "interrupted" = "success"): ToolFrameData => ({
  id,
  name: "search_docs",
  title: "Searched the docs",
  phase: "end",
  status,
  parent_id: null,
  duration_ms: 1200,
});

function setup(initial: ChatMessage[]) {
  let messages = initial;
  const setMessages = vi.fn((next: SetStateAction<ChatMessage[]>) => {
    messages = typeof next === "function" ? next(messages) : next;
  });
  const dropPending = vi.fn();
  const finishAssistant = vi.fn();
  const fail = vi.fn();
  const { result } = renderHook(() =>
    useStepFrames({ setMessages, dropPending, finishAssistant }, fail)
  );
  return { result, dropPending, finishAssistant, fail, getMessages: () => messages };
}

describe("useStepFrames", () => {
  it("handleFrame folds a tool start frame into the message's steps", () => {
    const { result, getMessages } = setup([{ id: "m1", role: "assistant", text: "" }]);

    act(() => {
      result.current.handleFrame("m1", { event: "tool", data: start("t1") });
    });

    expect(getMessages()[0].steps).toEqual([
      {
        id: "t1",
        kind: "tool",
        name: "search_docs",
        title: "Searching the docs",
        status: "running",
        parentId: null,
      },
    ]);
  });

  it("handleFrame folds a thinking frame into the message's steps", () => {
    const { result, getMessages } = setup([{ id: "m1", role: "assistant", text: "" }]);

    act(() => {
      result.current.handleFrame("m1", {
        event: "thinking",
        data: { id: "th1", label: "Reviewed the question", duration_ms: 900, parent_id: null },
      });
    });

    expect(getMessages()[0].steps?.[0]).toMatchObject({ id: "th1", kind: "thought" });
  });

  it("handleFrame is a no-op for any other event", () => {
    const { result, getMessages } = setup([{ id: "m1", role: "assistant", text: "" }]);

    act(() => {
      result.current.handleFrame("m1", { event: "token", data: { text: "hi" } });
    });

    expect(getMessages()[0].steps).toBeUndefined();
  });

  it("settleSteps settles a running step to interrupted", () => {
    const { result, getMessages } = setup([
      {
        id: "m1",
        role: "assistant",
        text: "",
        steps: [
          { id: "t1", name: "search_docs", title: "Searching", status: "running", parentId: null },
        ],
      },
    ]);

    act(() => {
      result.current.settleSteps("m1", "interrupted");
    });

    expect(getMessages()[0].steps?.[0].status).toBe("interrupted");
  });

  it("settleOnStreamEnd drops the pending message when the signal was aborted", () => {
    const { result, dropPending, finishAssistant, fail } = setup([
      { id: "m1", role: "assistant", text: "", pending: true },
    ]);

    act(() => {
      result.current.settleOnStreamEnd("m1", true, "ignored while aborted");
    });

    expect(dropPending).toHaveBeenCalledWith("m1");
    expect(finishAssistant).not.toHaveBeenCalled();
    expect(fail).not.toHaveBeenCalled();
  });

  it("settleOnStreamEnd finishes the message, settles running steps and reports the failure", () => {
    const { result, finishAssistant, fail, getMessages } = setup([
      {
        id: "m1",
        role: "assistant",
        text: "",
        steps: [
          { id: "t1", name: "search_docs", title: "Searching", status: "running", parentId: null },
        ],
      },
    ]);

    act(() => {
      result.current.settleOnStreamEnd("m1", false, "Stream failed");
    });

    expect(finishAssistant).toHaveBeenCalledWith("m1");
    expect(getMessages()[0].steps?.[0].status).toBe("error");
    expect(fail).toHaveBeenCalledWith("Stream failed");
  });

  it("settleOnStreamEnd does not call fail when there is no message", () => {
    const { result, fail } = setup([{ id: "m1", role: "assistant", text: "" }]);

    act(() => {
      result.current.settleOnStreamEnd("m1", false, null);
    });

    expect(fail).not.toHaveBeenCalled();
  });

  it("applyToolFrame's start/end pairing still settles successfully through handleFrame", () => {
    const { result, getMessages } = setup([{ id: "m1", role: "assistant", text: "" }]);

    act(() => {
      result.current.handleFrame("m1", { event: "tool", data: start("t1") });
    });
    act(() => {
      result.current.handleFrame("m1", { event: "tool", data: end("t1") });
    });

    expect(getMessages()[0].steps?.[0]).toMatchObject({ status: "success", durationMs: 1200 });
  });
});
