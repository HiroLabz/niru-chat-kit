"use client";

/**
 * The edit form of a tool approval in chat: one control per argument of the paused call.
 * Text, number and yes/no arguments get their own control; anything nested (a list or an
 * object) is a JSON box that must parse before Save works.
 */

import { useState } from "react";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { useChatKitStyles } from "../theme";

export type EditableAction = { name: string; args: Record<string, unknown> };

type Entry = string | boolean;

const SAVE_LABEL = "Approve with changes";
const CANCEL_LABEL = "Cancel";
const NUMBER_ERROR = "Enter a number.";
const JSON_ERROR = "Enter valid JSON.";

function kindOf(value: unknown): "string" | "number" | "boolean" | "json" {
  if (typeof value === "string") return "string";
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  return "json";
}

function startEntry(value: unknown): Entry {
  const kind = kindOf(value);
  if (kind === "boolean") return value as boolean;
  if (kind === "json") return JSON.stringify(value ?? null, null, 2);
  return String(value);
}

function readArgs(
  args: Record<string, unknown>,
  entries: Record<string, Entry>
): { args: Record<string, unknown>; errors: Record<string, string> } {
  const next: Record<string, unknown> = {};
  const errors: Record<string, string> = {};
  for (const [key, original] of Object.entries(args)) {
    const entry = entries[key];
    const kind = kindOf(original);
    if (kind === "boolean") next[key] = entry === true;
    else if (kind === "string") next[key] = String(entry);
    else if (kind === "number") {
      const text = String(entry).trim();
      const parsed = Number(text);
      if (text === "" || Number.isNaN(parsed)) errors[key] = NUMBER_ERROR;
      else next[key] = parsed;
    } else {
      try {
        next[key] = JSON.parse(String(entry));
      } catch {
        errors[key] = JSON_ERROR;
      }
    }
  }
  return { args: next, errors };
}

export function InterruptEditForm({
  action,
  disabled,
  onSave,
  onCancel,
}: {
  action: EditableAction;
  disabled?: boolean;
  onSave: (action: EditableAction) => void;
  onCancel: () => void;
}) {
  const [entries, setEntries] = useState<Record<string, Entry>>(() =>
    Object.fromEntries(Object.entries(action.args).map(([k, v]) => [k, startEntry(v)]))
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { scheme } = useChatKitStyles();

  // Not a <form>: it renders inside the prompt's own form, and forms cannot nest.
  function submit() {
    const read = readArgs(action.args, entries);
    setErrors(read.errors);
    if (Object.keys(read.errors).length === 0) onSave({ name: action.name, args: read.args });
  }

  return (
    <Stack spacing={1.5}>
      {Object.entries(action.args).map(([key, original]) => {
        const kind = kindOf(original);
        const entry = entries[key];
        const set = (value: Entry) => setEntries((prev) => ({ ...prev, [key]: value }));
        if (kind === "boolean") {
          return (
            <FormControlLabel
              key={key}
              label={key}
              control={
                <Checkbox
                  checked={entry === true}
                  disabled={disabled}
                  onChange={(event) => set(event.target.checked)}
                />
              }
            />
          );
        }
        return (
          <TextField
            key={key}
            size="small"
            fullWidth
            label={key}
            type={kind === "number" ? "number" : "text"}
            multiline={kind === "json"}
            minRows={kind === "json" ? 3 : undefined}
            value={typeof entry === "string" ? entry : ""}
            disabled={disabled}
            error={Boolean(errors[key])}
            helperText={errors[key]}
            onChange={(event) => set(event.target.value)}
          />
        );
      })}
      <Stack direction="row" spacing={1}>
        <Button
          type="button"
          variant="contained"
          size="small"
          disabled={disabled}
          onClick={submit}
          sx={scheme((c) => ({ bgcolor: c.accent, color: c.accentContrast, "&:hover": { bgcolor: c.accent } }))}
        >
          {SAVE_LABEL}
        </Button>
        <Button
          type="button"
          size="small"
          disabled={disabled}
          onClick={onCancel}
          sx={scheme((c) => ({ color: c.accent }))}
        >
          {CANCEL_LABEL}
        </Button>
      </Stack>
    </Stack>
  );
}
