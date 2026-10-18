"use client";

import { memo, useState, type ReactNode } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import MicNoneOutlinedIcon from "@mui/icons-material/MicNoneOutlined";
import { filesOfTurn } from "../../core/generated-file";
import { isStructuredEcho } from "../../core/structured-echo";
import { hasVisibleActivity, isInternalStep, splitTurnParts } from "../../core/stream/turn-parts";
import type { MediaItem } from "../../core/media";
import type { ChatMessage, ChatTurnActions } from "../../core/types";
import { Loader } from "../primitives/loader";
import { Markdown } from "../primitives/markdown";
import { Message } from "../primitives/message";
import { ThinkingBar } from "../primitives/thinking-bar";
import { useChatKitStyles } from "../theme";
import { FileChipList, type FileDownloader } from "./file-chip";
import { MessageMedia, type MessageMediaProps } from "./message-media";
import { MessageEditForm } from "./message-edit-form";
import { MessageNotes } from "./message-notes";
import { SourceList } from "./source-list";
import { TurnActions } from "./turn-actions";
import { TurnSteps } from "./turn-steps";
import { TurnTimeline } from "./turn-timeline";

const SPOKEN_LABEL = "Spoken";

/** Thin wrapper over `Loader`'s "typing" variant, for callers that want the dots alone. */
export function TypingDots() {
  return <Loader variant="typing" />;
}

/** A small microphone that marks a message said or answered aloud; named for a screen reader. */
function SpokenMark() {
  const { scheme } = useChatKitStyles();
  return (
    <Box
      component="span"
      role="img"
      aria-label={SPOKEN_LABEL}
      sx={scheme((c) => ({ alignSelf: "flex-start", mt: 1, flexShrink: 0, display: "flex", color: c.mutedText }))}
    >
      <MicNoneOutlinedIcon fontSize="small" aria-hidden />
    </Box>
  );
}

