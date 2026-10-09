import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { FeedbackBar } from "./feedback-bar";
import { FEEDBACK_COPY } from "../../core/stream/turn-copy";

/** A promise this test controls the settling of, so a click can be observed mid-flight. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("FeedbackBar", () => {
  it("rates once per click, disables both buttons while pending, and marks the chosen button on success", async () => {
    const { promise, resolve } = deferred<void>();
    const onRate = vi.fn().mockReturnValue(promise);
    render(<FeedbackBar value={null} onRate={onRate} />);

    const up = screen.getByRole("button", { name: FEEDBACK_COPY.up });
    const down = screen.getByRole("button", { name: FEEDBACK_COPY.down });

    fireEvent.click(up);
    expect(onRate).toHaveBeenCalledTimes(1);
    expect(onRate).toHaveBeenCalledWith("up");
    expect(up).toBeDisabled();
    expect(down).toBeDisabled();

    // A second click while the first request is still in flight does nothing.
    fireEvent.click(up);
    expect(onRate).toHaveBeenCalledTimes(1);

    resolve();
    await waitFor(() => expect(up).not.toBeDisabled());
    expect(up).toHaveAttribute("aria-pressed", "true");
    expect(down).toHaveAttribute("aria-pressed", "false");
  });

  it("restores the previous rating and shows an error when the request is rejected", async () => {
    const onRate = vi.fn().mockRejectedValue(new Error("network down"));
    render(<FeedbackBar value={null} onRate={onRate} />);

    const down = screen.getByRole("button", { name: FEEDBACK_COPY.down });
    fireEvent.click(down);

    await waitFor(() => expect(down).not.toBeDisabled());
    expect(down).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("alert")).toHaveTextContent(FEEDBACK_COPY.error);
  });

  it("reflects a rating the server already recorded", () => {
    render(<FeedbackBar value="up" onRate={vi.fn()} />);
    expect(screen.getByRole("button", { name: FEEDBACK_COPY.up })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });
});
