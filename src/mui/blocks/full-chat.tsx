"use client";

import { useState, type ReactNode } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import type { BoxProps } from "@mui/material/Box";
import { useSuggestionFill } from "../../core/hooks/use-suggestion-fill";
import type { AgentStreamStatus, ChatMessage, ChatTurnActions, Interrupt } from "../../core/types";
import { FileUpload } from "../primitives/file-upload";
import { SystemMessage } from "../primitives/system-message";
import { useChatKitStyles } from "../theme";
import { ChatEmptyState } from "./chat-empty-state";
import { ChatHistorySidebar, type ChatHistorySidebarProps } from "./chat-history-sidebar";
import type { DataAttributes } from "./data-attributes";
import { Composer, type ComposerAttachment } from "./composer";
import { ComposerPills } from "./composer-pills";
import { Conversation } from "./conversation";
import type { FileDownloader } from "./file-chip";
import { InterruptPrompt } from "./interrupt-prompt";

const SIDEBAR_WIDTH = 260;

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
  placeholder?: string;
  /** Adds the conversation list beside the chat (above it on a narrow screen). */
  history?: ChatHistorySidebarProps;
  attachments?: ComposerAttachment[];
  onAttach?: (files: File[]) => void;
  onRemoveAttachment?: (id: string) => void;
  renderExtras?: (message: ChatMessage) => ReactNode;
  onDownloadFile?: FileDownloader;
  /** Replaces the error banner's Retry button, for example with a top-up link. */
  errorAction?: ReactNode;
  rootProps?: Partial<BoxProps> & DataAttributes;
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
  placeholder,
  history,
  attachments,
  onAttach,
  onRemoveAttachment,
  renderExtras,
  onDownloadFile,
  errorAction,
  rootProps,
}: FullChatProps) {
  const { scheme } = useChatKitStyles();
  const [draft, setDraft] = useState("");
  const { inputRef, fill } = useSuggestionFill(setDraft);
  const busy = stream.status === "connecting" || stream.status === "streaming";

  function sendText(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    void stream.send(trimmed);
    setDraft("");
  }

  return (
    <Box
      {...rootProps}
      sx={[
        { display: "flex", flexDirection: { xs: "column", md: "row" }, flex: 1, minHeight: 0 },
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
        <FileUpload onFilesAdded={onAttach ?? (() => undefined)} disabled={!onAttach}>
          <Conversation
            messages={stream.messages}
            agentInitial={agent.initial}
            typing={stream.status === "connecting"}
            onStop={() => void stream.stop()}
            turnActions={stream.turnActions}
            renderExtras={renderExtras}
            onDownloadFile={onDownloadFile}
            emptyState={
              <ChatEmptyState
                greeting={greeting}
                agentInitial={agent.initial}
                avatarSrc={agent.avatarSrc}
                disabled={busy}
              />
            }
          />
          {stream.error ? (
            <SystemMessage
              severity="error"
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
          {stream.status === "needs_input" && stream.interrupt ? (
            <InterruptPrompt interrupt={stream.interrupt} onAnswer={stream.resume} pending={busy} />
          ) : (
            <Box sx={scheme((c) => ({ borderTop: 1, borderColor: c.border, p: 1.5 }))}>
              {!draft && !busy ? (
                <ComposerPills
                  followUps={stream.followUps}
                  starters={starters}
                  hasMessages={stream.messages.length > 0}
                  onSend={sendText}
                  onFill={fill}
                />
              ) : null}
              <Composer
                inputRef={inputRef}
                value={draft}
                onChange={setDraft}
                onSubmit={() => sendText(draft)}
                onStop={() => void stream.stop()}
                busy={busy}
                placeholder={placeholder}
                maxRows={6}
                attachments={attachments}
                onAttach={onAttach}
                onRemoveAttachment={onRemoveAttachment}
                suggestions={starters}
              />
            </Box>
          )}
        </FileUpload>
      </Box>
    </Box>
  );
}
