import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ResponseStream } from "./response-stream";

describe("ResponseStream", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders plain text with no spans by default", () => {
    const { container } = render(<ResponseStream text="hello world" />);
    expect(container.querySelectorAll("span span")).toHaveLength(0);
    expect(screen.getByText("hello world")).toBeInTheDocument();
  });

  it("fade mode renders one span per segmented word", () => {
    const { container } = render(<ResponseStream text="hello world" mode="fade" />);
    // Outer <Box component="span"> plus one inner span per segment (word + the
    // whitespace between), so compare against the root's direct span children.
    const root = container.firstElementChild as HTMLElement;
    expect(root.children.length).toBeGreaterThan(0);
    expect(root.textContent).toBe("hello world");
  });

  it("keeps earlier spans as the same DOM node while the stream appends text", () => {
    const { container, rerender } = render(<ResponseStream text="hello wor" mode="fade" />);
    const root = container.firstElementChild as HTMLElement;
    const firstSpanBefore = root.children[0];

    rerender(<ResponseStream text="hello world there" mode="fade" />);
    const firstSpanAfter = root.children[0];

    expect(firstSpanAfter).toBe(firstSpanBefore);
    expect(root.textContent).toBe("hello world there");
  });

  it("renders plain text under prefers-reduced-motion even when fade is requested", () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }));

    const { container } = render(<ResponseStream text="hello world" mode="fade" />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.children.length).toBe(0);
    expect(root.textContent).toBe("hello world");
  });
});
