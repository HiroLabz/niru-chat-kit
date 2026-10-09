import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ThinkingBar } from "./thinking-bar";

describe("ThinkingBar", () => {
  it("shows 'Thinking' by default", () => {
    render(<ThinkingBar />);
    expect(screen.getByText("Thinking")).toBeInTheDocument();
  });

  it("shows a custom text", () => {
    render(<ThinkingBar text="Searching the docs" />);
    expect(screen.getByText("Searching the docs")).toBeInTheDocument();
  });

  it("renders no Stop button when onStop is not given", () => {
    render(<ThinkingBar />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders a Stop button that calls onStop when onStop is given", () => {
    const onStop = vi.fn();
    render(<ThinkingBar onStop={onStop} />);

    const button = screen.getByRole("button", { name: "Stop" });
    fireEvent.click(button);
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  /**
   * Redesign: Stop reads as a quiet text link (dotted underline, muted color), not
   * an outlined/contained MUI `Button` — pins that no `Button` styles leak back in.
   */
  it("renders Stop as a plain element, not an MUI Button", () => {
    render(<ThinkingBar onStop={() => {}} />);

    const button = screen.getByRole("button", { name: "Stop" });
    expect(button.tagName).toBe("BUTTON");
    expect(button.className).not.toMatch(/MuiButton-root/);
  });

  it("uses a custom stopLabel", () => {
    render(<ThinkingBar onStop={() => {}} stopLabel="Cancel" />);
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("accepts sx and className", () => {
    const { container } = render(<ThinkingBar className="my-thinking-bar" sx={{ p: 1 }} />);
    expect(container.querySelector(".my-thinking-bar")).toBeInTheDocument();
  });
});
