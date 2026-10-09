"use client";

/**
 * Renders one assistant turn's working-process steps inside `Reasoning`.
 *
 * The closed-state trigger summarises total thought time and which tools ran —
 * "Thought for 1s / Prepared the response" repeated across every step told the
 * reader nothing, so the generic label never reaches the trigger or the list on
 * its own; its time still counts toward the total. The expanded list keeps only
 * what is worth reading: every tool step, and the thought steps whose label said
 * something besides the generic fallback. A turn whose steps are all generic
 * needs nothing more than the trigger text — it renders as plain, unclickable
 * text, so nothing opens onto an empty panel.
 */

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { GENERIC_THOUGHT_TITLE, REASONING_TRIGGER_COPY } from "../../core/stream/turn-copy";
import { isInternalStep } from "../../core/stream/turn-parts";
import {
  formatStepDuration,
  humanizeToolName,
  stepTitle,
  type WorkingStep,
} from "../../core/working-process";
import { useChatKitStyles } from "../theme";
import { ChainOfThought } from "../primitives/chain-of-thought";
import { Reasoning, useReasoning } from "../primitives/reasoning";
import { Steps } from "../primitives/steps";
import { Tool } from "../primitives/tool";

function isToolStep(step: WorkingStep): boolean {
  return step.kind !== "thought" && !isInternalStep(step);
}

function isMeaningfulThought(step: WorkingStep): boolean {
  return stepTitle(step) !== GENERIC_THOUGHT_TITLE;
}

export type TurnStepsSummary = {
  /** Closed-state trigger text: total thought time, plus tools used. */
  label: string;
  /** False when every step is a generic thought: the trigger is plain text, not a disclosure. */
  expandable: boolean;
  /** In arrival order: every tool step, and every thought step worth reading. */
  meaningfulSteps: WorkingStep[];
};

/**
 * Pure so the trigger text and the filtering it drives are each computed in one
 * place: the trigger must never claim tools ran or time passed that the
 * expanded list (or its absence) disagrees with.
 */
export function summarizeTurnSteps(steps: WorkingStep[]): TurnStepsSummary {
  const thoughtSteps = steps.filter((step) => step.kind === "thought");
  const totalSeconds =
    thoughtSteps.length === 0
      ? 0
      : Math.max(
          1,
          Math.round(thoughtSteps.reduce((sum, step) => sum + (step.durationMs ?? 0), 0) / 1000)
        );
  const toolNames = steps.filter(isToolStep).map((step) => humanizeToolName(step.name));
  const meaningfulSteps = steps.filter(
    (step) => !isInternalStep(step) && (isToolStep(step) || isMeaningfulThought(step))
  );

  return {
    label: REASONING_TRIGGER_COPY.summary(totalSeconds, toolNames),
    expandable: meaningfulSteps.length > 0,
    meaningfulSteps,
  };
}

type StepGroup = { kind: "tool"; step: WorkingStep } | { kind: "thought"; steps: WorkingStep[] };

/** Runs of consecutive thought steps collapse into one `ChainOfThought`; every tool
 *  step stays its own `ToolCard`. Order is preserved from the filtered list (arrival order). */
function groupSteps(steps: WorkingStep[]): StepGroup[] {
  const groups: StepGroup[] = [];
  for (const step of steps) {
    const last = groups[groups.length - 1];
    if (step.kind === "thought") {
      if (last?.kind === "thought") last.steps.push(step);
      else groups.push({ kind: "thought", steps: [step] });
    } else {
      groups.push({ kind: "tool", step });
    }
  }
  return groups;
}

/**
 * The expanded panel's contents: thought steps as a `ChainOfThought`, tool steps
 * as a `ToolCard`, connected by `Steps.Bar`s between groups (none after the
 * last). Every card opens by default — `Reasoning`'s own trigger is already
 * this turn's one disclosure control.
 */
function TurnStepsList({ steps }: { steps: WorkingStep[] }) {
  const { scheme } = useChatKitStyles();
  const groups = groupSteps(steps);
  return (
    <Steps>
      <Steps.Content>
        {groups.map((group, index) => {
          const key = group.kind === "tool" ? group.step.id : group.steps[0].id;
          const isLastGroup = index === groups.length - 1;
          return (
            <Box key={key}>
              <Steps.Item sx={{ width: "100%" }}>
                {group.kind === "tool" ? (
                  <Tool step={group.step} defaultOpen sx={{ width: "100%" }} />
                ) : (
                  <ChainOfThought sx={{ width: "100%" }}>
                    {group.steps.map((thought, thoughtIndex) => (
                      <ChainOfThought.Step
                        key={thought.id}
                        id={thought.id}
                        isLast={thoughtIndex === group.steps.length - 1}
                      >
                        <ChainOfThought.Trigger>
                          <Typography sx={scheme((c) => ({ fontSize: 14, color: c.mutedText }))}>
                            Thought for {formatStepDuration(thought.durationMs)}
                          </Typography>
                        </ChainOfThought.Trigger>
                        <ChainOfThought.Content>
                          <ChainOfThought.Item>
                            <Typography sx={{ fontSize: 13 }}>{stepTitle(thought)}</Typography>
                          </ChainOfThought.Item>
                        </ChainOfThought.Content>
                      </ChainOfThought.Step>
                    ))}
                  </ChainOfThought>
                )}
              </Steps.Item>
              {isLastGroup ? null : <Steps.Bar />}
            </Box>
          );
        })}
      </Steps.Content>
    </Steps>
  );
}

/**
 * The always-visible disclosure trigger: a plain label when there is nothing to
 * expand into, otherwise `Reasoning.Trigger` so a settled turn's steps stay
 * reachable after `Reasoning` auto-collapses them.
 */
function TurnStepsTrigger({ label, expandable }: { label: string; expandable: boolean }) {
  const { scheme } = useChatKitStyles();
  const { open } = useReasoning();
  if (!expandable) {
    return <Typography sx={scheme((c) => ({ fontSize: 12, color: c.mutedText }))}>{label}</Typography>;
  }
  return (
    <Reasoning.Trigger>
      <Typography sx={scheme((c) => ({ fontSize: 12, color: c.mutedText }))}>
        {open ? REASONING_TRIGGER_COPY.hide : label}
      </Typography>
    </Reasoning.Trigger>
  );
}

/**
 * One turn's steps, wrapped in `Reasoning` so a pending turn opens automatically
 * while it streams. Renders no `Reasoning.Content` at all when nothing
 * meaningful remains — there is no empty panel to open onto.
 */
export function TurnSteps({ steps, pending }: { steps: WorkingStep[]; pending: boolean }) {
  const { label, expandable, meaningfulSteps } = summarizeTurnSteps(steps);
  return (
    <Reasoning isStreaming={pending}>
      <TurnStepsTrigger label={label} expandable={expandable} />
      {expandable ? (
        <Reasoning.Content>
          <TurnStepsList steps={meaningfulSteps} />
        </Reasoning.Content>
      ) : null}
    </Reasoning>
  );
}
