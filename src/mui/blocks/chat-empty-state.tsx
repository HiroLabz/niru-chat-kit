"use client";

import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { Message } from "../primitives/message";
import { PromptSuggestion } from "../primitives/prompt-suggestion";

const EMPTY_STATE_AVATAR_SIZE = 44;

/**
 * Friendly first-open state for a chat surface: agent avatar, greeting, and tappable
 * suggested-prompt chips that send the prompt on click.
 */
export function ChatEmptyState({
  greeting,
  suggestions = [],
  onSuggestion,
  agentInitial = "H",
  avatarSrc,
  avatar,
  accentColor,
  disabled,
}: {
  greeting: string;
  suggestions?: string[];
  onSuggestion?: (prompt: string) => void;
  agentInitial?: string;
  avatarSrc?: string;
  /** Replaces the initial or image avatar, for an app that draws its own face. */
  avatar?: ReactNode;
  /** Recolours the suggestion chips for one surface (a widget's brand colour). Prefer the `accent` token. */
  accentColor?: string;
  disabled?: boolean;
}) {
  return (
    <Box
      sx={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        px: 3,
        py: 4,
        textAlign: "center",
      }}
    >
      {avatar ?? <Message.Avatar initial={agentInitial} size={EMPTY_STATE_AVATAR_SIZE} src={avatarSrc} />}
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {greeting}
      </Typography>
      {suggestions.length > 0 ? (
        <Stack direction="row" sx={{ flexWrap: "wrap", justifyContent: "center", gap: 1 }}>
          {suggestions.map((prompt) => (
            <PromptSuggestion
              key={prompt}
              onSelect={(text) => onSuggestion?.(text)}
              disabled={disabled}
              sx={accentColor ? { color: accentColor, borderColor: accentColor } : undefined}
            >
              {prompt}
            </PromptSuggestion>
          ))}
        </Stack>
      ) : null}
    </Box>
  );
}
