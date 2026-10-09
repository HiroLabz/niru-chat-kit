import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { Loader } from "./loader";
import type { LoaderVariant } from "./loader";

describe("Loader", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const originalVariants: LoaderVariant[] = ["dots", "typing", "shimmer", "circular"];
  const newVariants: LoaderVariant[] = [
    "classic",
    "pulse",
    "pulse-dot",
    "wave",
    "bars",
    "terminal",
    "text-blink",
    "text-shimmer",
    "loading-dots",
  ];

  it.each(originalVariants)("renders the %s variant with an accessible status role and its text", (variant) => {
    render(<Loader variant={variant} text="Thinking" />);

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText("Thinking")).toBeInTheDocument();
  });

  it.each(newVariants)("renders the %s variant with an accessible status role", (variant) => {
    render(<Loader variant={variant} text="Thinking" />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it.each(newVariants)("renders the %s variant at every size without throwing", (variant) => {
    for (const size of ["sm", "md", "lg"] as const) {
      const { unmount } = render(<Loader variant={variant} size={size} />);
      expect(screen.getByRole("status")).toBeInTheDocument();
      unmount();
    }
  });

  it("falls back to a 'Loading' accessible label when no text is given", () => {
    render(<Loader variant="circular" />);
    expect(screen.getByRole("status")).toHaveAccessibleName("Loading");
  });

  it("shows 'Thinking' embedded in the terminal, text-blink and loading-dots variants", () => {
    render(<Loader variant="terminal" text="Thinking" />);
    expect(screen.getByText("Thinking")).toBeInTheDocument();

    render(<Loader variant="text-blink" text="Thinking" />);
    expect(screen.getAllByText("Thinking").length).toBeGreaterThan(0);

    render(<Loader variant="loading-dots" text="Thinking" />);
    expect(screen.getAllByText("Thinking").length).toBeGreaterThan(0);
  });

  it("disables the keyframe animation under prefers-reduced-motion while staying visible", () => {
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

    render(<Loader variant="wave" />);
    const styleText = Array.from(document.querySelectorAll("style[data-emotion]"))
      .map((tag) => tag.textContent ?? "")
      .join("");

    expect(styleText).toContain("prefers-reduced-motion");
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});
