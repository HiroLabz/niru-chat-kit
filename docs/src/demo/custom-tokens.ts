import type { ChatKitTokenOverrides } from "@hiro/niru-chat-kit";

/** The "Custom colours" look: a green accent, rounder corners and a serif face. */
export const CUSTOM_TOKENS: ChatKitTokenOverrides = {
  accent: "#0e7c66",
  radius: 16,
  bubbleRadius: 22,
  fontFamily: 'Georgia, "Times New Roman", serif',
  light: { surface: "#fbfaf6", userBubble: "#d8f0e8", assistantSurface: "#f1eee5" },
  dark: { accent: "#4fd1b0", surface: "#14201c", userBubble: "#1d3a32", assistantSurface: "#1c2b26" },
};
