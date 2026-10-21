"use client";

import { useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import { useSuggestionFill } from "../../core/hooks/use-suggestion-fill";
import { isQuestionInterrupt } from "../../core/question";
import type { Interrupt } from "../../core/types";
import { FileUpload } from "../primitives/file-upload";
import { SystemMessage } from "../primitives/system-message";
import { ChatLookProvider, useChatKitStyles, type ChatLook } from "../theme";
import { ChatEmptyState } from "./chat-empty-state";
import { Composer } from "./composer";
import { ComposerPills } from "./composer-pills";
import { columnPadding, Conversation } from "./conversation";
import type { FullChatProps } from "./full-chat-props";
import { InterruptPrompt } from "./interrupt-prompt";

export type { FullChatProps, FullChatStream } from "./full-chat-props";

const SIDEBAR_WIDTH = 260;
const NO_LOOK: ChatLook = {};

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
  sidebar,
  dropScope = "window",
  dropLabel = "Drop files to attach",
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
  voicePlacement,
  toggles,
  moreActions,
  narrowMoreItems,
  moreLabel,
  onStartCall,
  callLabel,
  callDisabled,
  commands,
  onCommand,
  commandsLabel,
  onManageCommands,
  manageCommandsLabel,
  commandsEmptyText,
  aboveComposer,
  decideAnswer,
  decideLabel,
  questionLabels,
  addMenu,
  chips,
  pastedTexts,
  onPasteLongText,
  onRemovePastedText,
  onShowPastedText,
  longPasteThreshold,
  mentions,
  onMention,
  mentionsLabel,
  mentionsEmptyText,
  mentionsLoading,
  approvalMode,
  endLeading,
  extrasLabels,
  queue,
  onQueue,
}: FullChatProps) {
  const { scheme } = useChatKitStyles();
  const [draft, setDraft] = useState("");
  const { inputRef, fill } = useSuggestionFill(setDraft);
  const busy = stream.status === "connecting" || stream.status === "streaming";
  /** With a queue and `onQueue`, the box stays usable while a turn works and Send hands the text to the host. */
  const queueing = Boolean(queue && onQueue);

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
    if (!trimmed || disabled) return;
    if (busy) {
      if (queueing) {
        onQueue?.(trimmed);
        setDraft("");
      }
      return;
    }
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
      {sidebar ? (
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
          {sidebar}
        </Box>
      ) : null}
      <Box sx={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0, minHeight: 0 }}>
        {header}
        <FileUpload
          onFilesAdded={onAttach ?? (() => undefined)}
          disabled={!onAttach}
          scope={dropScope}
          // A zone is a box in the column: it takes the room the chat used to take and passes the height on.
          slotProps={{ root: { "data-chat": "drop-zone", sx: { display: "flex", flexDirection: "column", flex: 1, minWidth: 0, minHeight: 0 } } as never }}
        >
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
                busy={busy && !queueing}
                running={busy && queueing}
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
                voicePlacement={voicePlacement}
                toggles={toggles}
                moreActions={moreActions}
                narrowMoreItems={narrowMoreItems}
                moreLabel={moreLabel}
                onStartCall={onStartCall}
                callLabel={callLabel}
                callDisabled={callDisabled}
                commands={commands}
                onCommand={onCommand}
                commandsLabel={commandsLabel}
                onManageCommands={onManageCommands}
                manageCommandsLabel={manageCommandsLabel}
                commandsEmptyText={commandsEmptyText}
                addMenu={addMenu}
                chips={chips}
                pastedTexts={pastedTexts}
                onPasteLongText={onPasteLongText}
                onRemovePastedText={onRemovePastedText}
                onShowPastedText={onShowPastedText}
                longPasteThreshold={longPasteThreshold}
                mentions={mentions}
                onMention={onMention}
                mentionsLabel={mentionsLabel}
                mentionsEmptyText={mentionsEmptyText}
                mentionsLoading={mentionsLoading}
                approvalMode={approvalMode}
                endLeading={endLeading}
                extrasLabels={extrasLabels}
                queue={queue}
              />
            </Box>
          )}
          {dropScope === "zone" ? <FileUpload.Content>{dropLabel}</FileUpload.Content> : null}
        </FileUpload>
      </Box>
    </Box>
    </ChatLookProvider>
  );
}
