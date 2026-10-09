import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ThemeProvider, createTheme } from "@mui/material/styles";

const { codeToHtml } = vi.hoisted(() => ({ codeToHtml: vi.fn() }));

vi.mock("shiki", () => ({ codeToHtml }));

import { CodeBlock } from "./code-block";

const DUAL_THEMES = { light: "one-light", dark: "one-dark-pro" };

function stubClipboard() {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    writable: true,
    configurable: true,
  });
  return writeText;
}

describe("CodeBlock", () => {
  beforeEach(() => {
    codeToHtml.mockReset();
    // Never resolves by default, so tests that do not care about the
    // highlighted result are not racing a pending microtask.
    codeToHtml.mockImplementation(() => new Promise(() => {}));
  });

  it("shows plain text immediately, before the dynamic import resolves", () => {
    render(<CodeBlock code="print(1)" language="py" />);
    const pre = screen.getByText("print(1)").closest("pre");
    expect(pre).not.toBeNull();
  });

  it("keeps the plain text and surfaces no error when highlighting rejects", async () => {
    codeToHtml.mockRejectedValue(new Error("boom"));
    render(<CodeBlock code="print(1)" language="py" />);

    await waitFor(() => expect(codeToHtml).toHaveBeenCalled());
    expect(screen.getByText("print(1)")).toBeInTheDocument();
  });

  it("copies the code and shows a Copied state on click", async () => {
    const writeText = stubClipboard();
    render(<CodeBlock code="print(1)" language="py" />);

    fireEvent.click(screen.getByRole("button", { name: /copy/i }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith("print(1)"));
    await waitFor(() => expect(screen.getByText("Copied")).toBeInTheDocument());
  });

  it("shows the language label, or text when absent", () => {
    render(<CodeBlock code="print(1)" language="py" />);
    expect(screen.getByText("py")).toBeInTheDocument();

    render(<CodeBlock code="plain words" />);
    expect(screen.getByText("text")).toBeInTheDocument();
  });

  it("requests shiki's dual light/dark theme output in one call", async () => {
    codeToHtml.mockResolvedValue('<pre class="shiki">highlighted</pre>');
    render(<CodeBlock code="print(1)" language="py" />);

    await waitFor(() => expect(codeToHtml).toHaveBeenCalled());
    expect(codeToHtml).toHaveBeenCalledWith(
      "print(1)",
      expect.objectContaining({ lang: "py", themes: DUAL_THEMES })
    );
  });

  it("requests the same dual-theme output when rendered under a dark colour scheme", async () => {
    codeToHtml.mockResolvedValue('<pre class="shiki">highlighted</pre>');
    const darkTheme = createTheme({ palette: { mode: "dark" } });
    render(
      <ThemeProvider theme={darkTheme}>
        <CodeBlock code="print(1)" language="py" />
      </ThemeProvider>
    );

    await waitFor(() => expect(codeToHtml).toHaveBeenCalled());
    // Highlighting does not branch on `palette.mode` — rendering under a
    // dark theme makes the same request as under the default (light) one.
    expect(codeToHtml).toHaveBeenCalledWith(
      "print(1)",
      expect.objectContaining({ lang: "py", themes: DUAL_THEMES })
    );
  });
});
