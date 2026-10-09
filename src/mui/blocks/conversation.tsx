"use client";

import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import type { HTMLAttributes } from "react";
import { newestAssistantId } from "../../core/live-turn";
import type { ChatMessage, ChatTurnActions } from "../../core/types";
import { ChatContainer } from "../primitives/chat-container";
import { Message } from "../primitives/message";
import { ThinkingBar } from "../primitives/thinking-bar";
import { useChatKitStyles } from "../theme";
import { ConversationTurn, TypingDots } from "./conversation-turn";
import type { DataAttributes } from "./data-attributes";
import type { FileDownloader } from "./file-chip";

export type ConversationProps = {
  messages: ChatMessage[];
  /** Draws a turn yourself; return a falsy value to fall back to the kit's turn. */
  renderMessage?: (message: ChatMessage) => ReactNode;
  /** Swaps the default zero-message prompt. */
  emptyState?: ReactNode;
  agentInitial?: string;
  /** Appends an assistant typing row while a reply is being connected. */
  typing?: boolean;
  /**
   * Drawn on every assistant turn that `liveAvatar` does not claim: an app passes its
   * still face here so a settled turn never falls back to a bare initial.
   */
  agentAvatar?: ReactNode;
  /**
   * The avatar of the newest assistant turn while a reply is in flight, and of the typing
   * row, for an app whose avatar animates. Exactly one face should animate at a time, so a
   * settled transcript passes nothing.
   */
  liveAvatar?: ReactNode;
  /** Regenerate, copy, rate, edit and branch controls for the turns the server knows by id. */
  turnActions?: ChatTurnActions | null;
  /** Cancels the in-flight run; given, the typing row and a textless pending turn show a Stop button. */
  onStop?: () => void;
  renderExtras?: (message: ChatMessage) => ReactNode;
  /** Drawn inside the transcript after the last turn and the typing row (an open card, a notice), so it scrolls and follows with the conversation. */
  footer?: ReactNode;
  onDownloadFile?: FileDownloader;
  /** Extra attributes for the transcript element, for example an analytics mask. */
  rootProps?: Omit<HTMLAttributes<HTMLDivElement>, "className" | "children" | "role"> & DataAttributes;
};

/**
 * The per-turn view of a chat: a scrollable, auto-following `role="log"` transcript of
 * `ConversationTurn`s. `emptyState` swaps the zero-message prompt and `typing` appends an
 * assistant typing row while a reply is being connected.
 */
export function Conversation({
  messages,
  renderMessage,
  emptyState,
  agentInitial,
  typing,
  agentAvatar,
  liveAvatar,
  turnActions,
  onStop,
  renderExtras,
  footer,
  onDownloadFile,
  rootProps,
}: ConversationProps) {
  const { scheme } = useChatKitStyles();
  // While the typing row is up it owns the live face, so the turn above it stays flat
  // rather than running a second simulation.
  const liveId = liveAvatar && !typing ? newestAssistantId(messages) : null;
  // The newest pending assistant turn has no typing row to hand `onStop` to when the
  // stream writes the assistant's own turn into `messages`: forwarding it to that one turn
  // only keeps a settled turn's props (and so its memoisation) untouched.
  const newest = messages[messages.length - 1];
  const pendingId = newest && newest.role === "assistant" && newest.pending ? newest.id : null;
  // Sending re-arms following: scrolling up to re-read turns following off, and without this
  // the reply to your next message would render entirely below the fold.
  const rearmKey = newest?.role === "user" ? newest.id : null;

  if (messages.length === 0 && !typing && !footer) {
    return (
      emptyState ?? (
        <Box
          sx={scheme((c) => ({
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: c.mutedText,
            fontSize: 14,
          }))}
        >
          Say hello to start the conversation.
        </Box>
      )
    );
  }

  return (
    <ChatContainer.Root rearmKey={rearmKey} sx={{ gap: 1.5, p: 2 }} {...rootProps}>
      {messages.map((message) => {
        const custom = renderMessage?.(message);
        if (custom) {
          return (
            <Box key={message.id} data-role={message.role} sx={{ display: "flex", justifyContent: "flex-start" }}>
              {custom}
            </Box>
          );
        }
        return (
          <Box key={message.id} data-role={message.role}>
            <ConversationTurn
              message={message}
              agentInitial={agentInitial}
              actions={turnActions}
              onStop={message.id === pendingId ? onStop : undefined}
              renderExtras={renderExtras}
              onDownloadFile={onDownloadFile}
              avatar={liveAvatar && message.id === liveId ? liveAvatar : agentAvatar}
            />
          </Box>
        );
      })}
      {typing ? (
        <Message data-role="assistant">
          {liveAvatar ?? <Message.Avatar initial={agentInitial ?? "H"} />}
          <Message.Content from="assistant" data-chat-bubble={undefined}>
            {onStop ? <ThinkingBar onStop={onStop} /> : <TypingDots />}
          </Message.Content>
        </Message>
      ) : null}
      {footer}
    </ChatContainer.Root>
  );
}
