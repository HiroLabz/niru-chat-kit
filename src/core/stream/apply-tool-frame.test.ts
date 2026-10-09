import { describe, expect, it } from "vitest";
import {
  applyThinkingFrame,
  applyToolFrame,
  settleRunningSteps,
  type ThinkingFrameData,
  type ToolFrameData,
} from "./apply-tool-frame";
import type { WorkingStep } from "../working-process";

const start = (id: string, name = "search_docs", parent: string | null = null): ToolFrameData => ({
  id,
  name,
  title: "Searching the docs",
  phase: "start",
  status: null,
  parent_id: parent,
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

describe("applyToolFrame", () => {
  it("adds a running step when a tool starts", () => {
    const steps = applyToolFrame([], start("1"));
    expect(steps).toEqual([
      {
        id: "1",
        kind: "tool",
        name: "search_docs",
        title: "Searching the docs",
        status: "running",
        parentId: null,
      },
    ]);
  });

  it("marks the step successful when the tool ends", () => {
    const steps = applyToolFrame(applyToolFrame([], start("1")), end("1"));
    expect(steps[0].status).toBe("success");
    expect(steps[0].durationMs).toBe(1200);
  });

  it("marks the step failed when the tool errors", () => {
    const steps = applyToolFrame(applyToolFrame([], start("1")), end("1", "error"));
    expect(steps[0].status).toBe("error");
  });

  it("marks the step interrupted when the end frame says so", () => {
    const steps = applyToolFrame(applyToolFrame([], start("1")), end("1", "interrupted"));
    expect(steps[0].status).toBe("interrupted");
  });

  it("ignores a duplicate start for the same tool", () => {
    const steps = applyToolFrame(applyToolFrame([], start("1")), start("1"));
    expect(steps).toHaveLength(1);
  });

  it("keeps the parent so nested calls can be grouped", () => {
    const steps = applyToolFrame([], start("2", "search_docs", "1"));
    expect(steps[0].parentId).toBe("1");
  });

  it("does not update a step on an end frame for an unknown id", () => {
    const steps = applyToolFrame([], end("missing"));
    expect(steps).toEqual([]);
  });
});

describe("applyThinkingFrame", () => {
  const thought = (id: string, parent: string | null = null): ThinkingFrameData => ({
    id,
    label: "Identified what to verify in the docs",
    duration_ms: 4200,
    parent_id: parent,
  });

  it("adds a settled thought step from one completed model step", () => {
    const steps = applyThinkingFrame([], thought("thought-1"));
    expect(steps).toEqual([
      {
        id: "thought-1",
        kind: "thought",
        name: "thought",
        title: "Identified what to verify in the docs",
        status: "success",
        parentId: null,
        durationMs: 4200,
      },
    ]);
  });

  it("nests under the tool or subagent call that caused it", () => {
    const steps = applyThinkingFrame([], thought("thought-1", "tool-1"));
    expect(steps[0].parentId).toBe("tool-1");
  });

  it("never carries the model's completion or prompt text", () => {
    const steps = applyThinkingFrame([], thought("thought-1"));
    expect(JSON.stringify(steps)).not.toContain("PRIVATE-REASONING");
  });

  it("ignores a duplicate thinking frame for the same step", () => {
    const steps = applyThinkingFrame(applyThinkingFrame([], thought("thought-1")), thought("thought-1"));
    expect(steps).toHaveLength(1);
  });
});

describe("settleRunningSteps", () => {
  const running: WorkingStep = {
    id: "1",
    name: "search_docs",
    title: "Searching",
    status: "running",
    parentId: null,
  };

  it("settles a running step to interrupted", () => {
    const steps = settleRunningSteps([running], "interrupted");
    expect(steps[0].status).toBe("interrupted");
  });

  it("settles a running step to error", () => {
    const steps = settleRunningSteps([running], "error");
    expect(steps[0].status).toBe("error");
  });

  it("leaves a settled step untouched", () => {
    const settled: WorkingStep = { ...running, status: "success" };
    const steps = settleRunningSteps([settled], "error");
    expect(steps[0].status).toBe("success");
  });

  it("returns the same array reference when nothing is running", () => {
    const settled: WorkingStep = { ...running, status: "success" };
    const input = [settled];
    expect(settleRunningSteps(input, "error")).toBe(input);
  });
});

describe("applyToolFrame summary and details", () => {
  const start = { id: "1", name: "hiro_list_agents", title: "Listing agents", phase: "start", status: null, parent_id: null } as const;

  it("carries the summary and details of a console end frame onto the step", () => {
    const running = applyToolFrame([], start);
    const [done] = applyToolFrame(running, {
      ...start,
      phase: "end",
      status: "success",
      title: "List agents",
      summary: "Found 12 agents",
      details: { inputs: { page: 1 }, output: "Agent 0" },
    });
    expect(done.summary).toBe("Found 12 agents");
    expect(done.details).toEqual({ inputs: { page: 1 }, output: "Agent 0" });
  });

  it("leaves both absent on a public or share frame", () => {
    const running = applyToolFrame([], start);
    const [done] = applyToolFrame(running, { ...start, phase: "end", status: "success" });
    expect(done.summary).toBeUndefined();
    expect(done.details).toBeUndefined();
  });
});
