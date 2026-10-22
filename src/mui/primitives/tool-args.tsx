"use client";

/**
 * The arguments of a tool call, as a readable list: one `Label: value` row per argument.
 * A nested value (a list or an object) is written out as plain indented lines, never as
 * JSON, and a long value is folded to a few lines with a Show all button. Arguments with
 * no value (null, empty text, empty list or object) are left out.
 */

import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

export type ToolActionArgs = { name: string; args: Record<string, unknown> };

export type ToolArgEntry = { key: string; label: string; value: string; block: boolean };

const INDENT = "  ";
const FOLDED_LINES = 6;
const FOLD_OVER_CHARS = 320;
const SHOW_ALL_LABEL = "Show all";
const SHOW_LESS_LABEL = "Show less";

function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.keys(value as object).length === 0;
  return false;
}

function isScalar(value: unknown): boolean {
  return typeof value !== "object" || value === null;
}

/** `file_name` and `fileName` both read "File name". */
export function argLabel(key: string): string {
  const spaced = key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim()
    .toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function inline(value: unknown[]): string {
  return value.filter((item) => !isEmpty(item)).map(String).join(", ");
}

function linesOf(value: unknown, indent: string): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((item) => !isEmpty(item))
      .flatMap((item, index) =>
        isScalar(item)
          ? [`${indent}${index + 1}. ${String(item)}`]
          : [`${indent}${index + 1}.`, ...linesOf(item, indent + INDENT)]
      );
  }
  return Object.entries(value as Record<string, unknown>)
    .filter(([, item]) => !isEmpty(item))
    .flatMap(([key, item]) => {
      const label = argLabel(key);
      if (isScalar(item)) return [`${indent}${label}: ${String(item)}`];
      if (Array.isArray(item) && item.every(isScalar)) return [`${indent}${label}: ${inline(item)}`];
      return [`${indent}${label}:`, ...linesOf(item, indent + INDENT)];
    });
}

/** The rows worth showing for one call's arguments, in the order the call gave them. */
export function toolArgEntries(args: Record<string, unknown> | null | undefined): ToolArgEntry[] {
  return Object.entries(args ?? {})
    .filter(([, value]) => !isEmpty(value))
    .map(([key, value]) => {
      const label = argLabel(key);
      if (isScalar(value)) return { key, label, value: String(value), block: false };
      if (Array.isArray(value) && value.every(isScalar)) return { key, label, value: inline(value), block: false };
      return { key, label, value: linesOf(value, "").join("\n"), block: true };
    });
}

function ArgValue({ entry }: { entry: ToolArgEntry }) {
  const [open, setOpen] = useState(false);
  const foldable = entry.value.length > FOLD_OVER_CHARS || entry.value.split("\n").length > FOLDED_LINES;
  const folded = foldable && !open;
  const text = (
    <Box
      component={entry.block || folded ? "div" : "span"}
      sx={{
        whiteSpace: "pre-wrap",
        overflowWrap: "anywhere",
        ...(entry.block ? { mt: 0.25 } : null),
        ...(folded
          ? { display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: FOLDED_LINES, overflow: "hidden" }
          : null),
      }}
    >
      {entry.value}
    </Box>
  );
  return (
    <>
      {text}
      {foldable ? (
        <Button size="small" aria-expanded={open} onClick={() => setOpen((value) => !value)} sx={{ p: 0, minWidth: 0 }}>
          {open ? SHOW_LESS_LABEL : SHOW_ALL_LABEL}
        </Button>
      ) : null}
    </>
  );
}

export function ToolArgsList({ actions }: { actions: ToolActionArgs[] }) {
  const shown = actions
    .map((action) => ({ name: action.name, entries: toolArgEntries(action.args) }))
    .filter((action) => action.entries.length > 0);
  if (shown.length === 0) return null;
  return (
    <Stack spacing={1} aria-label="Action details">
      {shown.map((action, index) => (
        <Stack key={`${action.name}-${index}`} spacing={0.25}>
          {actions.length > 1 ? (
            <Typography variant="caption" sx={{ fontWeight: 700 }}>
              {action.name}
            </Typography>
          ) : null}
          {action.entries.map((entry) => (
            <Typography key={entry.key} variant="body2" component="div" sx={{ overflowWrap: "anywhere" }}>
              <Box component="span" sx={{ fontWeight: 600 }}>
                {entry.label}:
              </Box>{" "}
              <ArgValue entry={entry} />
            </Typography>
          ))}
        </Stack>
      ))}
    </Stack>
  );
}
