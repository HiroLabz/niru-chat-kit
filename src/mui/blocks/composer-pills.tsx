"use client";

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import { useId } from "react";
import type { StackProps } from "@mui/material/Stack";
import { useChatKitStyles } from "../theme";
import { PromptSuggestion } from "../primitives/prompt-suggestion";

export const FOLLOW_UPS_LABEL = "Suggested follow-ups";

/**
 * How a row of suggestion pills behaves: wrapped onto several lines from the `sm` breakpoint up; on a
 * narrower screen one line that scrolls sideways inside its own box, with snapping, so a dozen pills
 * do not push the chat off the screen. Shared by the pills above the composer and the empty state.
 */
export const pillRowSx = {
  minWidth: 0,
  maxWidth: "100%",
  flexWrap: { xs: "nowrap", sm: "wrap" },
  overflowX: { xs: "auto", sm: "visible" },
  scrollSnapType: { xs: "x proximity", sm: "none" },
  scrollbarWidth: "none",
  "&::-webkit-scrollbar": { display: "none" },
  "& > *": { flexShrink: 0, scrollSnapAlign: "start" },
} as const;

/**
 * A wrapping row of rounded suggestion pills that sits directly above the message box.
 * Picking one hands its text to `onSelect`; the host decides what that does. Renders
 * nothing for an empty list.
 */
export function SuggestionPills({
  suggestions,
  onSelect,
  label = "Suggestions",
  disabled = false,
  disabledReason,
  sx,
  className,
}: {
  suggestions: string[];
  onSelect: (text: string) => void;
  /** Accessible name of the group. */
  label?: string;
  /** Turns every pill off: each is a disabled button and `onSelect` is never called. Default false. */
  disabled?: boolean;
  /** Why the pills are off, for example "Wait for the answer first". With `disabled`, screen readers
   *  read it as the group's description. Ignored when `disabled` is false. */
  disabledReason?: string;
  sx?: StackProps["sx"];
  className?: string;
}) {
  const { scheme } = useChatKitStyles();
  const reasonId = useId();
  if (suggestions.length === 0) return null;
  const reason = disabled && disabledReason ? disabledReason : undefined;
  return (
    <Stack
      direction="row"
      role="group"
      aria-label={label}
      aria-describedby={reason ? reasonId : undefined}
      className={className}
      sx={[{ ...pillRowSx, gap: 0.75, mb: 1 }, ...(Array.isArray(sx) ? sx : sx ? [sx] : [])]}
    >
      {reason && (
        <Box
          id={reasonId}
          component="span"
          sx={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap" }}
        >
          {reason}
        </Box>
      )}
      {suggestions.map((text) => (
        <PromptSuggestion
          key={text}
          variant="pill"
          onSelect={onSelect}
          disabled={disabled}
          sx={scheme((c) => ({ "&.Mui-disabled": { opacity: 0.4, color: c.mutedText, borderColor: c.mutedText } }))}
          // A real <button> so the disabled attribute is set, not only aria-disabled.
          slotProps={disabled ? { chip: { component: "button" } } : undefined}
        >
          {text}
        </PromptSuggestion>
      ))}
    </Stack>
  );
}

/**
 * The pills above the message box. After a reply that came with AI follow-ups they are
 * those follow-ups, and picking one sends it; otherwise, before the first message, they are
 * the agent's starter prompts, and picking one fills the box. Visibility (agent chosen,
 * draft empty, nothing running or awaiting input) is the host's call.
 */
export function ComposerPills({
  followUps,
  starters,
  hasMessages,
  onSend,
  onFill,
}: {
  followUps: string[];
  starters: string[];
  hasMessages: boolean;
  onSend: (text: string) => void;
  onFill: (text: string) => void;
}) {
  if (followUps.length > 0) {
    return <SuggestionPills suggestions={followUps} onSelect={onSend} label={FOLLOW_UPS_LABEL} />;
  }
  return hasMessages ? null : <SuggestionPills suggestions={starters} onSelect={onFill} />;
}
