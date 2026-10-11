import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { FullChat, type FullChatStream } from "./full-chat";

function stream(overrides: Partial<FullChatStream> = {}): FullChatStream {
  return { messages: [], status: "idle", error: null, interrupt: null, followUps: [], turnActions: null, send: vi.fn(), stop: vi.fn(), retry: vi.fn(), resume: vi.fn(), ...overrides };
}
const agent = { name: "Helper", initial: "H" };
const worked = {
  id: "a1",
  role: "assistant" as const,
  text: "Done",
  at: 1000,
  settledAt: 5000,
  parts: [
    { kind: "activity" as const, id: "p1", steps: [{ id: "k1", kind: "tool" as const, name: "web_search", title: "Searched the web", status: "success" as const, parentId: null, durationMs: 4000 }] },
    { kind: "text" as const, id: "p2", text: "Done" },
  ],
};

describe("optional looks and banner severity", () => {
  it("marks the composer parts with data-chat hooks", () => {
    const { container } = render(<FullChat stream={stream()} agent={agent} onAttach={() => undefined} />);
    for (const part of ["composer", "composer-bar", "composer-wrap", "send", "attach"]) expect(container.querySelector(`[data-chat="${part}"]`), part).not.toBeNull();
  });

  it("draws the working steps as a plain line by default and as a card with its state when asked", () => {
    const { container, rerender } = render(<FullChat stream={stream({ messages: [worked] })} agent={agent} />);
    expect(container.querySelector('[data-chat="steps"]')).not.toBeNull();
    expect(container.querySelector('[data-chat="steps-state"]')).toBeNull();
    rerender(<FullChat stream={stream({ messages: [worked] })} agent={agent} look={{ stepsCard: true }} />);
    expect(container.querySelector('[data-chat="steps-state"]')?.textContent).toBe("Finished");
  });

  it("shows the error banner as an error unless the host calls it a warning", () => {
    const { rerender } = render(<FullChat stream={stream({ error: "Nope" })} agent={agent} />);
    expect(screen.getByRole("alert").className).toMatch(/colorError/);
    rerender(<FullChat stream={stream({ error: "Nope" })} agent={agent} errorSeverity="warning" />);
    expect(screen.getByRole("alert").className).toMatch(/colorWarning/);
    expect(screen.getByRole("alert").getAttribute("data-chat")).toBe("banner");
  });
});
