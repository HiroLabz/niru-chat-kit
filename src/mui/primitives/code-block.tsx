"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import CheckIcon from "@mui/icons-material/Check";
import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import type { SxProps, Theme } from "@mui/material/styles";
import { DEFAULT_CODE_THEME_DARK, DEFAULT_CODE_THEME_LIGHT } from "../../core/tokens";
import { useChatKitStyles } from "../theme";
import { sxArray } from "./sx";

const COPIED_RESET_MS = 2000;

export type CodeThemes = { light: string; dark: string };

/**
 * Highlights `code` with shiki, imported dynamically so the highlighter
 * (large: grammars + a WASM regex engine) never enters the initial bundle.
 * Requests shiki's dual-theme output (`themes.light` + `themes.dark`), which
 * bakes both colour sets into the same markup as `--shiki-dark`/
 * `--shiki-dark-bg` CSS variables on every token, so the selector in `CodeBlock.Code`,
 * not this function, decides which set is visible: the result is correct on first
 * paint and on a mode toggle with no JS mode detection here.
 * Returns shiki's own HTML for this code string only, never anything derived from
 * the surrounding page or model output beyond `code` itself.
 */
export async function highlightCode(
  code: string,
  language: string | undefined,
  themes: CodeThemes = { light: DEFAULT_CODE_THEME_LIGHT, dark: DEFAULT_CODE_THEME_DARK }
): Promise<string> {
  const { codeToHtml } = await import("shiki");
  return codeToHtml(code, { lang: language || "text", themes });
}

type CodeBlockContextValue = { code?: string; language?: string };
const CodeBlockContext = createContext<CodeBlockContextValue>({});

/** Copies `code`, then reads "Copied" for a moment. */
function CodeBlockCopyButton({ code }: { code: string }) {
  const { scheme } = useChatKitStyles();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), COPIED_RESET_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  const handleCopy = () => {
    navigator.clipboard
      .writeText(code)
      .then(() => setCopied(true))
      .catch(() => {
        // No clipboard access (insecure context, denied permission): the
        // code is still selectable in the block.
      });
  };

  return (
    <Stack direction="row" sx={{ alignItems: "center", gap: 0.5 }}>
      {copied ? (
        <Typography variant="caption" sx={scheme((c) => ({ color: c.mutedText }))}>
          Copied
        </Typography>
      ) : null}
      <IconButton size="small" aria-label="Copy code" onClick={handleCopy}>
        {copied ? <CheckIcon fontSize="small" /> : <ContentCopyOutlinedIcon fontSize="small" />}
      </IconButton>
    </Stack>
  );
}

/** The row above the code: a language label on the left, actions on the right. */
function CodeBlockGroup({
  children,
  sx,
  className,
}: {
  children?: ReactNode;
  sx?: SxProps<Theme>;
  className?: string;
}) {
  return (
    <Stack
      direction="row"
      className={className}
      sx={[{ alignItems: "center", justifyContent: "space-between", px: 1.5, py: 0.5 }, ...sxArray(sx)]}
    >
      {children}
    </Stack>
  );
}

/**
 * The code itself: plain `<pre>` immediately, replaced by shiki's highlighted markup once
 * the dynamic import resolves. A failed import (network, unsupported language) leaves the
 * plain text in place rather than surfacing an error: highlighting is cosmetic, the code
 * is still readable. Takes `code` and `language` from its props, else from the enclosing
 * `CodeBlock`.
 */
function CodeBlockCode({
  code: codeProp,
  language: languageProp,
  sx,
  className,
}: {
  code?: string;
  language?: string;
  sx?: SxProps<Theme>;
  className?: string;
}) {
  const context = useContext(CodeBlockContext);
  const { tokens, scheme } = useChatKitStyles();
  const code = codeProp ?? context.code ?? "";
  const language = languageProp ?? context.language;
  const { codeThemeLight, codeThemeDark } = tokens;
  // Keyed so a `code`/`language`/theme change falls back to the plain `<pre>` below
  // without a synchronous reset in the effect: a result keyed to the previous inputs
  // just stops matching. Not keyed on colour scheme, since the dual-theme HTML carries
  // both palettes.
  const highlightKey = `${code}\u0000${language ?? ""}\u0000${codeThemeLight}\u0000${codeThemeDark}`;
  const [highlighted, setHighlighted] = useState<{ key: string; html: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    highlightCode(code, language, { light: codeThemeLight, dark: codeThemeDark })
      .then((html) => {
        if (!cancelled) setHighlighted({ key: highlightKey, html });
      })
      .catch(() => {
        // The plain `<pre>` below already shows the code; nothing to recover.
      });
    return () => {
      cancelled = true;
    };
  }, [code, language, codeThemeLight, codeThemeDark, highlightKey]);

  const html = highlighted?.key === highlightKey ? highlighted.html : null;

  if (html) {
    return (
      <Box
        className={className}
        sx={[
          { "& pre": { m: 0, p: 1.5, overflowX: "auto", fontSize: 13 } },
          // Shiki sets light-theme colours as inline styles and the dark set as
          // `--shiki-dark` / `--shiki-dark-bg` custom properties on the same elements,
          // per its dual-theme recipe. Inline styles beat any external rule's
          // specificity, so the dark values need `!important` under the dark scheme.
          (t: Theme) =>
            t.applyStyles("dark", {
              "& .shiki, & .shiki span": {
                color: "var(--shiki-dark) !important",
                backgroundColor: "var(--shiki-dark-bg) !important",
              },
            }),
          ...sxArray(sx),
        ]}
        // Safe: this HTML is shiki's own rendering of `code` above, never raw model
        // output or page-derived content.
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }
  return (
    <Box
      component="pre"
      className={className}
      sx={[
        scheme((_c, all) => ({ m: 0, p: 1.5, overflowX: "auto", fontSize: 13, fontFamily: all.monoFontFamily })),
        ...sxArray(sx),
      ]}
    >
      <code>{code}</code>
    </Box>
  );
}

export type CodeBlockProps = {
  /** With `code` and no children, renders the ready-made block: language label, copy button, code. */
  code?: string;
  language?: string;
  children?: ReactNode;
  sx?: SxProps<Theme>;
  className?: string;
};

/**
 * Fenced code block. Compound: `<CodeBlock><CodeBlock.Group/><CodeBlock.Code code language/></CodeBlock>`;
 * or ready-made with `code` and `language` props alone.
 */
export function CodeBlock({ code, language, children, sx, className }: CodeBlockProps) {
  const { scheme } = useChatKitStyles();
  return (
    <CodeBlockContext.Provider value={{ code, language }}>
      <Box
        className={className}
        sx={[
          scheme((c, all) => ({
            borderRadius: `${all.radius}px`,
            overflow: "hidden",
            my: 1,
            bgcolor: c.codeSurface,
          })),
          ...sxArray(sx),
        ]}
      >
        {children ?? (
          <>
            <CodeBlockGroup>
              <Typography
                variant="caption"
                sx={scheme((c, all) => ({ fontFamily: all.monoFontFamily, color: c.mutedText }))}
              >
                {language || "text"}
              </Typography>
              <CodeBlockCopyButton code={code ?? ""} />
            </CodeBlockGroup>
            <CodeBlockCode />
          </>
        )}
      </Box>
    </CodeBlockContext.Provider>
  );
}

CodeBlock.Group = CodeBlockGroup;
CodeBlock.Code = CodeBlockCode;
CodeBlock.CopyButton = CodeBlockCopyButton;

export { CodeBlockGroup, CodeBlockCode, CodeBlockCopyButton };
