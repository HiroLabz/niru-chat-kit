import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ChainOfThought } from "./chain-of-thought";

function TwoSteps() {
  return (
    <ChainOfThought>
      <ChainOfThought.Step id="a">
        <ChainOfThought.Trigger>Step A</ChainOfThought.Trigger>
        <ChainOfThought.Content>
          <ChainOfThought.Item>Detail A</ChainOfThought.Item>
        </ChainOfThought.Content>
      </ChainOfThought.Step>
      <ChainOfThought.Step id="b" isLast>
        <ChainOfThought.Trigger>Step B</ChainOfThought.Trigger>
        <ChainOfThought.Content>
          <ChainOfThought.Item>Detail B</ChainOfThought.Item>
        </ChainOfThought.Content>
      </ChainOfThought.Step>
    </ChainOfThought>
  );
}

describe("ChainOfThought", () => {
  it("renders every step open by default", () => {
    render(<TwoSteps />);
    expect(screen.getByText("Detail A")).toBeInTheDocument();
    expect(screen.getByText("Detail B")).toBeInTheDocument();
  });

  it("collapses a step independently of the others on its trigger", async () => {
    render(<TwoSteps />);
    fireEvent.click(screen.getByText("Step A"));

    await waitFor(() => expect(screen.queryByText("Detail A")).not.toBeInTheDocument());
    expect(screen.getByText("Detail B")).toBeInTheDocument();
  });

  it("draws a timeline line between steps but not after the last one", () => {
    render(<TwoSteps />);
    const lines = screen.getAllByTestId("chain-of-thought-line");
    expect(lines).toHaveLength(2);
    // The last step's line is transparent (occupies space for alignment, draws nothing).
    expect(lines[0]).not.toHaveStyle({ backgroundColor: "transparent" });
  });

  it("starts a step collapsed when its id is not in defaultOpenIds", () => {
    render(
      <ChainOfThought defaultOpenIds={["a"]}>
        <ChainOfThought.Step id="a">
          <ChainOfThought.Trigger>Step A</ChainOfThought.Trigger>
          <ChainOfThought.Content>
            <ChainOfThought.Item>Detail A</ChainOfThought.Item>
          </ChainOfThought.Content>
        </ChainOfThought.Step>
        <ChainOfThought.Step id="b" isLast>
          <ChainOfThought.Trigger>Step B</ChainOfThought.Trigger>
          <ChainOfThought.Content>
            <ChainOfThought.Item>Detail B</ChainOfThought.Item>
          </ChainOfThought.Content>
        </ChainOfThought.Step>
      </ChainOfThought>
    );

    expect(screen.getByText("Detail A")).toBeInTheDocument();
    expect(screen.queryByText("Detail B")).not.toBeInTheDocument();
  });

  it("renders a leftIcon on the trigger", () => {
    render(
      <ChainOfThought>
        <ChainOfThought.Step id="a" isLast>
          <ChainOfThought.Trigger leftIcon={<span data-testid="icon">*</span>}>Step A</ChainOfThought.Trigger>
          <ChainOfThought.Content>content</ChainOfThought.Content>
        </ChainOfThought.Step>
      </ChainOfThought>
    );
    expect(screen.getByTestId("icon")).toBeInTheDocument();
  });

  it("ChainOfThought.Step throws the documented error outside <ChainOfThought>", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() =>
      render(
        <ChainOfThought.Step id="a">
          <div />
        </ChainOfThought.Step>
      )
    ).toThrow("ChainOfThought parts must be used inside <ChainOfThought>");
    spy.mockRestore();
  });

  it.each([
    ["ChainOfThought.Trigger", () => <ChainOfThought.Trigger>x</ChainOfThought.Trigger>],
    ["ChainOfThought.Content", () => <ChainOfThought.Content>x</ChainOfThought.Content>],
    ["ChainOfThought.Item", () => <ChainOfThought.Item>x</ChainOfThought.Item>],
  ] as const)("%s throws the documented error outside <ChainOfThought.Step>", (_name, render_) => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<ChainOfThought>{render_()}</ChainOfThought>)).toThrow(
      "ChainOfThought parts must be used inside <ChainOfThought.Step>"
    );
    spy.mockRestore();
  });

  it("accepts sx and className", () => {
    const { container } = render(
      <ChainOfThought className="my-cot" sx={{ p: 1 }}>
        <ChainOfThought.Step id="a" isLast>
          <ChainOfThought.Content>content</ChainOfThought.Content>
        </ChainOfThought.Step>
      </ChainOfThought>
    );
    expect(container.querySelector(".my-cot")).toBeInTheDocument();
  });
});
