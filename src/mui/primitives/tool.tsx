"use client";

/**
 * Expandable card for one tool call in a turn's working process. The header shows the humanised
 * tool name (no product prefix), a status chip and the measured duration. A plain `summary` of
 * what the call did ("Found 12 agents") sits under it, and the server-derived title is shown only
 * when it adds something the name does not, so the same words never appear twice. Console
 * surfaces also get a collapsed "Details" area: the call's inputs as a key: value list, a short
 * output preview and the duration. A public or share-link step has no summary or details, so
 * nothing about the call's inputs or outputs shows there.
 */

import { useState } from "react";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Chip from "@mui/material/Chip";
import Collapse from "@mui/material/Collapse";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { alpha } from "@mui/material/styles";
import type { ChipProps } from "@mui/material/Chip";
import type { StackProps } from "@mui/material/Stack";
import {
  formatStepDuration,
  humanizeToolName,
  stepTitle,
  type WorkingStep,
} from "../../core/working-process";
import type { ChatKitColorTokens } from "../../core/tokens";
import { useChatKitStyles } from "../theme";
import { sxArray } from "./sx";
import { ToolArgsList, toolArgEntries } from "./tool-args";
import { ToolValue } from "./tool-io";

type ToolCardStatus = "running" | "done" | "failed" | "paused";

const STATUS_FROM_STEP: Record<WorkingStep["status"], ToolCardStatus> = {
  running: "running",
  success: "done",
  error: "failed",
  interrupted: "paused",
};

/** The four states prompt-kit's Tool uses, accepted as aliases of the kit's own statuses. */
export type ToolState = "input-streaming" | "input-available" | "output-available" | "output-error";

const STATUS_FROM_STATE: Record<ToolState, ToolCardStatus> = {
  "input-streaming": "running",
  "input-available": "running",
  "output-available": "done",
  "output-error": "failed",
};

const STATUS_LABEL: Record<ToolCardStatus, string> = {
  running: "Running",
  done: "Done",
  failed: "Failed",
  paused: "Paused",
};

const STATUS_COLOR: Record<ToolCardStatus, "info" | "success" | "error" | "warning"> = {
  running: "info",
  done: "success",
  failed: "error",
  paused: "warning",
};

function statusChipSx(c: ChatKitColorTokens, status: ToolCardStatus) {
  const color = c[STATUS_COLOR[status]];
  return {
    color,
    borderColor: alpha(color, 0.7),
    "&:hover": { bgcolor: alpha(color, 0.04) },
  };
}

const PRODUCT_PREFIX = /^hiro[_-]/i;

export type ToolSlotProps = {
  root?: Partial<StackProps>;
  statusChip?: Partial<ChipProps>;
};

/** The tool name as words without the product prefix: `hiro_list_agents` reads "List agents". */
export function cardToolName(name: string, format: (name: string) => string = humanizeToolName): string {
  return format(name.replace(PRODUCT_PREFIX, "") || name);
}

