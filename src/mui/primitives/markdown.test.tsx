import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

// Never resolves: these tests only care about markdown structure and the
// plain-text fallback CodeBlock shows before shiki loads, never the
// highlighted result.
vi.mock("shiki", () => ({ codeToHtml: () => new Promise(() => {}) }));

const mathImports = vi.hoisted(() => ({ fail: false, loads: 0 }));
// The factory runs once per file, so failure and counting hang off the
// `default` getter, read each time the loader assembles the plugins.
vi.mock("remark-math", async (importOriginal) => {
  const original = await importOriginal<typeof import("remark-math")>();
  return {
    get default() {
      mathImports.loads += 1;
      if (mathImports.fail) throw new Error("load failed");
      return original.default;
    },
  };
});

import { Markdown, MarkdownComponentsProvider } from "./markdown";
import { resetMathPluginsForTests } from "../../core/markdown/math-plugins";

describe("Markdown", () => {
  it("splits top-level markdown into separate blocks", () => {
    render(<Markdown>{"# A\n\npara\n\n- x"}</Markdown>);

    expect(screen.getByRole("heading", { name: "A" })).toBeInTheDocument();
    expect(screen.getByText("para")).toBeInTheDocument();
    expect(screen.getByText("x")).toBeInTheDocument();
  });

  /**
   * Streaming appends to the last block only. If every block re-rendered on
   * every token, an unmemoized sibling would re-run the whole remark pipeline
   * once per token, exactly the cost `MarkdownPreview`'s single-block memo
   * avoids today (see `message-bubble.tsx`). This pins the per-block memo.
   */
  it("does not re-render the first block when the last block is extended", () => {
    const renders: number[] = [];
    const onBlockRender = (index: number) => renders.push(index);
    const { rerender } = render(
      <Markdown onBlockRender={onBlockRender}>{"# A\n\npara\n\n- x"}</Markdown>
    );

    rerender(
      <Markdown onBlockRender={onBlockRender}>{"# A\n\npara\n\n- x\n- y"}</Markdown>
    );

    expect(renders.filter((index) => index === 0)).toHaveLength(1);
  });

  it("renders an unclosed fence as a CodeBlock without throwing", () => {
    expect(() =>
      render(<Markdown>{"text\n\n```py\nprint(1)"}</Markdown>)
    ).not.toThrow();

    expect(screen.getByText("print(1)")).toBeInTheDocument();
  });

  it("renders inline code as a plain code element, not a CodeBlock", () => {
    render(<Markdown>{"inline `x` code"}</Markdown>);

    const codeEl = screen.getByText("x");
    expect(codeEl.tagName).toBe("CODE");
    expect(screen.queryByRole("button", { name: /copy/i })).not.toBeInTheDocument();
  });

  it("never renders a script tag from the source", () => {
    const { container } = render(
      <Markdown>{"before <script>alert(1)</script> after"}</Markdown>
    );

    expect(container.querySelector("script")).toBeNull();
  });

  it("strips a javascript: href from a model-written link", () => {
    const { container } = render(<Markdown>{"[x](javascript:alert(1))"}</Markdown>);

    // An empty `href` (react-markdown's sanitised result) is not an
    // accessible "link" in jsdom's a11y tree, so the anchor is found by tag.
    const link = container.querySelector("a");
    expect(link).not.toBeNull();
    expect(link?.getAttribute("href")).not.toBe("javascript:alert(1)");
  });

  it("renders a markdown image through Image, skeleton and all", () => {
    render(<Markdown>{"![a cat](https://example.com/cat.png)"}</Markdown>);

    expect(screen.getByAltText("a cat")).toBeInTheDocument();
    // Only `Image` renders this skeleton; a bare `<img>` from the `img`
    // override not routing through it would not.
    expect(screen.getByTestId("chat-image-skeleton")).toBeInTheDocument();
  });

  it("never renders a javascript: image src", () => {
    const { container } = render(<Markdown>{"![x](javascript:alert(1))"}</Markdown>);

    const img = container.querySelector("img");
    expect(img?.getAttribute("src") ?? "").not.toContain("javascript:");
  });

  describe("maths", () => {
    beforeEach(() => {
      mathImports.fail = false;
      mathImports.loads = 0;
      resetMathPluginsForTests();
    });

    it("renders the failing \\( \\) text as KaTeX, not raw TeX", async () => {
      const text =
        "\\(2 \\times 9 = 18\\) more sheep. Total now: \\(9 + 18 = \\mathbf{27}\\) sheep.";
      const { container } = render(<Markdown>{text}</Markdown>);

      await waitFor(() => expect(container.querySelectorAll(".katex")).toHaveLength(2));
      expect(container.querySelector(".katex-mathml")).not.toBeNull();
      // KaTeX keeps the TeX source in a hidden MathML <annotation>; what is
      // visible must not contain it.
      container.querySelectorAll("annotation").forEach((node) => node.remove());
      expect(container.textContent).not.toContain("\\times");
      expect(screen.getByText(/more sheep/)).toBeInTheDocument();
    });

    it("renders a multi-line $$ block with a blank line as one display block", async () => {
      const { container } = render(<Markdown>{"before\n\n$$\na\n\n+ b\n$$\n\nafter"}</Markdown>);

      await waitFor(() => expect(container.querySelectorAll(".katex-display")).toHaveLength(1));
      expect(container.querySelectorAll(".katex")).toHaveLength(1);
    });

    it("renders \\[ \\] as display maths", async () => {
      const { container } = render(<Markdown>{"see \\[x^2\\] done"}</Markdown>);

      await waitFor(() => expect(container.querySelector(".katex-display")).not.toBeNull());
    });

    it("never imports KaTeX for a message without maths, currency included", async () => {
      const { container } = render(<Markdown>{"It costs $5 and $10, plain."}</Markdown>);

      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(mathImports.loads).toBe(0);
      expect(container.querySelector(".katex")).toBeNull();
      expect(container.textContent).toBe("It costs $5 and $10, plain.");
    });

    it("falls back to the source when the import fails", async () => {
      mathImports.fail = true;
      const { container } = render(<Markdown>{"x \\(a\\) y"}</Markdown>);

      await waitFor(() => expect(mathImports.loads).toBeGreaterThan(0));
      expect(container.querySelector(".katex")).toBeNull();
      expect(container.textContent).toContain("x");
    });

    it("does not throw on an invalid expression", async () => {
      const { container } = render(<Markdown>{"bad \\(\\frac{\\)"}</Markdown>);

      await waitFor(() => expect(container.querySelector(".katex-error, .katex")).not.toBeNull());
    });
  });
});

describe("MarkdownComponentsProvider", () => {
  it("lets the host app replace how every image in the markdown is drawn", () => {
    render(
      <MarkdownComponentsProvider components={{ img: ({ src }) => <span>held {String(src)}</span> }}>
        <Markdown>{"![chart](https://example.com/c.png)"}</Markdown>
      </MarkdownComponentsProvider>
    );

    expect(screen.getByText("held https://example.com/c.png")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("keeps a component passed straight to Markdown over the provided one", () => {
    render(
      <MarkdownComponentsProvider components={{ img: () => <span>from provider</span> }}>
        <Markdown components={{ img: () => <span>from props</span> }}>{"![a](https://example.com/a.png)"}</Markdown>
      </MarkdownComponentsProvider>
    );

    expect(screen.getByText("from props")).toBeInTheDocument();
  });
});
