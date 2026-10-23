"use client";

/**
 * The activity timeline of one assistant turn that used tools: a collapsible header
 * ("Working for 12s" while pending, "Worked for 1m 56s" once settled) over the turn's
 * interim messages and one summary line per run of activity, in the order they happened.
 * The answer itself is not here — the bubble renders it below, as it always has.
 */

import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Collapse from "@mui/material/Collapse";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import BuildIcon from "@mui/icons-material/BuildOutlined";
import DescriptionIcon from "@mui/icons-material/DescriptionOutlined";
import ImageIcon from "@mui/icons-material/ImageOutlined";
import PublicIcon from "@mui/icons-material/PublicOutlined";
import TerminalIcon from "@mui/icons-material/TerminalOutlined";
import { TURN_TIMELINE_COPY } from "../../core/stream/turn-copy";
import {
  formatTurnDuration,
  isListedStep,
  summarizeTitles,
  toolKindOf,
  type ToolKind,
  type TurnPart,
} from "../../core/stream/turn-parts";
import { stepTitle, type WorkingStep } from "../../core/working-process";
import CheckIcon from "@mui/icons-material/CheckOutlined";
import { useChatKitStyles, useChatLook } from "../theme";
import { DisclosureChevron } from "../primitives/disclosure-chevron";
import { Markdown } from "../primitives/markdown";
import { Reasoning, useReasoning } from "../primitives/reasoning";
import { TextShimmer } from "../primitives/text-shimmer";
import { Tool } from "../primitives/tool";

const ICONS: Record<ToolKind, typeof BuildIcon> = {
  web: PublicIcon,
  command: TerminalIcon,
  file: DescriptionIcon,
  image: ImageIcon,
  tool: BuildIcon,
};

const FONT_SIZE = 13;

/** Seconds since `startedAt`, ticking once a second while `active`. */
function useElapsedMs(startedAt: number | undefined, active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [active]);
  return startedAt === undefined ? 0 : now - startedAt;
}

function sumThoughtAndToolMs(parts: TurnPart[]): number {
  return parts.reduce(
    (total, part) =>
      part.kind === "activity"
        ? total + part.steps.reduce((sum, step) => sum + (step.durationMs ?? 0), 0)
        : total,
    0
  );
}

function TimelineHeader({ label, running }: { label: string; running: boolean }) {
  const { scheme } = useChatKitStyles();
  const { open } = useReasoning();
  const { stepsCard } = useChatLook();
  return (
    <Reasoning.Trigger
      sx={scheme((c) => ({ alignSelf: "flex-start", gap: 0.5, borderRadius: 1, color: c.mutedText }))}
      slotProps={{ root: { "aria-expanded": open, "data-chat": "steps" } as never }}
    >
      {stepsCard ? <BuildIcon aria-hidden sx={{ fontSize: 18 }} /> : null}
      {running ? (
        <TextShimmer fontSize={FONT_SIZE + 1}>{label}</TextShimmer>
      ) : (
        <Typography sx={scheme((c) => ({ fontSize: FONT_SIZE + 1, color: c.mutedText }))}>{label}</Typography>
      )}
      <DisclosureChevron open={open} size={16} />
      {stepsCard ? (
        <Box component="span" data-chat="steps-state" sx={{ ml: "auto", display: "inline-flex", alignItems: "center", gap: 0.5 }}>
          {running ? "Working" : "Finished"}
          {running ? null : <CheckIcon aria-hidden sx={{ fontSize: 16 }} />}
        </Box>
      ) : null}
    </Reasoning.Trigger>
  );
}

function ActivityLine({ part }: { part: Extract<TurnPart, { kind: "activity" }> }) {
  const { scheme } = useChatKitStyles();
  const [open, setOpen] = useState(false);
  const tools = part.steps.filter((step) => step.kind !== "thought" && isListedStep(step));
  const thoughts = part.steps.filter((step) => step.kind === "thought" && isListedStep(step));
  if (tools.length === 0 && thoughts.length === 0) return null;
  const running = tools.some((step) => step.status === "running");
  const text = summarizeTitles(tools.map((step) => stepTitle(step)));
  const Icon = ICONS[tools.length > 0 ? toolKindOf(tools[0].name) : "tool"];
  return (
    <Stack spacing={0.5} sx={{ minWidth: 0 }}>
      {tools.length === 1 ? (
        // One call is one row: a group header over a single card would repeat its words.
        <Tool step={tools[0]} />
      ) : tools.length > 1 ? (
        <>
          <ButtonBase
            onClick={() => setOpen((value) => !value)}
            disableRipple
            aria-expanded={open}
            sx={scheme((c) => ({ alignSelf: "flex-start", gap: 0.75, textAlign: "left", color: c.mutedText }))}
          >
            <Icon aria-hidden sx={{ fontSize: 16 }} />
            {running ? (
              <TextShimmer fontSize={FONT_SIZE}>{text}</TextShimmer>
            ) : (
              <Typography sx={scheme((c) => ({ fontSize: FONT_SIZE, color: c.mutedText }))}>{text}</Typography>
            )}
            <DisclosureChevron open={open} size={14} />
          </ButtonBase>
          <Collapse in={open} unmountOnExit>
            <Stack spacing={0.75} sx={{ pl: 2.75 }}>
              {tools.map((step: WorkingStep) => (
                <Tool key={step.id} step={step} defaultOpen />
              ))}
            </Stack>
          </Collapse>
        </>
      ) : null}
      {thoughts.map((step) => (
        <Typography key={step.id} sx={scheme((c) => ({ fontSize: 12, color: c.mutedText, pl: 2.75 }))}>
          {stepTitle(step)}
        </Typography>
      ))}
    </Stack>
  );
}

