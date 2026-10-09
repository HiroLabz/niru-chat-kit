import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { JSXPreview } from "./jsx-preview";
import { parseStyle } from "./jsx-parser";

function Card({ title, children }: { title?: string; children?: React.ReactNode }) {
  return (
    <section data-testid="card" data-title={title}>
      {children}
    </section>
  );
}

function Link({ href, children }: { href?: string; children?: React.ReactNode }) {
  return <a href={href}>{children}</a>;
}

const COMPONENTS = { Card, Link };

function html(jsx: string, components: Record<string, React.ElementType> = COMPONENTS) {
  const { container } = render(<JSXPreview jsx={jsx} components={components} />);
  return container.firstElementChild as HTMLElement;
}

describe("JSXPreview", () => {
  it("renders nothing until the caller passes an allowlist", () => {
    const { container } = render(<JSXPreview jsx="<p>hello</p>" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders allowed HTML tags and listed components with string props and nesting", () => {
    const root = html('<div><h2>Plan</h2><Card title="Q3"><p>Ship <strong>it</strong></p></Card><ul><li>one</li><li>two</li></ul><br/></div>');
    expect(root.querySelector("h2")).toHaveTextContent("Plan");
    expect(screen.getByTestId("card")).toHaveAttribute("data-title", "Q3");
    expect(screen.getByTestId("card").querySelector("strong")).toHaveTextContent("it");
    expect(root.querySelectorAll("li")).toHaveLength(2);
  });

  it("renders a table with colSpan and rowSpan as numbers", () => {
    const root = html('<table><tbody><tr><td colSpan="2" rowSpan={3}>x</td></tr></tbody></table>');
    const cell = root.querySelector("td");
    expect(cell).toHaveAttribute("colspan", "2");
    expect(cell).toHaveAttribute("rowspan", "3");
  });

  describe("forbidden directions", () => {
    it("shows a script tag as inert text and runs nothing", () => {
      const spy = vi.fn();
      (window as unknown as { __ran: () => void }).__ran = spy;
      const root = html("<p>a</p><script>window.__ran()</script><p>b</p>");
      expect(root.querySelector("script")).toBeNull();
      expect(root.textContent).toContain("<script>");
      expect(root.textContent).toContain("window.__ran()");
      expect(spy).not.toHaveBeenCalled();
    });

    it("drops an onClick handler and every other on* attribute", () => {
      const root = html('<span onClick="alert(1)" onclick={alert} onMouseOver="x" title="ok">tap</span>');
      const span = root.querySelector("span") as HTMLElement;
      expect(span).toHaveAttribute("title", "ok");
      expect(Array.from(span.attributes).map((attribute) => attribute.name).filter((name) => name.startsWith("on"))).toEqual([]);
      fireEvent.click(span);
    });

    it("drops a javascript: href on a listed component, however it is spelled", () => {
      for (const href of ["javascript:alert(1)", "  JavaScript:alert(1)", "java\tscript:alert(1)", "data:text/html,<b>x</b>", "vbscript:x"]) {
        const { container, unmount } = render(<JSXPreview jsx={`<Link href="${href}">go</Link>`} components={COMPONENTS} />);
        expect(container.querySelector("a")).not.toHaveAttribute("href");
        unmount();
      }
    });

    it("keeps a normal https href on a listed component", () => {
      const root = html('<Link href="https://example.com/a">go</Link>');
      expect(root.querySelector("a")).toHaveAttribute("href", "https://example.com/a");
    });

    it("gives a plain HTML tag no href or src at all", () => {
      const root = html('<span href="https://example.com" src="https://example.com/x.png" id="a">x</span>');
      const span = root.querySelector("span") as HTMLElement;
      expect(span).not.toHaveAttribute("href");
      expect(span).not.toHaveAttribute("src");
      expect(span).not.toHaveAttribute("id");
    });

    it("never evaluates an expression: it stays text in a body and is dropped as an attribute", () => {
      const spy = vi.fn();
      (window as unknown as { __ran: () => void }).__ran = spy;
      const root = html('<p title={window.__ran()} className={window.__ran()}>total: {window.__ran()} {1 + 1}</p>');
      const paragraph = root.querySelector("p") as HTMLElement;
      expect(spy).not.toHaveBeenCalled();
      expect(paragraph).not.toHaveAttribute("title");
      expect(paragraph).not.toHaveAttribute("class");
      expect(paragraph.textContent).toBe("total: {window.__ran()} {1 + 1}");
    });

    it("shows an unknown element as text and keeps rendering around it", () => {
      const root = html("<p>before</p><iframe src='https://evil.example'></iframe><Widget x=\"1\"/><p>after</p>");
      expect(root.querySelector("iframe")).toBeNull();
      expect(root.textContent).toContain("<iframe");
      expect(root.textContent).toContain("<Widget");
      expect(root.querySelectorAll("p")).toHaveLength(2);
    });

    it("does not let an Object.prototype name pass for a listed component", () => {
      const root = html("<constructor>x</constructor><toString/>");
      expect(root.textContent).toContain("<constructor>");
    });

    it("refuses dangerouslySetInnerHTML, ref and key on a listed component", () => {
      const Probe = vi.fn(({ children }: { children?: React.ReactNode }) => <i>{children}</i>);
      html('<Probe dangerouslySetInnerHTML="<b>x</b>" ref="r" key="k" label="ok">in</Probe>', { Probe });
      const props = Probe.mock.calls[0][0] as Record<string, unknown>;
      expect(props).not.toHaveProperty("dangerouslySetInnerHTML");
      expect(props).not.toHaveProperty("ref");
      expect(props.label).toBe("ok");
    });

    it("keeps style to plain declarations: no url(), expression() or javascript:", () => {
      expect(parseStyle("color: red; background: url(https://x/y.png); width: expression(alert(1)); margin-top: 4px; behavior: url(x)")).toEqual({
        color: "red",
        marginTop: "4px",
      });
      const root = html('<span style="color: red; background-image: url(javascript:alert(1))">s</span>');
      const span = root.querySelector("span") as HTMLElement;
      expect(span.style.color).toBe("red");
      expect(span.style.backgroundImage).toBe("");
    });
  });

  describe("streaming", () => {
    it("closes tags still open and hides a half-written one", () => {
      const { container } = render(<JSXPreview jsx={'<div><p>partial <strong>bo'} components={COMPONENTS} isStreaming />);
      expect(container.querySelector("strong")).toHaveTextContent("bo");
      const half = render(<JSXPreview jsx={'<p>done</p><Card ti'} components={COMPONENTS} isStreaming />);
      expect(half.container.textContent).toBe("done");
    });

    it("shows a half-written tag as text once streaming has ended", () => {
      const { container } = render(<JSXPreview jsx={"<p>done</p><Card ti"} components={COMPONENTS} />);
      expect(container.textContent).toBe("done<Card ti");
    });
  });
});
