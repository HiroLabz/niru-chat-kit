"use client";

import Stack from "@mui/material/Stack";
import type { StackProps } from "@mui/material/Stack";
import { PromptSuggestion } from "../primitives/prompt-suggestion";

export const FOLLOW_UPS_LABEL = "Suggested follow-ups";

/**
 * A wrapping row of rounded suggestion pills that sits directly above the message box.
 * Picking one hands its text to `onSelect`; the host decides what that does. Renders
 * nothing for an empty list.
 */
export function SuggestionPills({
  suggestions,
  onSelect,
  label = "Suggestions",
  sx,
  className,
}: {
  suggestions: string[];
  onSelect: (text: string) => void;
  /** Accessible name of the group. */
  label?: string;
  sx?: StackProps["sx"];
  className?: string;
}) {
  if (suggestions.length === 0) return null;
  return (
    <Stack
      direction="row"
      role="group"
      aria-label={label}
      className={className}
      sx={[{ flexWrap: "wrap", gap: 0.75, minWidth: 0, mb: 1 }, ...(Array.isArray(sx) ? sx : sx ? [sx] : [])]}
    >
      {suggestions.map((text) => (
        <PromptSuggestion key={text} variant="pill" onSelect={onSelect}>
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
