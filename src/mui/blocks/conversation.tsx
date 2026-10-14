"use client";

import { useLayoutEffect, type ReactNode } from "react";
import Box from "@mui/material/Box";
import type { HTMLAttributes } from "react";
import { newestAssistantId } from "../../core/live-turn";
import { replyEndsWithQuestion } from "../../core/question";
import type { MediaItem } from "../../core/media";
import type { ChatMessage, ChatTurnActions, Interrupt } from "../../core/types";
import { ChatContainer } from "../primitives/chat-container";
import { Message } from "../primitives/message";
import { ThinkingBar } from "../primitives/thinking-bar";
import { useChatKitStyles } from "../theme";
import { flashOverlayStyles, scrollWithin, useFlash } from "./use-flash";
import { ConversationTurn, TypingDots } from "./conversation-turn";
import type { DataAttributes } from "./data-attributes";
import type { FileDownloader } from "./file-chip";
import type { MessageMediaProps } from "./message-media";
import { QuestionCard, type QuestionCardLabels } from "./question-card";

/** A question the agent is waiting on, drawn as a card in the thread after the last turn. */
export type ConversationQuestion = {
  interrupt: Interrupt;
  onAnswer: (answer: string) => void;
  /** Given, the card's last row moves the person to the message box. */
  onOther?: () => void;
  /** Given, the card offers "Let the agent decide", which answers with this phrase. */
  decideAnswer?: string;
  decideLabel?: string;
  pending?: boolean;
  labels?: Partial<QuestionCardLabels>;
};

/** Side padding that centres content in a column of `maxWidth` px, with a 24 px minimum gutter. */
export function columnPadding(maxWidth: number) {
  return { paddingInline: `max(24px, calc((100% - ${maxWidth}px) / 2))` };
}

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
  /**
   * Whether Stop is offered in the transcript beside "Thinking" (default `true`). An app whose composer
   * turns Send into Stop while a turn runs (`running` on `Composer`) sets it to `false`, so Stop is in one place.
   */
  stopInTranscript?: boolean;
  renderExtras?: (message: ChatMessage) => ReactNode;
  /** Blocks on the user's own turns, above the bubble; see `ConversationTurn`. */
  renderUserExtras?: (message: ChatMessage) => ReactNode;
  /** Drawn inside the transcript after the last turn and the typing row (an open card, a notice), so it scrolls and follows with the conversation. */
  footer?: ReactNode;
  onDownloadFile?: FileDownloader;
  /**
   * Images, videos and sounds under an assistant reply (a generated picture, say), drawn above the
   * sources, files and turn actions. Return undefined or an empty list for none. A reply with media
   * and no text still shows. Omitted: nothing is drawn. Keep its identity stable.
   */
  renderMedia?: (message: ChatMessage) => MediaItem[] | undefined;
  /** `onOpen`, `onDownload`, `onRetry`, `labels`, `maxColumns` and `maxHeight` for the media block. Keep its identity stable. */
  mediaProps?: Omit<MessageMediaProps, "items">;
  /**
   * Centres the turns in a column at most this many px wide (never closer than 24 px to the
   * edge) while the transcript itself, and its scrollbar, still span the full width. Omitted
   * keeps the turns edge to edge.
   */
  columnMaxWidth?: number;
  /**
   * The id of a message to bring into view: the transcript scrolls to it (inside its own
   * scroll area, never the page) and the turn is tinted with the accent for about 2.5
   * seconds, or outlined without a fade when the person prefers reduced motion. It runs
   * again whenever the value changes; set it to undefined to clear it. Turns carry
   * `data-message-id` (the message's `id`; a message's `serverId` also matches).
   */
  highlightMessageId?: string;
  /**
   * A question the agent is waiting on. It is drawn as a `QuestionCard` after the last turn
   * (and the typing row), inside the transcript. If the newest reply already ends with the
   * question, the card does not say it a second time. Omitted: nothing is drawn.
   */
  question?: ConversationQuestion;
  /**
   * Draws a user turn that answered a question (`message.answersQuestion`) as one folded
   * line, the question and the answer, instead of a bubble. Default: false (a bubble).
   */
  foldAnswers?: boolean;
  /** With `foldAnswers`: the folded line of the newest turn shows "Change" and calls this. Absent: no Change link. */
  onChangeAnswer?: (message: ChatMessage) => void;
  /** Extra attributes for the transcript element, for example an analytics mask. */
  rootProps?: Omit<HTMLAttributes<HTMLDivElement>, "className" | "children" | "role"> & DataAttributes;
};

