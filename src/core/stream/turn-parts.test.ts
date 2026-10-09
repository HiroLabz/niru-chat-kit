import { describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import type { SetStateAction } from "react";
import { useStepFrames } from "./stream-steps";
import { useStreamTranscript } from "../hooks/use-stream-transcript";
import {
  appendTokenPart,
  applyThinkingFrameToParts,
  applyToolFrameToParts,
  formatTurnDuration,
  hasVisibleActivity,
  INTERNAL_TOOL_NAMES,
  isListedStep,
  settleRunningParts,
  splitTurnParts,
  summarizeTitles,
  toolKindOf,
  type TurnPart,
} from "./turn-parts";
import type { ChatMessage } from "../types";
import type { ToolFrameData } from "./apply-tool-frame";

const tool = (id: string, phase: "start" | "end", name = "web_search"): ToolFrameData => ({
  id,
  name,
  title: phase === "start" ? "Searching" : "Searched",
  phase,
  status: phase === "end" ? "success" : null,
  parent_id: null,
  duration_ms: phase === "end" ? 900 : null,
});

describe("part building", () => {
  it("builds [text, activity, text] in stream order", () => {
    let parts: TurnPart[] | undefined;
    parts = appendTokenPart(parts, "m", "Let me ");
    parts = appendTokenPart(parts, "m", "look.");
    parts = applyToolFrameToParts(parts, "m", tool("t1", "start"));
    parts = applyToolFrameToParts(parts, "m", tool("t2", "start", "run_python"));
    parts = appendTokenPart(parts, "m", "Done.");
    expect(parts.map((p) => p.kind)).toEqual(["text", "activity", "text"]);
    expect(parts[0]).toMatchObject({ text: "Let me look." });
    expect(parts[1].kind === "activity" && parts[1].steps.map((s) => s.id)).toEqual(["t1", "t2"]);
    expect(new Set(parts.map((p) => p.id)).size).toBe(3);
  });

  it("opens a new activity part after non-empty text, thoughts included", () => {
    let parts = applyThinkingFrameToParts(undefined, "m", {
      id: "k1",
      label: "Chose Web search",
      duration_ms: 1000,
      parent_id: null,
    });
    parts = appendTokenPart(parts, "m", "hi");
    parts = applyToolFrameToParts(parts, "m", tool("t1", "start"));
    expect(parts.map((p) => p.kind)).toEqual(["activity", "text", "activity"]);
  });

  it("a tool end updates its step in the part that holds it", () => {
    let parts = applyToolFrameToParts(undefined, "m", tool("t1", "start"));
    parts = appendTokenPart(parts, "m", "between");
    parts = applyToolFrameToParts(parts, "m", tool("t2", "start"));
    const before = parts;
    parts = applyToolFrameToParts(parts, "m", tool("t1", "end"));
    const first = parts[0];
    expect(first.kind === "activity" && first.steps[0]).toMatchObject({ status: "success", title: "Searched" });
    const last = parts[2];
    expect(last.kind === "activity" && last.steps[0].status).toBe("running");
    expect(parts[1]).toBe(before[1]);
    expect(parts[2]).toBe(before[2]);
    expect(parts).toHaveLength(3);
  });

  it("settles running steps inside every part, keeping identity when nothing runs", () => {
    let parts = applyToolFrameToParts(undefined, "m", tool("t1", "start"));
    parts = appendTokenPart(parts, "m", "x");
    parts = applyToolFrameToParts(parts, "m", tool("t2", "start"));
    parts = applyToolFrameToParts(parts, "m", tool("t2", "end"));
    const settled = settleRunningParts(parts, "interrupted");
    expect(settled[0].kind === "activity" && settled[0].steps[0].status).toBe("interrupted");
    expect(settled[2].kind === "activity" && settled[2].steps[0].status).toBe("success");
    expect(settleRunningParts(settled, "error")).toBe(settled);
  });
});

describe("splitTurnParts", () => {
  const parts: TurnPart[] = [
    { kind: "text", id: "a", text: "interim" },
    { kind: "activity", id: "b", steps: [] },
    { kind: "text", id: "c", text: "answer" },
  ];
  it("makes the last text part the answer", () => {
    const split = splitTurnParts(parts, false);
    expect(split.answer).toBe("answer");
    expect(split.timeline.map((p) => p.id)).toEqual(["a", "b"]);
  });
  it("keeps all text interim while pending and an activity part trails", () => {
    const split = splitTurnParts(parts.slice(0, 2), true);
    expect(split.answer).toBeNull();
    expect(split.timeline).toHaveLength(2);
  });
});

describe("helpers", () => {
  it("formats durations", () => {
    expect(formatTurnDuration(59_000)).toBe("59s");
    expect(formatTurnDuration(65_000)).toBe("1m 05s");
    expect(formatTurnDuration(116_000)).toBe("1m 56s");
  });
  it("summarizes titles", () => {
    expect(summarizeTitles(["Searched the web"])).toBe("Searched the web");
    expect(summarizeTitles(["Ran commands", "Searched the web"])).toBe("Ran commands, searched the web");
    expect(summarizeTitles(["A x", "B x", "C", "D"])).toBe("A x, b x and 2 more");
  });
  it("picks a tool kind from the name", () => {
    expect(toolKindOf("web_search")).toBe("web");
    expect(toolKindOf("run_python")).toBe("command");
    expect(toolKindOf("read_file")).toBe("file");
    expect(toolKindOf("analyze_image")).toBe("image");
    expect(toolKindOf("send_email")).toBe("tool");
  });
});

describe("through the transcript hooks", () => {
  it("keeps text and steps as today, touches only the pending message and settles parts", () => {
    const { result: transcript } = renderHook(() => useStreamTranscript([{ id: "u", role: "user", text: "q" }]));
    const setMessages = transcript.current.setMessages as (n: SetStateAction<ChatMessage[]>) => void;
    const { result: frames } = renderHook(() =>
      useStepFrames(
        { setMessages, dropPending: vi.fn(), finishAssistant: vi.fn() },
        vi.fn()
      )
    );
    let id = "";
    act(() => {
      id = transcript.current.beginAssistant();
    });
    const user = transcript.current.messages[0];
    act(() => {
      transcript.current.appendToken(id, "One ");
      frames.current.handleFrame(id, { event: "tool", data: tool("t1", "start") });
      transcript.current.appendToken(id, "two");
      frames.current.settleSteps(id, "error");
      transcript.current.finishAssistant(id);
    });
    const message = transcript.current.messages[1];
    expect(message.text).toBe("One two");
    expect(message.steps).toHaveLength(1);
    expect(message.parts?.map((p) => p.kind)).toEqual(["text", "activity", "text"]);
    const activity = message.parts?.[1];
    expect(activity?.kind === "activity" && activity.steps[0].status).toBe("error");
    expect(message.settledAt).toBeTypeOf("number");
    expect(transcript.current.messages[0]).toBe(user);
  });
});

describe("internal tools", () => {
  const internal = { id: "i1", kind: "tool", name: "list_more_tools", title: "List More Tools", status: "success", parentId: null } as const;
  const search = { id: "t1", kind: "tool", name: "web_search", title: "Searched the web", status: "success", parentId: null } as const;

  it("lists user-facing tools but never the internal ones", () => {
    expect(INTERNAL_TOOL_NAMES).toContain("list_more_tools");
    expect(isListedStep(search)).toBe(true);
    expect(isListedStep(internal)).toBe(false);
    expect(hasVisibleActivity([{ kind: "activity", id: "a", steps: [internal] }])).toBe(false);
  });
});
