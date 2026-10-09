"use client";

import { useState, type ReactElement } from "react";
import Button from "@mui/material/Button";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import type { SxProps, Theme } from "@mui/material/styles";
import {
  parseApprovalValues,
  type ApprovalInterrupt,
} from "../../core/approval";
import { APPROVE_ANSWER, DENY_ANSWER, EDIT_ANSWER } from "../../core/approval-answers";
import { ToolArgsList } from "../primitives/tool-args";
import { useChatKitStyles } from "../theme";
import { ApprovalFormFields } from "./approval-form-fields";
import { InterruptEditForm } from "./interrupt-edit-form";

const APPROVE_LABEL = "Approve";
const DENY_LABEL = "Deny";
const SHARE_LABEL = "Share approval link";
const EDIT_LABEL = "Edit";
const BATCH_NOTE =
  "Several actions are waiting. Approve or Deny applies to all of them. Edit is only offered for a single action.";

/**
 * The approval branch of an interrupt: the waiting calls, the authored resume form (if
 * any), and the Approve / Edit / Deny decision.
 *
 * `inkSx` is the paused surface's ink, handed down so the batch note reads on the same
 * panel as the heading and question the prompt paints.
 */
export function ApprovalCard({
  interrupt,
  onAnswer,
  pending,
  inkSx,
  disabledAnswers,
}: {
  interrupt: ApprovalInterrupt;
  onAnswer: (answer: string, values?: Record<string, unknown>) => void;
  pending?: boolean;
  inkSx?: SxProps<Theme>;
  /** Answers this viewer may not give right now, each with the reason shown as a tooltip
   *  (for example Approve when the same person has already approved). Keyed by
   *  `APPROVE_ANSWER`, `EDIT_ANSWER` or `DENY_ANSWER`. */
  disabledAnswers?: Partial<Record<string, string>>;
}) {
  const { scheme } = useChatKitStyles();
  const fields = interrupt.fields ?? [];
  const actions = interrupt.actions ?? [];
  const [entries, setEntries] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState(false);
  const editable = interrupt.can_edit === true && actions.length === 1 ? actions[0] : null;

  function decide(decision: string) {
    if (decision === DENY_ANSWER || fields.length === 0) {
      onAnswer(decision);
      return;
    }
    const parsed = parseApprovalValues(fields, entries);
    setErrors(parsed.errors);
    if (Object.keys(parsed.errors).length === 0) onAnswer(decision, parsed.values);
  }

  // A disabled button fires no pointer events, so the tooltip sits on a wrapping span.
  function gated(answer: string, button: ReactElement) {
    const reason = disabledAnswers?.[answer];
    return reason ? (
      <Tooltip title={reason}>
        <span>{button}</span>
      </Tooltip>
    ) : (
      button
    );
  }
  const off = (answer: string) => Boolean(disabledAnswers?.[answer]);

  return (
    <Stack spacing={1}>
      <ToolArgsList actions={actions} />
      {fields.length > 0 ? (
        <ApprovalFormFields
          fields={fields}
          values={entries}
          errors={errors}
          disabled={pending}
          onChange={(name, value) => setEntries((prev) => ({ ...prev, [name]: value }))}
        />
      ) : null}
      {actions.length > 1 ? (
        <Typography variant="caption" sx={inkSx}>
          {BATCH_NOTE}
        </Typography>
      ) : null}
      {editing && editable ? (
        <InterruptEditForm
          action={editable}
          disabled={pending}
          onCancel={() => setEditing(false)}
          onSave={(edited) => onAnswer(EDIT_ANSWER, { edited_action: edited })}
        />
      ) : (
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          {gated(
            APPROVE_ANSWER,
            <Button
              type="button"
              variant="contained"
              loading={pending}
              disabled={pending || off(APPROVE_ANSWER)}
              onClick={() => decide(APPROVE_ANSWER)}
              sx={scheme((c) => ({ bgcolor: c.accent, color: c.accentContrast, "&:hover": { bgcolor: c.accent } }))}
            >
              {APPROVE_LABEL}
            </Button>
          )}
          {editable
            ? gated(
                EDIT_ANSWER,
                <Button
                  type="button"
                  variant="outlined"
                  loading={pending}
                  disabled={pending || off(EDIT_ANSWER)}
                  onClick={() => setEditing(true)}
                  sx={scheme((c) => ({ borderColor: c.accent, color: c.accent }))}
                >
                  {EDIT_LABEL}
                </Button>
              )
            : null}
          {gated(
            DENY_ANSWER,
            <Button
              type="button"
              variant="outlined"
              loading={pending}
              disabled={pending || off(DENY_ANSWER)}
              onClick={() => decide(DENY_ANSWER)}
              sx={scheme((c) => ({ borderColor: c.warning, color: c.warning }))}
            >
              {DENY_LABEL}
            </Button>
          )}
          {interrupt.approval_url ? (
            <Link
              href={interrupt.approval_url}
              variant="body2"
              target="_blank"
              rel="noopener"
              sx={scheme((c) => ({ color: c.accent }))}
            >
              {SHARE_LABEL}
            </Link>
          ) : null}
        </Stack>
      )}
    </Stack>
  );
}
