"use client";

/**
 * A tool call's raw input or output. Text shows as text; anything else as pretty JSON
 * coloured from the kit's tokens, in the same code surface as fenced code.
 */

import { Fragment, useMemo } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { ChatKitColorTokens } from "../../core/tokens";
import { useChatKitStyles } from "../theme";

export type ToolValueKind = "key" | "string" | "number" | "literal" | "punctuation";
export type ToolValueToken = { text: string; kind: ToolValueKind };

const JSON_INDENT = 2;
const TOKEN = /("(?:\\.|[^"\\])*")(\s*:)?|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|\b(true|false|null)\b|([{}[\],:])/g;

/** The value as display text, and whether it is JSON. Strings stay as they are. */
export function formatToolValue(value: unknown): { text: string; json: boolean } {
  if (typeof value === "string") return { text: value, json: false };
  try {
    const text = JSON.stringify(value, null, JSON_INDENT);
    if (text !== undefined) return { text, json: true };
  } catch {
    // Circular or otherwise unserialisable: fall through to plain text.
  }
  return { text: String(value), json: false };
}

/** Splits pretty JSON into coloured runs. Whitespace is kept as punctuation. */
export function tokenizeJson(text: string): ToolValueToken[] {
  const tokens: ToolValueToken[] = [];
  let last = 0;
  for (const match of text.matchAll(TOKEN)) {
    const at = match.index ?? 0;
    if (at > last) tokens.push({ text: text.slice(last, at), kind: "punctuation" });
    if (match[1] !== undefined) {
      tokens.push({ text: match[1], kind: match[2] ? "key" : "string" });
      if (match[2]) tokens.push({ text: match[2], kind: "punctuation" });
    } else if (match[3] !== undefined) tokens.push({ text: match[3], kind: "number" });
    else if (match[4] !== undefined) tokens.push({ text: match[4], kind: "literal" });
    else tokens.push({ text: match[5] ?? "", kind: "punctuation" });
    last = at + match[0].length;
  }
  if (last < text.length) tokens.push({ text: text.slice(last), kind: "punctuation" });
  return tokens;
}

const KIND_COLOR: Record<ToolValueKind, keyof ChatKitColorTokens> = {
  key: "accent",
  string: "success",
  number: "info",
  literal: "warning",
  punctuation: "mutedText",
};

export function ToolValue({ label, value }: { label: string; value: unknown }) {
  const { scheme, tokens } = useChatKitStyles();
  const formatted = useMemo(() => formatToolValue(value), [value]);
  const runs = useMemo(() => (formatted.json ? tokenizeJson(formatted.text) : []), [formatted]);
  return (
    <Box>
      <Typography variant="caption" sx={scheme((c) => ({ fontWeight: 700, color: c.mutedText }))}>
        {label}
      </Typography>
      <Box
        component="pre"
        tabIndex={0}
        aria-label={label}
        data-testid={`tool-${label.toLowerCase()}`}
        sx={scheme((c, all) => ({
          m: 0,
          mt: 0.25,
          p: 1,
          maxHeight: 240,
          overflow: "auto",
          bgcolor: c.codeSurface,
          color: c.text,
          borderRadius: `${all.radius}px`,
          fontFamily: tokens.monoFontFamily,
          fontSize: "0.8125rem",
          whiteSpace: "pre-wrap",
          overflowWrap: "anywhere",
          "&:focus-visible": { outline: 2, outlineStyle: "solid", outlineColor: c.accent },
          ...Object.fromEntries(
            (Object.keys(KIND_COLOR) as ToolValueKind[]).map((kind) => [
              `& [data-token="${kind}"]`,
              { color: c[KIND_COLOR[kind]] },
            ])
          ),
        }))}
      >
        {formatted.json
          ? runs.map((run, index) =>
              run.kind === "punctuation" && !run.text.trim() ? (
                <Fragment key={index}>{run.text}</Fragment>
              ) : (
                <span key={index} data-token={run.kind}>
                  {run.text}
                </span>
              )
            )
          : formatted.text}
      </Box>
    </Box>
  );
}