function plain(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function Chevron({ open, size }: { open: boolean; size: number }) {
  const { scheme } = useChatKitStyles();
  return (
    <ExpandMoreIcon
      sx={scheme((c) => ({
        fontSize: size,
        color: c.mutedText,
        transition: "transform 150ms",
        transform: open ? "none" : "rotate(-90deg)",
      }))}
    />
  );
}

function StepDetailsBody({ step }: { step: WorkingStep }) {
  const { scheme, tokens } = useChatKitStyles();
  const details = step.details;
  const hasInputs = toolArgEntries(details?.inputs).length > 0;
  const muted = scheme((c) => ({ color: c.mutedText }));
  return (
    <Stack spacing={0.75} data-testid="tool-details" sx={{ pt: 0.5, minWidth: 0 }}>
      {hasInputs ? (
        <Box>
          <Typography variant="caption" sx={[{ fontWeight: 700 }, muted]}>
            Inputs
          </Typography>
          <ToolArgsList actions={[{ name: step.name, args: details?.inputs ?? {} }]} />
        </Box>
      ) : null}
      {details?.inputsText ? (
        <Box>
          <Typography variant="caption" sx={[{ fontWeight: 700 }, muted]}>
            Inputs
          </Typography>
          <Typography variant="body2" sx={{ overflowWrap: "anywhere" }}>
            {details.inputsText}
          </Typography>
        </Box>
      ) : null}
      {details?.output ? (
        <Box>
          <Typography variant="caption" sx={[{ fontWeight: 700 }, muted]}>
            Output
          </Typography>
          <Box
            component="pre"
            sx={{ m: 0, fontFamily: tokens.monoFontFamily, fontSize: "0.8125rem", whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
          >
            {details.output}
          </Box>
        </Box>
      ) : null}
      {step.durationMs != null ? (
        <Typography variant="caption" sx={muted}>
          Took {formatStepDuration(step.durationMs)}
        </Typography>
      ) : null}
    </Stack>
  );
}

export function Tool({
  step,
  defaultOpen = false,
  formatName = humanizeToolName,
  sx,
  className,
  slotProps,
  state,
  input,
  output,
}: {
  step: WorkingStep;
  /** A prompt-kit state; when given it sets the status chip in place of `step.status`. */
  state?: ToolState;
  /** The call's raw input: text shows as text, anything else as pretty JSON. Shown in the expanded card. Absent: nothing added. */
  input?: unknown;
  /** The call's raw output, shown the same way. Absent: nothing added. */
  output?: unknown;
  defaultOpen?: boolean;
  /** Words a tool name when the step carries no title; defaults to the kit's own. */
  formatName?: (name: string) => string;
  sx?: StackProps["sx"];
  className?: string;
  slotProps?: ToolSlotProps;
}) {
  const { scheme } = useChatKitStyles();
  const [open, setOpen] = useState(defaultOpen);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const status = state ? STATUS_FROM_STATE[state] : STATUS_FROM_STEP[step.status];
  const name = cardToolName(step.name, formatName);
  const title = stepTitle(step, formatName);
  const showTitle = plain(title) !== plain(name) && plain(title) !== plain(step.name);
  const trimmed = step.summary?.trim() ?? "";
  const summary = trimmed && plain(trimmed) !== plain(STATUS_LABEL[status]) ? trimmed : null;
  const details = step.details;
  const hasDetails = Boolean(
    toolArgEntries(details?.inputs).length > 0 || details?.inputsText || details?.output
  );
  const hasInput = input !== undefined && input !== null;
  const hasOutput = output !== undefined && output !== null;
  const expandable = showTitle || hasDetails || hasInput || hasOutput;
  const { sx: rootSx, ...rootRest } = slotProps?.root ?? {};

  const header = (
    <>
      {expandable ? <Chevron open={open} size={16} /> : null}
      <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{name}</Typography>
      <Chip
        size="small"
        label={STATUS_LABEL[status]}
        variant="outlined"
        sx={scheme((c) => statusChipSx(c, status))}
        {...slotProps?.statusChip}
      />
      {step.durationMs != null ? (
        <Typography sx={scheme((c) => ({ fontSize: 12, color: c.mutedText }))}>
          {formatStepDuration(step.durationMs)}
        </Typography>
      ) : null}
    </>
  );

  return (
    <Stack
      className={className}
      sx={[
        scheme((c, all) => ({
          border: "1px solid",
          borderColor: c.border,
          borderRadius: `${all.radius * 1.5}px`,
          overflow: "hidden",
        })),
        ...sxArray(sx),
        ...sxArray(rootSx),
      ]}
      {...rootRest}
    >
      {expandable ? (
        <ButtonBase
          onClick={() => setOpen((value) => !value)}
          disableRipple
          aria-expanded={open}
          sx={{ justifyContent: "flex-start", px: 1.25, py: 0.75, gap: 1 }}
        >
          {header}
        </ButtonBase>
      ) : (
        <Stack direction="row" sx={{ alignItems: "center", px: 1.25, py: 0.75, gap: 1 }}>
          {header}
        </Stack>
      )}
      {summary ? (
        <Typography
          data-testid="tool-summary"
          sx={scheme((c) => ({ fontSize: 13, color: c.mutedText, px: 1.25, pb: 0.75, pl: expandable ? 4.5 : 1.25, mt: -0.25 }))}
        >
          {summary}
        </Typography>
      ) : null}
      {expandable ? (
        <Collapse in={open} unmountOnExit>
          <Stack spacing={0.5} sx={{ px: 1.25, pb: 1, pl: 4.5 }}>
            {showTitle ? (
              <Typography sx={scheme((c) => ({ fontSize: 13, color: c.mutedText }))}>{title}</Typography>
            ) : null}
            {hasInput ? <ToolValue label="Input" value={input} /> : null}
            {hasOutput ? <ToolValue label="Output" value={output} /> : null}
            {hasDetails ? (
              <>
                <ButtonBase
                  onClick={() => setDetailsOpen((value) => !value)}
                  disableRipple
                  aria-expanded={detailsOpen}
                  sx={scheme((c) => ({ alignSelf: "flex-start", gap: 0.5, color: c.mutedText }))}
                >
                  <Chevron open={detailsOpen} size={14} />
                  <Typography sx={{ fontSize: 12, fontWeight: 600 }}>Details</Typography>
                </ButtonBase>
                <Collapse in={detailsOpen} unmountOnExit>
                  <StepDetailsBody step={step} />
                </Collapse>
              </>
            ) : null}
          </Stack>
        </Collapse>
      ) : null}
    </Stack>
  );
}

/** The name this component had before it moved into the kit. */
export const ToolCard = Tool;
