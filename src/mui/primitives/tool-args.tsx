"use client";

/**
 * The arguments of a tool call, as a readable list: one
 * `key: value` row per argument. Nested values (lists, objects) show as formatted JSON, and
 * arguments with no value (null, empty text, empty list or object) are left out.
 */

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useChatKitTokens } from "../theme";

export type ToolActionArgs = { name: string; args: Record<string, unknown> };

export type ToolArgEntry = { key: string; value: string; block: boolean };

const JSON_INDENT = 2;

function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.keys(value as object).length === 0;
  return false;
}

/** The rows worth showing for one call's arguments, in the order the call gave them. */
export function toolArgEntries(args: Record<string, unknown> | null | undefined): ToolArgEntry[] {
  return Object.entries(args ?? {})
    .filter(([, value]) => !isEmpty(value))
    .map(([key, value]) =>
      typeof value === "object"
        ? { key, value: JSON.stringify(value, null, JSON_INDENT), block: true }
        : { key, value: String(value), block: false }
    );
}

export function ToolArgsList({ actions }: { actions: ToolActionArgs[] }) {
  const { monoFontFamily } = useChatKitTokens();
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
                {entry.key}:
              </Box>{" "}
              {entry.block ? (
                <Box
                  component="pre"
                  sx={{ m: 0, fontFamily: monoFontFamily, fontSize: "0.8125rem", whiteSpace: "pre-wrap" }}
                >
                  {entry.value}
                </Box>
              ) : (
                entry.value
              )}
            </Typography>
          ))}
        </Stack>
      ))}
    </Stack>
  );
}
