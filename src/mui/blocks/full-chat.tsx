"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import type { BoxProps } from "@mui/material/Box";
import { useSuggestionFill } from "../../core/hooks/use-suggestion-fill";
import { isQuestionInterrupt } from "../../core/question";
import type { AgentStreamStatus, ChatMessage, ChatTurnActions, Interrupt } from "../../core/types";
import { FileUpload } from "../primitives/file-upload";
import { SystemMessage } from "../primitives/system-message";
import { ChatLookProvider, useChatKitStyles, type ChatLook } from "../theme";
import { ChatEmptyState } from "./chat-empty-state";
import { ChatHistorySidebar, type ChatHistorySidebarProps } from "./chat-history-sidebar";
import type { DataAttributes } from "./data-attributes";
import { Composer, type ComposerAttachment } from "./composer";
import type { ComposerToggle } from "./composer-toggles";
import type { ComposerVoiceOptions } from "./composer-voice-labels";
import { ComposerPills } from "./composer-pills";
import { columnPadding, Conversation, type ConversationProps } from "./conversation";
import type { QuestionCardLabels } from "./question-card";
import type { FileDownloader } from "./file-chip";
import { InterruptPrompt } from "./interrupt-prompt";

const SIDEBAR_WIDTH = 260;
const NO_LOOK: ChatLook = {};

/** The slice of `useChatStream`'s result that `FullChat` reads. Pass the hook's result straight in. */
export type FullChatStream = {
  messages: ChatMessage[];
  status: AgentStreamStatus;
  error: string | null;
  interrupt: Interrupt | null;
  followUps: string[];
  turnActions: ChatTurnActions | null;
  send: (text: string) => unknown;
  stop: () => unknown;
  retry: () => void;
  resume: (answer: string, values?: Record<string, unknown>) => unknown;
};

export type FullChatProps = {
  stream: FullChatStream;
  agent: { name: string; initial: string; avatarSrc?: string };
  greeting?: string;
  /** Starter prompts before the first message; picking one fills the box. */
  starters?: string[];
  /** Picking a starter sends it at once instead of filling the box. Default: false (fills). */
  sendStarters?: boolean;
  placeholder?: string;
  /** Drawn above the conversation, for example a `ConversationHeader`. Absent: nothing. */
  header?: ReactNode;
  /** Brings a message into view and highlights it; see `Conversation`'s `highlightMessageId`. */
  highlightMessageId?: string;
  /** Adds the conversation list beside the chat (above it on a narrow screen). */
  history?: ChatHistorySidebarProps;
  attachments?: ComposerAttachment[];
  onAttach?: (files: File[]) => void;
  onRemoveAttachment?: (id: string) => void;
  renderExtras?: (message: ChatMessage) => ReactNode;
  /** Blocks on the user's own turns, above the bubble (for example the files that turn sent). */
  renderUserExtras?: (message: ChatMessage) => ReactNode;
  /** File types the paperclip's picker offers (an `accept` string). Drops and pastes are not filtered; the host judges them in `onAttach`. */
  attachAccept?: string;
  /** Greys the paperclip only; `onAttach` still hears drops and pastes so the host can explain. */
  attachDisabled?: boolean;
  attachTooltip?: ReactNode;
  attachLabel?: string;
  /** A notice above the composer's attachments. */
  attachmentNotice?: ReactNode;
  /** Draws the agent's face on its turns, the typing row and the empty state, instead of an initial. `size` is the pixel size the kit would use. */
  renderAvatar?: (size: number) => ReactNode;
  onDownloadFile?: FileDownloader;
  /** Images, videos and sounds under an assistant reply; see `Conversation`. Omitted: nothing is drawn. */
  renderMedia?: ConversationProps["renderMedia"];
  /** `onOpen`, `onDownload`, `onRetry`, `labels`, `maxColumns` and `maxHeight` for the media block; see `Conversation`. */
  mediaProps?: ConversationProps["mediaProps"];
  /** Centres the turns and the composer in a column at most this many px wide; see `Conversation`. Omitted: full width. */
  columnMaxWidth?: number;
  /** Replaces the kit's greeting (avatar plus one line) before the first message, for an app that draws its own hello. */
  emptyState?: ReactNode;
  /** Disables the composer (and the starter and follow-up pills), for example when the chat may not send. Default: enabled. */
  disabled?: boolean;
  /** Replaces the error banner's Retry button, for example with a top-up link. */
  errorAction?: ReactNode;
  /** Severity of the banner `stream.error` fills (a spent allowance is a warning, a failure an error). Default: error. */
  errorSeverity?: "error" | "warning" | "info";
  rootProps?: Partial<BoxProps> & DataAttributes;
  /** Optional looks, all off by default; see `ChatLook`. */
  look?: ChatLook;
  /** Shows the composer's mic; `true` for browser speech recognition, or `ComposerVoiceOptions` to record and transcribe. See `Composer`. */
  voice?: boolean | ComposerVoiceOptions;
  voiceLang?: string;
  /** On/off chips in the composer's action row; see `Composer`. */
  toggles?: ComposerToggle[];
  /** Content of the composer's "More" menu; see `Composer`. */
  moreActions?: ReactNode;
  moreLabel?: string;
  /** Shows the composer's call button; see `Composer`. */
  onStartCall?: () => void;
  callLabel?: string;
  callDisabled?: boolean;
  /** Rendered directly above the composer (or the interrupt card), inside the composer column, for example a `CallStrip`. */
  aboveComposer?: ReactNode;
  /**
   * A phrase that answers a question for the person ("Let the agent decide" link on the question card),
   * for example "Use your best judgement". Omitted: no such link.
   */
  decideAnswer?: string;
  /** The link's text; default "Let the agent decide". */
  decideLabel?: string;
  /** Replaces words on the question card; see `QuestionCardLabels`. */
  questionLabels?: Partial<QuestionCardLabels>;
};