function formatTimestamp(at: number) {
  return new Date(at).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

export type ConversationTurnProps = {
  message: ChatMessage;
  agentInitial?: string;
  /** Regenerate, copy, rate, edit and branch controls; each shows when its handler is supplied. */
  actions?: ChatTurnActions | null;
  /**
   * Replaces this turn's avatar; `null` drops it. A turn whose owner already draws one
   * avatar for the whole turn passes `null` so the same face is not rendered twice.
   */
  avatar?: ReactNode | null;
  /**
   * The person's own face, drawn at the end of their turn (the mirror of the assistant's avatar,
   * at the same size and alignment). Omitted or `null`: a user turn has no avatar. Keep its
   * identity stable: the turn is memoised.
   */
  userAvatar?: ReactNode | null;
  /**
   * Cancels the in-flight run. Given for a pending assistant turn with no text yet, the
   * typing dots become a `ThinkingBar` with a Stop button; omitted keeps the plain loader.
   */
  onStop?: () => void;
  /** The turn shows "Thinking" without its Stop link (Stop lives in the composer). */
  stopHidden?: boolean;
  /** An app's own blocks under the answer (a structured-output card, for example). Keep its identity stable: the turn is memoised. */
  renderExtras?: (message: ChatMessage) => ReactNode;
  /** An app's own blocks on the user's turn, drawn above the bubble (the files it sent). Keep its identity stable. */
  renderUserExtras?: (message: ChatMessage) => ReactNode;
  /** Fetches a generated file; without it file chips show no Download button. */
  onDownloadFile?: FileDownloader;
  /**
   * Images, videos and sounds to draw under an assistant reply, above the sources, files and turn
   * actions. Return undefined or an empty list for none. Keep its identity stable: the turn is memoised.
   * A reply with media and no text still shows.
   */
  renderMedia?: (message: ChatMessage) => MediaItem[] | undefined;
  /** `onOpen`, `onDownload`, `onRetry`, `labels`, `maxColumns` and `maxHeight` for the media block. Keep its identity stable. */
  mediaProps?: Omit<MessageMediaProps, "items">;
};

/**
 * Single chat turn: user turns right-aligned in the user bubble, assistant turns
 * left-aligned with an avatar. A turn that streamed activity shows its timeline above the
 * answer; the answer is Markdown, then the app's extras, sources, generated files, notes,
 * timestamp and the turn actions. User text keeps its whitespace.
 *
 * Memoised deliberately, and it must stay that way: streaming calls `setMessages` once per
 * token, so an unmemoised turn re-parses the markdown of every message in the thread on
 * every token (967ms against 75ms for a 10-message thread over 200 ticks). The stream
 * preserves the object identity of untouched messages, so the default shallow compare works.
 */
export const ConversationTurn = memo(function ConversationTurn({
  message,
  agentInitial = "H",
  avatar,
  userAvatar,
  actions,
  onStop,
  stopHidden,
  renderExtras,
  renderUserExtras,
  onDownloadFile,
  renderMedia,
  mediaProps,
}: ConversationTurnProps) {
  const { scheme } = useChatKitStyles();
  const [editing, setEditing] = useState(false);
  const isUser = message.role === "user";
  const serverId = message.serverId;
  const media = isUser ? undefined : renderMedia?.(message);
  const hasMedia = Boolean(media?.length);
  const isEditing = editing && isUser && Boolean(actions) && Boolean(serverId);
  // A turn that streamed activity renders as a timeline plus its answer; any other turn,
  // and history (no `parts`), renders as plain text.
  const timelineParts = !isUser && hasVisibleActivity(message.parts) ? message.parts : undefined;
  const split = timelineParts ? splitTurnParts(timelineParts, Boolean(message.pending)) : null;
  const hasTextPart = Boolean(timelineParts?.some((part) => part.kind === "text"));
  const answerText = split ? (split.answer ?? (hasTextPart ? "" : message.text)) : message.text;
  const showDots = Boolean(message.pending) && answerText.length === 0;
  const hasListedSteps = Boolean(message.steps?.some((step) => !isInternalStep(step)));
  // A run that failed before any text arrived settles as an assistant row with nothing in
  // it: no pill, avatar or timestamp for that, the error banner carries the news.
  const settledEmpty = !isUser && !message.pending && answerText.trim() === "";
  const hasNothingToShow =
    settledEmpty &&
    !timelineParts &&
    !hasListedSteps &&
    !message.output &&
    !hasMedia &&
    (!message.shapingStatus || message.shapingStatus === "none") &&
    !message.citations?.length &&
    message.status !== "stopped" &&
    message.citationCheck?.grounded !== false;
  // A schema-shaped turn answers in JSON that the app's structured block renders better,
  // so the raw echo is the one that goes.
  const echoesStructuredOutput =
    !isUser && !showDots && isStructuredEcho(message.text, message.output, message.shapingStatus);

  if (hasNothingToShow) return null;

  return (
    <Message from={isUser ? "user" : "assistant"}>
      {message.spoken && isUser ? <SpokenMark /> : null}
      {isUser ? null : avatar === undefined ? <Message.Avatar initial={agentInitial} /> : avatar}
      <Box
        data-chat="turn-body"
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: isUser ? "flex-end" : "flex-start",
          maxWidth: "80%",
          minWidth: 0,
        }}
      >
        {isEditing && actions && serverId ? (
          <MessageEditForm
            initialText={message.text}
            disabled={actions.disabled}
            onCancel={() => setEditing(false)}
            onSave={(text) => {
              setEditing(false);
              actions.onEdit?.(serverId, text);
            }}
          />
        ) : null}
        {split ? (
          <Box sx={{ width: "100%", mb: 0.5 }}>
            <TurnTimeline
              messageId={message.id}
              parts={split.timeline}
              pending={Boolean(message.pending)}
              startedAt={message.at}
              settledAt={message.settledAt}
              tailLive={split.answer === null}
              durationUnknown={message.timingUnknown}
            />
          </Box>
        ) : !isUser && message.steps && hasListedSteps ? (
          <Box sx={{ width: "100%", mb: 0.5 }}>
            <TurnSteps steps={message.steps} pending={Boolean(message.pending)} />
          </Box>
        ) : null}
        {isUser ? renderUserExtras?.(message) : null}
        {echoesStructuredOutput || isEditing || settledEmpty ? null : showDots && onStop ? (
          // While a reply is pending with a cancel path offered, the turn has no content yet
          // to put a bubble around: a bubble plus an outlined Stop button read as chrome around
          // nothing. `ThinkingBar` renders as a plain row, padded to the bubble's own px/py so
          // its shimmering label starts exactly where bubble text would.
          <ThinkingBar onStop={stopHidden ? undefined : onStop} sx={{ px: 1.5, py: 1 }} />
        ) : (
          <Message.Content from={isUser ? "user" : "assistant"}>
            {showDots ? (
              <TypingDots />
            ) : isUser ? (
              message.text
            ) : (
              <Markdown id={message.id}>{answerText}</Markdown>
            )}
          </Message.Content>
        )}
        {hasMedia && media ? <MessageMedia {...mediaProps} items={media} /> : null}
        {isUser ? null : renderExtras?.(message)}
        {isUser ? null : <SourceList citations={message.citations} />}
        {isUser ? null : <FileChipList files={filesOfTurn(message)} onDownload={onDownloadFile} />}
        {isUser ? null : <MessageNotes message={message} />}
        {message.at ? (
          <Typography
            variant="caption"
            data-chat-timestamp=""
            sx={scheme((c) => ({ mt: 0.25, fontSize: 12, color: c.mutedText }))}
          >
            {formatTimestamp(message.at)}
          </Typography>
        ) : null}
        {actions && !isEditing ? (
          <TurnActions message={message} actions={actions} onStartEdit={() => setEditing(true)} />
        ) : null}
      </Box>
      {message.spoken && !isUser ? <SpokenMark /> : null}
      {isUser ? (userAvatar ?? null) : null}
    </Message>
  );
});
