import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { ThemeProvider, createTheme } from "@mui/material/styles";

const { codeToHtml } = vi.hoisted(() => ({ codeToHtml: vi.fn() }));
vi.mock("shiki", () => ({ codeToHtml }));

import { ChatKitProvider } from "../theme";
import { CodeBlock } from "./code-block";

describe("CodeBlock compound parts", () => {
  beforeEach(() => {
    codeToHtml.mockReset();
    codeToHtml.mockImplementation(() => new Promise(() => {}));
  });

  it("composes a group and code of the caller's own", () => {
    render(
      <CodeBlock>
        <CodeBlock.Group>
          <span>sql</span>
          <CodeBlock.CopyButton code="select 1" />
        </CodeBlock.Group>
        <CodeBlock.Code code="select 1" language="sql" />
      </CodeBlock>
    );
    expect(screen.getByText("sql")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /copy code/i })).toBeInTheDocument();
    expect(screen.getByText("select 1").closest("pre")).not.toBeNull();
  });

  it("lets Code read code and language from the enclosing CodeBlock", async () => {
    render(
      <CodeBlock code="print(1)" language="py">
        <CodeBlock.Code />
      </CodeBlock>
    );
    expect(screen.getByText("print(1)")).toBeInTheDocument();
    await waitFor(() => expect(codeToHtml).toHaveBeenCalledWith("print(1)", expect.objectContaining({ lang: "py" })));
  });

  it("highlights with the code themes the tokens name", async () => {
    render(
      <ThemeProvider theme={createTheme()}>
        <ChatKitProvider tokens={{ codeThemeLight: "github-light", codeThemeDark: "github-dark" }}>
          <CodeBlock code="x" language="ts" />
        </ChatKitProvider>
      </ThemeProvider>
    );
    await waitFor(() =>
      expect(codeToHtml).toHaveBeenCalledWith(
        "x",
        expect.objectContaining({ themes: { light: "github-light", dark: "github-dark" } })
      )
    );
  });
});
