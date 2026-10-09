import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Steps } from "./steps";

function ThreeSteps(props: Parameters<typeof Steps>[0]) {
  return (
    <Steps {...props}>
      <Steps.Trigger>Toggle</Steps.Trigger>
      <Steps.Content>
        <Steps.Item>Step one</Steps.Item>
        <Steps.Bar />
        <Steps.Item>Step two</Steps.Item>
        <Steps.Bar />
        <Steps.Item>Step three</Steps.Item>
      </Steps.Content>
    </Steps>
  );
}

describe("Steps", () => {
  it("is open by default", () => {
    render(<ThreeSteps />);
    expect(screen.getByText("Step one")).toBeInTheDocument();
  });

  it("starts closed when defaultOpen is false", () => {
    render(<ThreeSteps defaultOpen={false} />);
    expect(screen.queryByText("Step one")).not.toBeInTheDocument();
  });

  it("toggles open state uncontrolled on trigger click", async () => {
    render(<ThreeSteps defaultOpen={false} />);
    fireEvent.click(screen.getByText("Toggle"));
    expect(screen.getByText("Step one")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Toggle"));
    // `Collapse` animates the exit, so the content leaves the DOM once that settles.
    await waitFor(() => expect(screen.queryByText("Step one")).not.toBeInTheDocument());
  });

  it("is controlled when open is given: clicking calls onOpenChange and the prop still wins", () => {
    const onOpenChange = vi.fn();
    render(<ThreeSteps open={false} onOpenChange={onOpenChange} />);

    fireEvent.click(screen.getByText("Toggle"));
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(screen.queryByText("Step one")).not.toBeInTheDocument();
  });

  it("renders a Bar between items but none after the last one", () => {
    render(<ThreeSteps />);
    expect(screen.getAllByTestId("steps-bar")).toHaveLength(2);
  });

  it.each([
    ["Steps.Trigger", () => <Steps.Trigger>x</Steps.Trigger>],
    ["Steps.Content", () => <Steps.Content>x</Steps.Content>],
    ["Steps.Item", () => <Steps.Item>x</Steps.Item>],
    ["Steps.Bar", () => <Steps.Bar />],
  ] as const)("%s throws the documented error outside <Steps>", (_name, render_) => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(render_())).toThrow("Steps parts must be used inside <Steps>");
    spy.mockRestore();
  });

  it("accepts sx and className on Steps itself", () => {
    const { container } = render(
      <Steps className="my-steps" sx={{ p: 2 }}>
        <Steps.Content>content</Steps.Content>
      </Steps>
    );
    expect(container.querySelector(".my-steps")).toBeInTheDocument();
  });
});
