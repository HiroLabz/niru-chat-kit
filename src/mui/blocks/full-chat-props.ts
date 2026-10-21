import type { ReactNode } from "react";
import type { BoxProps } from "@mui/material/Box";
import type { SlashCommand } from "../../core/slash-commands";
import type { AgentStreamStatus, ChatMessage, ChatTurnActions, Interrupt } from "../../core/types";
import type { FileUploadScope } from "../primitives/file-upload";
import type { ChatLook } from "../theme";
import type { ComposerAttachment } from "./composer";
import type { ComposerProps } from "./composer-props";
import type { ComposerMoreContext, ComposerToggle } from "./composer-toggles";
import type { ComposerVoiceOptions } from "./composer-voice-labels";
import type { ConversationProps } from "./conversation";
import type { DataAttributes } from "./data-attributes";
import type { FileDownloader } from "./file-chip";
import type { QuestionCardLabels } from "./question-card";

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
  /**
   * Drawn beside the chat (above it on a narrow screen), in a 260 px column with a border, for example
   * `<ChatHistorySidebar {...props} />`. Omitted: no column. The kit imports no sidebar itself, so an app
   * that never passes one does not bundle it.
   */
  sidebar?: ReactNode;
  /**
   * Where a dropped file is caught: `"window"` (default) listens on the whole page, `"zone"` only on the chat
   * (the conversation and the message box), which is what a chat embedded in someone else's page wants. Only
   * matters when `onAttach` is set.
   */
  dropScope?: FileUploadScope;
  /** What the chat says while a file is dragged over it with `dropScope="zone"`. Default: "Drop files to attach". */
  dropLabel?: string;
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
  /** Where the composer's voice input sits: `"start"` (default) or `"end"`, immediately left of Send. See `Composer`. */
  voicePlacement?: "start" | "end";
  /** On/off chips in the composer's action row; see `Composer`. */
  toggles?: ComposerToggle[];
  /** Content of the composer's "More" menu; see `Composer`. */
  moreActions?: ReactNode;
  /** How `trailing`-style app controls appear in the More menu on a narrow composer; see `Composer`. */
  narrowMoreItems?: ReactNode | ((context: ComposerMoreContext) => ReactNode);
  moreLabel?: string;
  /** Shows the composer's call button; see `Composer`. */
  onStartCall?: () => void;
  callLabel?: string;
  callDisabled?: boolean;
  /** Slash commands offered when the person types `/` in the box; see `Composer`. */
  commands?: SlashCommand[];
  /** Called after a command is picked; see `Composer`. */
  onCommand?: (command: SlashCommand) => void;
  /** The command list's accessible name; see `Composer`. */
  commandsLabel?: string;
  /** Adds a last "Edit commands" row to the list; see `Composer`. */
  onManageCommands?: () => void;
  /** That row's text; see `Composer`. */
  manageCommandsLabel?: string;
  /** Said when no command matches; see `Composer`. */
  commandsEmptyText?: string;
  /** Rendered directly above the composer (or the interrupt card), inside the composer column, for example a `CallStrip`. */
  aboveComposer?: ReactNode;
  /**
   * A phrase that answers a question for the person ("Let the agent decide" link on the question card),
   * for example "Use your best judgement". Omitted: no such link.
   */
  decideAnswer?: string;
  /**
   * Called with the text when Send is pressed while a turn works and `queue` is given; the box then stays usable during the
   * turn (Stop shows while it is empty) and the host adds the text to its queue. Without it the box waits for the turn as before.
   */
  onQueue?: (text: string) => void;
  /** The link's text; default "Let the agent decide". */
  decideLabel?: string;
  /** Replaces words on the question card; see `QuestionCardLabels`. */
  questionLabels?: Partial<QuestionCardLabels>;
} & Pick<
  ComposerProps,
  // The composer's opt-in extras, passed straight through; each is documented on `Composer`.
  "addMenu" | "chips" | "pastedTexts" | "onPasteLongText" | "onRemovePastedText" | "onShowPastedText" | "longPasteThreshold" | "mentions" | "onMention" | "mentionsLabel" | "mentionsEmptyText" | "mentionsLoading" | "approvalMode" | "extrasLabels" | "endLeading" | "queue"
>;
