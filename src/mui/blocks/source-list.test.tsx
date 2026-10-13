import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { SourceList } from "./source-list";
import type { Citation } from "../../core/types";

const DOCUMENT_CITATION: Citation = {
  kind: "document",
  label: "report.pdf, p.3",
  document_id: "d1",
  filename: "report.pdf",
  page: 3,
  url: null,
  title: null,
};

const WEB_CITATION: Citation = {
  kind: "web",
  label: "Example Page",
  document_id: null,
  filename: null,
  page: null,
  url: "https://example.com/page",
  title: "Example Page",
};

describe("SourceList", () => {
  it("renders nothing when citations is undefined", () => {
    const { container } = render(<SourceList citations={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when citations is an empty list", () => {
    const { container } = render(<SourceList citations={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders a document citation as a chip labeled with its label", () => {
    render(<SourceList citations={[DOCUMENT_CITATION]} />);
    expect(screen.getByText("report.pdf, p.3")).toBeInTheDocument();
  });

  it("renders a web citation as a chip linking to its url in a new tab", () => {
    render(<SourceList citations={[WEB_CITATION]} />);
    const link = screen.getByText("Example Page").closest("a");
    expect(link).toHaveAttribute("href", "https://example.com/page");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("dedupes document citations by label", () => {
    render(
      <SourceList citations={[DOCUMENT_CITATION, { ...DOCUMENT_CITATION, page: 4 }]} />
    );
    expect(screen.getAllByText("report.pdf, p.3")).toHaveLength(1);
  });

  it("opens a hover card with the title and host for a web citation", () => {
    render(<SourceList citations={[WEB_CITATION]} />);
    const link = screen.getByText("Example Page").closest("a") as HTMLElement;

    fireEvent.mouseEnter(link);
    expect(screen.getByText("example.com")).toBeInTheDocument();
  });

  it("keeps the chip a plain clickable link with no backdrop while the card is open", () => {
    render(<SourceList citations={[WEB_CITATION]} />);
    const link = screen.getByText("Example Page").closest("a") as HTMLElement;
    fireEvent.mouseEnter(link);
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    expect(document.querySelector('[class*="MuiBackdrop"], [class*="MuiModal"], [class*="MuiPopover"]')).toBeNull();
    expect(link.closest("button")).toBeNull();
    const event = new MouseEvent("click", { bubbles: true, cancelable: true });
    link.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });

  it("renders no hover card trigger for a document citation, which has no url", () => {
    render(<SourceList citations={[DOCUMENT_CITATION]} />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("dedupes web citations by url, not by label alone", () => {
    render(
      <SourceList
        citations={[
          WEB_CITATION,
          { ...WEB_CITATION, url: "https://example.com/other-page" },
        ]}
      />
    );
    const links = screen.getAllByText("Example Page").map((el) => el.closest("a"));
    expect(links).toHaveLength(2);
    expect(links.map((link) => link?.getAttribute("href"))).toEqual([
      "https://example.com/page",
      "https://example.com/other-page",
    ]);
  });
});

describe("SourceList long titles", () => {
  const LONG =
    "GitHub - astral-sh/uv: An extremely fast Python package and project manager, written in Rust. · GitHub";

  it("keeps a long web title on one truncated line with its full name available", () => {
    render(
      <SourceList
        citations={[{ ...WEB_CITATION, label: LONG, title: LONG, url: "https://github.com/astral-sh/uv" }]}
      />
    );
    const link = screen.getByRole("link", { name: LONG });
    expect(link).toHaveAttribute("title", LONG);
    const text = screen.getByText(LONG);
    expect(text).toHaveStyle({ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" });
    expect(link).toHaveStyle({ maxWidth: "240px", whiteSpace: "nowrap" });
  });

  it("wraps a long document chip label so it reads in full", () => {
    render(<SourceList citations={[{ ...DOCUMENT_CITATION, label: LONG }]} />);
    expect(screen.getByTitle(LONG)).toHaveStyle({ maxWidth: "100%", height: "auto" });
    expect(screen.getByText(LONG)).toHaveStyle({ whiteSpace: "normal", overflowWrap: "anywhere" });
  });
});
