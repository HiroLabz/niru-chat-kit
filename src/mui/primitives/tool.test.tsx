import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Tool } from "./tool";
import type { WorkingStep } from "../../core/working-process";

function step(overrides: Partial<WorkingStep> = {}): WorkingStep {
  return {
    id: "1",
    name: "search_docs",
    title: "Searching the docs",
    status: "running",
    parentId: null,
    ...overrides,
  };
}

describe("Tool", () => {
  it("shows the humanised tool name", () => {
    render(<Tool step={step({ name: "search_docs" })} />);
    expect(screen.getByText("Search docs")).toBeInTheDocument();
  });

  it.each([
    ["running", "Running"],
    ["success", "Done"],
    ["error", "Failed"],
    ["interrupted", "Paused"],
  ] as const)("shows a %s step as the %s status chip", (status, label) => {
    render(<Tool step={step({ status })} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it("shows the measured duration when present", () => {
    render(<Tool step={step({ status: "success", durationMs: 4200 })} />);
    expect(screen.getByText("4s")).toBeInTheDocument();
  });

  it("shows no duration when none was measured", () => {
    render(<Tool step={step({ durationMs: null })} />);
    expect(screen.queryByText(/^\d+s$/)).not.toBeInTheDocument();
  });

  it("starts collapsed by default and expands to show the title on click", () => {
    render(<Tool step={step({ title: "Searching the docs for pricing" })} />);
    expect(screen.queryByText("Searching the docs for pricing")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText("Searching the docs for pricing")).toBeInTheDocument();
  });

  it("starts expanded when defaultOpen is set", () => {
    render(<Tool step={step({ title: "Searching the docs for pricing" })} defaultOpen />);
    expect(screen.getByText("Searching the docs for pricing")).toBeInTheDocument();
  });

  it("never renders tool arguments or results when the step carries none (public and share chats)", () => {
    render(<Tool step={step()} defaultOpen />);
    const html = document.body.innerHTML;
    expect(html).not.toContain("input");
    expect(html.toLowerCase()).not.toContain("output");
  });

  it("accepts sx and className", () => {
    const { container } = render(<Tool step={step()} className="my-tool-card" sx={{ p: 1 }} />);
    expect(container.querySelector(".my-tool-card")).toBeInTheDocument();
  });
});

describe("Tool summary and details", () => {
  const listAgents = step({
    name: "hiro_list_agents",
    title: "List agents",
    status: "success",
    durationMs: 3000,
    summary: "Found 12 agents",
    details: { inputs: { page: 1, query: "support" }, output: "Agent 0\nAgent 1\nand 10 more" },
  });

  it("drops the product prefix and does not repeat the name as the line under it", () => {
    render(<Tool step={listAgents} defaultOpen />);
    expect(screen.getByText("List agents")).toBeInTheDocument();
    expect(screen.queryByText("Hiro list agents")).not.toBeInTheDocument();
    expect(screen.getAllByText("List agents")).toHaveLength(1);
  });

  it("drops a summary that only repeats the status", () => {
    render(<Tool step={step({ status: "success", summary: "Done" })} />);
    expect(screen.queryByTestId("tool-summary")).not.toBeInTheDocument();
    expect(screen.getAllByText("Done")).toHaveLength(1);
  });

  it("shows the result summary without opening anything", () => {
    render(<Tool step={listAgents} />);
    expect(screen.getByTestId("tool-summary")).toHaveTextContent("Found 12 agents");
  });

  it("keeps the details collapsed until Details is opened", () => {
    render(<Tool step={listAgents} defaultOpen />);
    expect(screen.queryByTestId("tool-details")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Details" }));
    const details = screen.getByTestId("tool-details");
    expect(details).toHaveTextContent("page:");
    expect(details).toHaveTextContent("support");
    expect(details).toHaveTextContent("Agent 1");
    expect(details).toHaveTextContent("Took 3s");
  });

  it("shows a one-line input text when the source has no key list", () => {
    render(
      <Tool step={step({ details: { inputsText: "Query: pricing" }, title: "Searching the docs" })} defaultOpen />
    );
    fireEvent.click(screen.getByRole("button", { name: "Details" }));
    expect(screen.getByTestId("tool-details")).toHaveTextContent("Query: pricing");
  });

  it("has no Details button and is not expandable when there is nothing more to say", () => {
    render(<Tool step={step({ name: "hiro_list_agents", title: "List agents", summary: "Found 2 agents" })} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByText("Found 2 agents")).toBeInTheDocument();
  });
});
