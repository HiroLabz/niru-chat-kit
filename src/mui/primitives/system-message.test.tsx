import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { SystemMessage } from "./system-message";

describe("SystemMessage", () => {
  it.each([
    ["info", "MuiAlert-colorInfo"],
    ["warning", "MuiAlert-colorWarning"],
    ["error", "MuiAlert-colorError"],
  ] as const)("maps severity %s to the matching Alert class", (severity, className) => {
    const { container } = render(<SystemMessage severity={severity}>Heads up</SystemMessage>);
    expect(container.querySelector(`[role="alert"]`)).not.toBeNull();
    expect(container.querySelector(`.${className}`)).not.toBeNull();
    expect(screen.getByText("Heads up")).toBeInTheDocument();
  });

  it("renders the action node", () => {
    const onDismiss = vi.fn();
    render(
      <SystemMessage
        severity="warning"
        action={<button onClick={onDismiss}>Dismiss</button>}
      >
        Retrying the connection
      </SystemMessage>
    );

    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