/** One reasoning block: "Reasoning" trigger (shimmer while it streams), markdown body in secondary colour. */
function ReasoningBlock({ part, streaming }: { part: Extract<TurnPart, { kind: "reasoning" }>; streaming: boolean }) {
  const { scheme } = useChatKitStyles();
  return (
    <Reasoning isStreaming={streaming} sx={{ minWidth: 0 }}>
      <Stack spacing={0.5} sx={{ minWidth: 0 }}>
        <BlockTrigger streaming={streaming} />
        <Reasoning.Content>
          <Box
            data-testid={`reasoning-${part.id}`}
            sx={scheme((c) => ({ color: c.mutedText, fontSize: FONT_SIZE, minWidth: 0, pl: 2.75 }))}
          >
            <Markdown id={`${part.id}:md`}>{part.text}</Markdown>
          </Box>
        </Reasoning.Content>
      </Stack>
    </Reasoning>
  );
}

function BlockTrigger({ streaming }: { streaming: boolean }) {
  const { scheme } = useChatKitStyles();
  const { open } = useReasoning();
  return (
    <Reasoning.Trigger
      sx={scheme((c) => ({ alignSelf: "flex-start", gap: 0.75, color: c.mutedText }))}
      slotProps={{ root: { "aria-expanded": open } }}
    >
      {streaming ? (
        <TextShimmer fontSize={FONT_SIZE}>{TURN_TIMELINE_COPY.reasoning}</TextShimmer>
      ) : (
        <Typography sx={scheme((c) => ({ fontSize: FONT_SIZE, color: c.mutedText }))}>
          {TURN_TIMELINE_COPY.reasoning}
        </Typography>
      )}
      <DisclosureChevron open={open} size={14} />
    </Reasoning.Trigger>
  );
}

export function TurnTimeline({
  messageId,
  parts,
  pending,
  startedAt,
  settledAt,
  tailLive = pending,
  durationUnknown = false,
}: {
  messageId: string;
  /** The parts that belong inside the timeline: everything but the answer. */
  parts: TurnPart[];
  pending: boolean;
  startedAt?: number;
  settledAt?: number;
  /** Whether the last part is still being written (false once the answer text has begun). */
  tailLive?: boolean;
  /** A settled turn nobody timed: the header says "Worked" and names no duration. */
  durationUnknown?: boolean;
}) {
  const { scheme } = useChatKitStyles();
  const elapsed = useElapsedMs(startedAt, pending);
  const durationMs =
    pending
      ? elapsed
      : startedAt !== undefined && settledAt !== undefined
        ? settledAt - startedAt
        : sumThoughtAndToolMs(parts);
  const duration = formatTurnDuration(pending ? elapsed : Math.max(1000, durationMs));
  const label = pending
    ? TURN_TIMELINE_COPY.working(duration)
    : durationUnknown
      ? TURN_TIMELINE_COPY.workedNoDuration
      : TURN_TIMELINE_COPY.worked(duration);
  return (
    <Reasoning isStreaming={pending} sx={{ width: "100%", minWidth: 0 }}>
      <Stack spacing={0.75} sx={{ minWidth: 0 }}>
        <TimelineHeader label={label} running={pending} />
        <Reasoning.Content>
          <Stack spacing={1} sx={{ minWidth: 0, pb: 0.5 }} data-testid={`turn-timeline-${messageId}`}>
            {parts.map((part, index) =>
              part.kind === "reasoning" ? (
                <ReasoningBlock
                  key={`${part.id}:${index}`}
                  part={part}
                  streaming={pending && tailLive && index === parts.length - 1}
                />
              ) : part.kind === "text" ? (
                part.text.trim() === "" ? null : (
                  <Box key={part.id} sx={scheme((c) => ({ color: c.mutedText, fontSize: FONT_SIZE + 1, minWidth: 0 }))}>
                    <Markdown id={part.id}>{part.text}</Markdown>
                  </Box>
                )
              ) : (
                <ActivityLine key={part.id} part={part} />
              )
            )}
          </Stack>
        </Reasoning.Content>
      </Stack>
    </Reasoning>
  );
}
