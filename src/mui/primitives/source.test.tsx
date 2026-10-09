import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Source, faviconHost } from "./source";

function SourceCard({ href, showFavicon }: { href: string; showFavicon?: boolean }) {
  return (
    <Source href={href}>
      <Source.Trigger label="Example" showFavicon={showFavicon} />
      <Source.Content title="Example title" description="A short snippet" />
    </Source>
  );
}

describe("faviconHost", () => {
  it("returns the host for a plain http(s) URL", () => {
    expect(faviconHost("https://example.com/page")).toBe("example.com");
    expect(faviconHost("http://example.com")).toBe("example.com");
  });

  it.each(["javascript:alert(1)", "data:text/html,x", "mailto:a@b.com", "not a url"])(
    "returns null for a non-http(s) value (%s)",
    (href) => {
      expect(faviconHost(href)).toBeNull();
    }
  );
});

describe("Source", () => {
  it("renders a link with rel noopener noreferrer, opening in a new tab", () => {
    render(<SourceCard href="https://example.com/page" />);
    const link = screen.getByRole("link", { name: /Example/ });
    expect(link).toHaveAttribute("href", "https://example.com/page");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("shows the card on hover and hides it after the pointer leaves", async () => {
    render(<SourceCard href="https://example.com/page" />);
    expect(screen.queryByText("Example title")).not.toBeInTheDocument();
    const link = screen.getByRole("link", { name: /Example/ });

    fireEvent.mouseEnter(link);
    expect(screen.getByText("Example title")).toBeInTheDocument();
    expect(screen.getByText("example.com")).toBeInTheDocument();
    expect(screen.getByText("A short snippet")).toBeInTheDocument();

    fireEvent.mouseLeave(link);
    await waitFor(() => expect(screen.queryByText("Example title")).not.toBeInTheDocument());
  });

  it("shows the card on keyboard focus and hides it on blur", async () => {
    render(<SourceCard href="https://example.com/page" />);
    const link = screen.getByRole("link", { name: /Example/ });

    fireEvent.focus(link);
    expect(screen.getByText("Example title")).toBeInTheDocument();

    fireEvent.blur(link);
    await waitFor(() => expect(screen.queryByText("Example title")).not.toBeInTheDocument());
  });

  it("renders a favicon image for a plain http(s) URL when showFavicon is not disabled", () => {
    const { container } = render(<SourceCard href="https://example.com/page" />);
    const img = container.querySelector("img");
    expect(img).toHaveAttribute("src", expect.stringContaining("example.com"));
  });

  it("never renders a favicon image for a non-http(s) href", () => {
    const { container } = render(<SourceCard href="javascript:alert(1)" />);
    expect(container.querySelector("img")).not.toBeInTheDocument();
  });

  it("renders no favicon when showFavicon is false even for a plain http(s) URL", () => {
    const { container } = render(<SourceCard href="https://example.com/page" showFavicon={false} />);
    expect(container.querySelector("img")).not.toBeInTheDocument();
  });

  it.each([
    ["Source.Trigger", () => <Source.Trigger label="x" />],
    ["Source.Content", () => <Source.Content />],
  ] as const)("%s throws the documented error outside <Source>", (_name, render_) => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(render_())).toThrow("Source parts must be used inside <Source>");
    spy.mockRestore();
  });

  it("accepts sx and className on Source", () => {
    const { container } = render(
      <Source href="https://example.com" className="my-source" sx={{ p: 1 }}>
        <Source.Trigger label="Example" />
      </Source>
    );
    expect(container.querySelector(".my-source")).toBeInTheDocument();
  });
});

describe("Source non-modal card", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  function open() {
    const view = render(<SourceCard href="https://example.com/page" />);
    const link = screen.getByRole("link", { name: /Example/ });
    fireEvent.mouseEnter(link);
    return { ...view, link };
  }

  it("has no modal, backdrop, popover or scroll lock while open", () => {
    open();
    expect(screen.getByText("Example title")).toBeInTheDocument();
    for (const name of ["MuiBackdrop", "MuiModal", "MuiPopover"]) {
      expect(document.querySelector(`[class*="${name}"]`)).toBeNull();
    }
    expect(document.body.style.overflow).toBe("");
    expect(document.body.style.paddingRight).toBe("");
  });

  it("gives the card role tooltip and references it from the trigger", () => {
    const { link } = open();
    const card = screen.getByRole("tooltip");
    expect(link).toHaveAttribute("aria-describedby", card.id);
    expect(link.tagName).toBe("A");
  });

  it("does not prevent default on click, middle click or Enter", () => {
    const { link } = open();
    for (const init of [{ button: 0 }, { button: 1 }]) {
      const event = new MouseEvent("click", { bubbles: true, cancelable: true, ...init });
      link.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(false);
    }
    const key = new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true });
    link.dispatchEvent(key);
    expect(key.defaultPrevented).toBe(false);
  });

  it("closes after the delay once the pointer leaves", () => {
    vi.useFakeTimers();
    const { link } = open();
    fireEvent.mouseLeave(link);
    expect(screen.getByText("Example title")).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.queryByText("Example title")).not.toBeInTheDocument();
  });

  it("stays open when the pointer moves onto the card", () => {
    vi.useFakeTimers();
    const { link } = open();
    fireEvent.mouseLeave(link);
    fireEvent.mouseEnter(screen.getByText("Example title"));
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(screen.getByText("Example title")).toBeInTheDocument();
  });

  it("closes on Escape", () => {
    open();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByText("Example title")).not.toBeInTheDocument();
  });

  it("closes on blur after the delay", () => {
    vi.useFakeTimers();
    const { link } = open();
    fireEvent.blur(link);
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.queryByText("Example title")).not.toBeInTheDocument();
  });

  it("closes on scroll", () => {
    open();
    fireEvent.scroll(window);
    expect(screen.queryByText("Example title")).not.toBeInTheDocument();
  });

  it("unmounting with a pending close timer does not throw or warn", () => {
    vi.useFakeTimers();
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { link, unmount } = open();
    fireEvent.mouseLeave(link);
    unmount();
    expect(() => vi.advanceTimersByTime(500)).not.toThrow();
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
