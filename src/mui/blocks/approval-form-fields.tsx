"use client";

import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import {
  BOOLEAN_FALSE,
  BOOLEAN_TRUE,
  fieldLabel,
  humanizeKey,
  type ApprovalField,
} from "../../core/approval";

const BOOLEAN_OPTIONS = [
  { value: BOOLEAN_TRUE, label: "Yes" },
  { value: BOOLEAN_FALSE, label: "No" },
];

const NUMERIC_TYPES = new Set<ApprovalField["type"]>(["number", "integer"]);

/**
 * The controls an approver fills in for one authored resume form.
 *
 * Shared by the chat interrupt prompt and the hosted approval page so the two
 * surfaces can never render the same pause differently — the form schema is
 * snapshotted on the pause, and this is the one place it becomes UI.
 */
export function ApprovalFormFields({
  fields,
  values,
  errors,
  disabled,
  onChange,
}: {
  fields: ApprovalField[];
  values: Record<string, string>;
  errors: Record<string, string>;
  disabled?: boolean;
  onChange: (name: string, value: string) => void;
}) {
  return (
    <Stack spacing={1.5}>
      {fields.map((field) => {
        const options =
          field.type === "boolean"
            ? BOOLEAN_OPTIONS
            : field.type === "enum"
              ? field.enum_values.map((value) => ({ value, label: humanizeKey(value) }))
              : null;
        return (
          <TextField
            key={field.name}
            select={options !== null}
            type={NUMERIC_TYPES.has(field.type) ? "number" : "text"}
            size="small"
            fullWidth
            required={field.required}
            disabled={disabled}
            label={fieldLabel(field)}
            value={values[field.name] ?? ""}
            error={Boolean(errors[field.name])}
            helperText={errors[field.name] ?? " "}
            onChange={(event) => onChange(field.name, event.target.value)}
          >
            {options?.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
        );
      })}
    </Stack>
  );
}
