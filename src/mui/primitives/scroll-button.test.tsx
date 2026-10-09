import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ScrollButton } from "./scroll-button";

describe("ScrollButton", () => {
  it("renders nothing when not visible", () => {
    render(<ScrollButton visible={false} onClick={() => {}} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders a labeled button when visible, and calls onClick once per click", () => {
    const onClick = vi.fn();
    render(<ScrollButton visible onClick={onClick} />);

    const button = screen.getByRole("button", { name: "Jump to latest message" });
    fireEvent.click(button);

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
