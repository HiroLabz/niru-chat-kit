import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { TurnTimeline } from "./turn-timeline";
import type { TurnPart } from "../../core/stream/turn-parts";
import type { WorkingStep } from "../../core/working-process";

const internal: WorkingStep = {
  id: "i1",
  kind: "tool",
  name: "list_more_tools",
  title: "List More Tools",
  status: "success",
  parentId: null,
  durationMs: 4000,
};
const search: WorkingStep = {
  id: "t1",
  kind: "tool",
  name: "web_search",
  title: "Searched the web",
  status: "success",
  parentId: null,
  durationMs: 2000,
};

const activity = (steps: WorkingStep[]): TurnPart[] => [{ kind: "activity", id: "a1", steps }];

describe("TurnTimeline internal tools", () => {
  it("hides an internal tool from the summary line and the cards", () => {
    render(<TurnTimeline messageId="m1" parts={activity([internal, search])} pending={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Worked for 6s" }));
    // One call is one card, not a group row over a card.
    fireEvent.click(screen.getByRole("button", { name: /Web search/ }));
    expect(screen.getAllByText("Searched the web").length).toBeGreaterThan(0);
    expect(screen.queryByText(/list more tools/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/list_more_tools/i)).not.toBeInTheDocument();
  });

  it("shows the header time but no activity line when the only step is internal", () => {
    render(<TurnTimeline messageId="m1" parts={activity([internal])} pending={false} />);
    expect(screen.getByText("Worked for 4s")).toBeInTheDocument();
    expect(screen.queryByText(/list more tools/i)).not.toBeInTheDocument();
    expect(screen.queryAllByRole("button")).toHaveLength(1); // the header trigger only
  });
});

describe("TurnTimeline duration", () => {
  it("reads 1s for a settled turn with no timing at all, as before", () => {
    render(<TurnTimeline messageId="m1" parts={activity([search])} pending={false} />);
    expect(screen.getByText("Worked for 2s")).toBeInTheDocument();
    render(<TurnTimeline messageId="m2" parts={activity([{ ...search, durationMs: undefined }])} pending={false} />);
    expect(screen.getByText("Worked for 1s")).toBeInTheDocument();
  });

  it("shows no duration when the turn's timing is unknown", () => {
    render(
      <TurnTimeline messageId="m1" parts={activity([{ ...search, durationMs: undefined }])} pending={false} durationUnknown />,
    );
    expect(screen.getByRole("button", { name: "Worked" })).toBeInTheDocument();
    expect(screen.queryByText(/Worked for/)).not.toBeInTheDocument();
  });

  it("still counts up while pending even if the timing was marked unknown", () => {
    render(<TurnTimeline messageId="m1" parts={activity([search])} pending startedAt={Date.now()} durationUnknown />);
    expect(screen.getByRole("button", { name: /^Working for/ })).toBeInTheDocument();
  });
});

describe("TurnTimeline single and grouped calls", () => {
  const listAgents: WorkingStep = {
    id: "l1",
    kind: "tool",
    name: "hiro_list_agents",
    title: "List agents",
    status: "success",
    parentId: null,
    durationMs: 3000,
    summary: "Found 12 agents",
  };

  it("renders a single call as one row whose words appear once, with the summary under it", () => {
    render(<TurnTimeline messageId="m1" parts={activity([listAgents])} pending={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Worked for 3s" }));
    expect(screen.getAllByText("List agents")).toHaveLength(1);
    expect(screen.queryByText("Hiro list agents")).not.toBeInTheDocument();
    expect(screen.getByText("Found 12 agents")).toBeInTheDocument();
  });

  it("still groups several calls under one summary row", () => {
    render(<TurnTimeline messageId="m1" parts={activity([search, { ...search, id: "t2" }])} pending={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Worked for 4s" }));
    expect(screen.getAllByRole("button", { name: /Searched the web/ }).length).toBeGreaterThan(0);
  });
});
