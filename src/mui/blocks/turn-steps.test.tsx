import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { summarizeTurnSteps, TurnSteps } from "./turn-steps";
import type { WorkingStep } from "../../core/working-process";

const GENERIC: WorkingStep = {
  id: "g1",
  kind: "thought",
  name: "thought",
  title: "Prepared the response",
  status: "success",
  parentId: null,
  durationMs: 1000,
};

const MEANINGFUL_THOUGHT: WorkingStep = {
  id: "c1",
  kind: "thought",
  name: "thought",
  title: "Chose Web search",
  status: "success",
  parentId: null,
  durationMs: 2000,
};

const TOOL_STEP: WorkingStep = {
  id: "t1",
  kind: "tool",
  name: "web_search",
  title: "Searched the web",
  status: "success",
  parentId: null,
};

describe("summarizeTurnSteps", () => {
  it("is not expandable and shows just the total when every step is generic filler", () => {
    const summary = summarizeTurnSteps([GENERIC, { ...GENERIC, id: "g2", durationMs: 3800 }]);
    expect(summary.label).toBe("Thought for 5s");
    expect(summary.expandable).toBe(false);
    expect(summary.meaningfulSteps).toEqual([]);
  });

  it("floors the total at 1s when a thought exists but rounds to 0", () => {
    const summary = summarizeTurnSteps([{ ...GENERIC, durationMs: 300 }]);
    expect(summary.label).toBe("Thought for 1s");
  });

  it("names up to 3 tools, then 'and N more'", () => {
    const tools: WorkingStep[] = ["read_file", "write_file", "send_email", "task"].map((name, index) => ({
      id: `tool-${index}`,
      kind: "tool",
      name,
      title: "",
      status: "success",
      parentId: null,
    }));
    const summary = summarizeTurnSteps(tools);
    expect(summary.label).toBe("Thought for 0s · used Read file, Write file, Send email and 1 more");
  });

  it("sums thought time, names the tool, and keeps only meaningful steps in order", () => {
    const summary = summarizeTurnSteps([GENERIC, MEANINGFUL_THOUGHT, TOOL_STEP]);
    expect(summary.label).toBe("Thought for 3s · used Web search");
    expect(summary.expandable).toBe(true);
    expect(summary.meaningfulSteps).toEqual([MEANINGFUL_THOUGHT, TOOL_STEP]);
  });

  it("has no tool suffix and no thought time when there are no steps at all", () => {
    expect(summarizeTurnSteps([])).toEqual({ label: "Thought for 0s", expandable: false, meaningfulSteps: [] });
  });
});

describe("TurnSteps", () => {
  it("renders a plain, unclickable label when nothing meaningful remains", () => {
    render(<TurnSteps steps={[GENERIC]} pending={false} />);
    expect(screen.getByText("Thought for 1s")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("opens automatically while pending, showing the meaningful steps", () => {
    render(<TurnSteps steps={[MEANINGFUL_THOUGHT, TOOL_STEP]} pending />);
    expect(screen.getByRole("button", { name: "Hide steps" })).toBeInTheDocument();
    expect(screen.getByText("Chose Web search")).toBeInTheDocument();
    expect(screen.getByText("Searched the web")).toBeInTheDocument();
  });
});

describe("summarizeTurnSteps internal tools", () => {
  const INTERNAL: WorkingStep = { ...TOOL_STEP, id: "i1", name: "list_more_tools", title: "List More Tools" };

  it("leaves internal tools out of the used-tools summary and the list", () => {
    const summary = summarizeTurnSteps([INTERNAL, TOOL_STEP]);
    expect(summary.label).toBe("Thought for 0s · used Web search");
    expect(summary.meaningfulSteps).toEqual([TOOL_STEP]);
  });

  it("is not expandable when only an internal tool ran", () => {
    const summary = summarizeTurnSteps([INTERNAL]);
    expect(summary.label).not.toContain("List more tools");
    expect(summary.expandable).toBe(false);
  });
});