/**
 * A whole chat on one `useChatStream` result: optional conversation list, the conversation
 * with its empty state, an error banner with Retry, the interrupt card when the run waits on
 * an answer, otherwise the follow-up or starter pills and the composer. Dropping a file
 * anywhere on the chat attaches it when `onAttach` is supplied.
 */
export function FullChat({
  stream,
  agent,
  greeting = "How can I help?",
  starters = [],
  sendStarters = false,
  placeholder,
  header,
  highlightMessageId,
  history,
  attachments,
  onAttach,
  onRemoveAttachment,
  renderExtras,
  renderUserExtras,
  attachAccept,
  attachDisabled,
  attachTooltip,
  attachLabel,
  attachmentNotice,
  renderAvatar,
  onDownloadFile,
  renderMedia,
  mediaProps,
  columnMaxWidth,
  emptyState,
  disabled = false,
  errorAction,
  errorSeverity = "error",
  rootProps,
  look,
  voice,
  voiceLang,
  toggles,
  moreActions,
  moreLabel,
  onStartCall,
  callLabel,
  callDisabled,
  aboveComposer,
  decideAnswer,
  decideLabel,
  questionLabels,
}: FullChatProps) {
  const { scheme } = useChatKitStyles();
  const [draft, setDraft] = useState("");
  const { inputRef, fill } = useSuggestionFill(setDraft);
  const busy = stream.status === "connecting" || stream.status === "streaming";

  /** A question the agent asked in words; approvals keep their own card and panel below. */
  const asked = stream.status === "needs_input" && isQuestionInterrupt(stream.interrupt) ? stream.interrupt : null;
  const hasOptions = Boolean(asked?.options?.length);
  const askedQuestion = asked?.question;
  // An open question has no rows to tap, so the cursor goes straight to the message box.
  useEffect(() => {
    if (askedQuestion !== undefined && !hasOptions) inputRef.current?.focus();
  }, [askedQuestion, hasOptions, inputRef]);

  /** One answer per question: the interrupt object that was answered is remembered, and answering it again does nothing. */
  const answeredRef = useRef<Interrupt | null>(null);
  function answerQuestion(text: string) {
    if (!asked || answeredRef.current === asked) return;
    answeredRef.current = asked;
    void stream.resume(text);
  }

  function sendText(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy || disabled) return;
    if (asked) answerQuestion(trimmed);
    else void stream.send(trimmed);
    setDraft("");
  }

  /** Inside the composer wrap the wrap's own padding applies; beside the interrupt card it needs its own. */
  const aboveInWrap = aboveComposer ? (
    <Box data-chat="above-composer" sx={{ mb: 1 }}>
      {aboveComposer}
    </Box>
  ) : null;
  const aboveInterrupt = aboveComposer ? (
    <Box
      data-chat="above-composer"
      sx={scheme((c) => ({ borderTop: 1, borderColor: c.border, p: 1.5, pb: 0, ...(columnMaxWidth ? columnPadding(columnMaxWidth) : {}) }))}
    >
      {aboveComposer}
    </Box>
  ) : null;

  return (
    <ChatLookProvider value={look ?? NO_LOOK}>
    <Box
      {...rootProps}
      sx={[
        { display: "flex", flexDirection: { xs: "column", md: "row" }, flex: 1, minWidth: 0, minHeight: 0 },
        scheme((c, all) => ({ bgcolor: c.surface, color: c.text, fontFamily: all.fontFamily })),
      ]}
    >
      {history ? (
        <Box
          sx={[
            {
              width: { md: SIDEBAR_WIDTH },
              flexShrink: 0,
              borderStyle: "solid",
              borderWidth: 0,
              borderRightWidth: { md: 1 },
              borderBottomWidth: { xs: 1, md: 0 },
            },
            scheme((c) => ({ borderColor: c.border })),
          ]}
        >
          <ChatHistorySidebar {...history} />
        </Box>
      ) : null}
      <Box sx={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0, minHeight: 0 }}>
        {header}
        <FileUpload onFilesAdded={onAttach ?? (() => undefined)} disabled={!onAttach}>
          <Conversation
            messages={stream.messages}
            agentInitial={agent.initial}
            agentAvatar={renderAvatar?.(28)}
            liveAvatar={renderAvatar?.(28)}
            typing={stream.status === "connecting"}
            onStop={() => void stream.stop()}
            turnActions={stream.turnActions}
            renderExtras={renderExtras}
            renderUserExtras={renderUserExtras}
            onDownloadFile={onDownloadFile}
            renderMedia={renderMedia}
            mediaProps={mediaProps}
            columnMaxWidth={columnMaxWidth}
            highlightMessageId={highlightMessageId}
            foldAnswers
            question={
              asked
                ? {
                    interrupt: asked,
                    onAnswer: answerQuestion,
                    onOther: () => inputRef.current?.focus(),
                    decideAnswer,
                    decideLabel,
                    pending: busy || disabled,
                    labels: questionLabels,
                  }
                : undefined
            }
            emptyState={
              emptyState ?? <ChatEmptyState
                greeting={greeting}
                agentInitial={agent.initial}
                avatarSrc={agent.avatarSrc}
                avatar={renderAvatar?.(44)}
                disabled={busy}
              />
            }
          />
          {stream.error ? (
            <SystemMessage
              severity={errorSeverity}
              slotProps={{ root: { "data-chat": "banner" } as never }}
              sx={scheme((c) => ({ borderRadius: 0, borderTop: 1, borderColor: c.border }))}
              action={
                errorAction ?? (
                  <Button size="small" variant="outlined" color="inherit" onClick={stream.retry}>
                    Retry
                  </Button>
                )
              }
            >
              {stream.error}
            </SystemMessage>
          ) : null}
          {stream.status === "needs_input" && stream.interrupt && !asked ? (
            <>
              {aboveInterrupt}
              <InterruptPrompt interrupt={stream.interrupt} onAnswer={stream.resume} pending={busy} />
            </>
          ) : (
            <Box
              data-chat="composer-wrap"
              // The column padding rides inside `scheme`: a separate entry loses to the dark-scheme `p` rule.
              sx={scheme((c) => ({ borderTop: 1, borderColor: c.border, p: 1.5, ...(columnMaxWidth ? columnPadding(columnMaxWidth) : {}) }))}
            >
              {!draft && !busy && !disabled && !asked ? (
                <ComposerPills
                  followUps={stream.followUps}
                  starters={starters}
                  hasMessages={stream.messages.length > 0}
                  onSend={sendText}
                  onFill={sendStarters ? sendText : fill}
                />
              ) : null}
              {aboveInWrap}
              <Composer
                inputRef={inputRef}
                value={draft}
                onChange={setDraft}
                onSubmit={() => sendText(draft)}
                onStop={() => void stream.stop()}
                busy={busy}
                disabled={disabled}
                placeholder={placeholder}
                answering={asked ? { question: asked.question } : undefined}
                maxRows={6}
                attachments={attachments}
                onAttach={onAttach}
                accept={attachAccept}
                attachDisabled={attachDisabled}
                attachTooltip={attachTooltip}
                attachLabel={attachLabel}
                attachmentNotice={attachmentNotice}
                onRemoveAttachment={onRemoveAttachment}
                suggestions={starters}
                voice={voice}
                voiceLang={voiceLang}
                toggles={toggles}
                moreActions={moreActions}
                moreLabel={moreLabel}
                onStartCall={onStartCall}
                callLabel={callLabel}
                callDisabled={callDisabled}
              />
            </Box>
          )}
        </FileUpload>
      </Box>
    </Box>
    </ChatLookProvider>
  );
}
