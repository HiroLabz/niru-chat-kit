"use client";

import { useState, type ReactNode } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import type { BoxProps } from "@mui/material/Box";
import { useSuggestionFill } from "../../core/hooks/use-suggestion-fill";
import type { AgentStreamStatus, ChatMessage, ChatTurnActions, Interrupt } from "../../core/types";
import { FileUpload } from "../primitives/file-upload";
import { SystemMessage } from "../primitives/system-message";
import { ChatLookProvider, useChatKitStyles, type ChatLook } from "../theme";
import { ChatEmptyState } from "./chat-empty-state";
import { ChatHistorySidebar, type ChatHistorySidebarProps } from "./chat-history-sidebar";
import type { DataAttributes } from "./data-attributes";
import { Composer, type ComposerAttachment } from "./composer";
import type { ComposerToggle } from "./composer-toggles";
import { ComposerPills } from "./composer-pills";
import { columnPadding, Conversation } from "./conversation";
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
  placeholder?: string;
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
  /** Shows the composer's mic where the browser supports speech recognition; see `Composer`. */
  voice?: boolean;
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
  renderUserExtras,
  attachAccept,
  attachDisabled,
  attachTooltip,
  attachLabel,
  attachmentNotice,
  renderAvatar,
  onDownloadFile,
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
}: FullChatProps) {
  const { scheme } = useChatKitStyles();
  const [draft, setDraft] = useState("");
  const { inputRef, fill } = useSuggestionFill(setDraft);
  const busy = stream.status === "connecting" || stream.status === "streaming";

  function sendText(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy || disabled) return;
    void stream.send(trimmed);
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
            agentAvatar={renderAvatar?.(28)}
            liveAvatar={renderAvatar?.(28)}
            typing={stream.status === "connecting"}
            onStop={() => void stream.stop()}
            turnActions={stream.turnActions}
            renderExtras={renderExtras}
            renderUserExtras={renderUserExtras}
            onDownloadFile={onDownloadFile}
            columnMaxWidth={columnMaxWidth}
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
          {stream.status === "needs_input" && stream.interrupt ? (
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
              {!draft && !busy && !disabled ? (
                <ComposerPills
                  followUps={stream.followUps}
                  starters={starters}
                  hasMessages={stream.messages.length > 0}
                  onSend={sendText}
                  onFill={fill}
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