/** The text of the newest assistant turn, when that turn is the last one in the thread. */
function newestReply(messages: ChatMessage[]): string | undefined {
  const last = messages[messages.length - 1];
  return last && last.role === "assistant" ? last.text : undefined;
}

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
  stopInTranscript = true,
  renderExtras,
  renderUserExtras,
  footer,
  onDownloadFile,
  renderMedia,
  mediaProps,
  columnMaxWidth,
  highlightMessageId,
  question,
  foldAnswers = false,
  onChangeAnswer,
  rootProps,
}: ConversationProps) {
  const { scheme } = useChatKitStyles();
  const highlightFound = Boolean(
    highlightMessageId && messages.some((m) => m.id === highlightMessageId || m.serverId === highlightMessageId)
  );
  const flashing = useFlash(highlightMessageId, highlightFound);
  useLayoutEffect(() => {
    if (!highlightMessageId || !highlightFound) return;
    const reveal = () => {
      const turns = document.querySelectorAll<HTMLElement>("[data-message-id]");
      const target = Array.from(turns).find(
        (node) => node.dataset.messageId === highlightMessageId || node.dataset.serverId === highlightMessageId
      );
      const log = target?.closest<HTMLElement>('[role="log"]');
      if (target && log) scrollWithin(log, target);
    };
    reveal();
    // Turns above the target (markdown, images) can still be growing; look again once they settle.
    const first = window.requestAnimationFrame(reveal);
    const second = window.setTimeout(reveal, 200);
    return () => {
      window.cancelAnimationFrame(first);
      window.clearTimeout(second);
    };
  }, [highlightMessageId, highlightFound]);
  const isFlashing = (message: ChatMessage) =>
    flashing !== null && (message.id === flashing || message.serverId === flashing);
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

  if (messages.length === 0 && !typing && !footer && !question) {
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
    <ChatContainer.Root
      rearmKey={rearmKey}
      holdKey={highlightFound ? highlightMessageId : null}
      sx={[{ gap: 1.5, p: 2 }, ...(columnMaxWidth ? [columnPadding(columnMaxWidth)] : [])]}
      {...rootProps}
    >
      {messages.map((message) => {
        const custom = renderMessage?.(message);
        if (custom) {
          return (
            <Box
              key={message.id}
              data-role={message.role}
              data-message-id={message.id}
              data-server-id={message.serverId}
              data-highlighted={isFlashing(message) ? "true" : undefined}
              sx={[{ display: "flex", justifyContent: "flex-start" }, ...(isFlashing(message) ? [scheme((c) => flashOverlayStyles(c))] : [])]}
            >
              {custom}
            </Box>
          );
        }
        const folded = foldAnswers && message.role === "user" ? message.answersQuestion : undefined;
        return (
          <Box
            key={message.id}
            data-role={message.role}
            data-message-id={message.id}
            data-server-id={message.serverId}
            data-highlighted={isFlashing(message) ? "true" : undefined}
            sx={isFlashing(message) ? scheme((c) => flashOverlayStyles(c)) : undefined}
          >
            {folded ? (
              <QuestionCard
                question={folded.question}
                answered={message.text}
                onChange={onChangeAnswer && message === newest ? () => onChangeAnswer(message) : undefined}
              />
            ) : (
            <ConversationTurn
              message={message}
              agentInitial={agentInitial}
              actions={turnActions}
              onStop={message.id === pendingId ? onStop : undefined}
              stopHidden={!stopInTranscript}
              renderExtras={renderExtras}
              renderUserExtras={renderUserExtras}
              onDownloadFile={onDownloadFile}
              renderMedia={renderMedia}
              mediaProps={mediaProps}
              avatar={liveAvatar && message.id === liveId ? liveAvatar : agentAvatar}
            />
            )}
          </Box>
        );
      })}
      {typing ? (
        <Message data-role="assistant">
          {/* `null` is a deliberate "no face": only an absent avatar falls back to the initial. */}
          {liveAvatar === undefined ? <Message.Avatar initial={agentInitial ?? "H"} /> : liveAvatar}
          <Message.Content from="assistant" data-chat-bubble={undefined}>
            {onStop ? <ThinkingBar onStop={stopInTranscript ? onStop : undefined} /> : <TypingDots />}
          </Message.Content>
        </Message>
      ) : null}
      {question ? (
        <QuestionCard
          question={question.interrupt.question}
          options={question.interrupt.options}
          onAnswer={question.onAnswer}
          onOther={question.onOther}
          decideAnswer={question.decideAnswer}
          decideLabel={question.decideLabel}
          pending={question.pending}
          labels={question.labels}
          showQuestion={!replyEndsWithQuestion(newestReply(messages), question.interrupt.question)}
        />
      ) : null}
      {footer}
    </ChatContainer.Root>
  );
}
