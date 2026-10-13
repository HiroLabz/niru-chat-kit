import type { ReactNode, Ref } from "react";
import type { BoxProps } from "@mui/material/Box";
import type { SlashCommand } from "../../core/slash-commands";
import type { DataAttributes } from "./data-attributes";
import type { ComposerAttachment } from "./composer-attachments";
import type { ComposerVoiceOptions } from "./composer-voice-labels";
import type { ComposerMoreContext, ComposerToggle } from "./composer-toggles";

export type ComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onStop?: () => void;
  busy?: boolean;
  disabled?: boolean;
  placeholder?: string;
  settings?: ReactNode;
  settingsLabel?: string;
  attachments?: ComposerAttachment[];
  onAttach?: (files: File[]) => void;
  onRemoveAttachment?: (id: string) => void;
  accept?: string;
  /** Disables the paperclip only (drop and paste still call `onAttach`, so the host can say why nothing was added). */
  attachDisabled?: boolean;
  /** The paperclip's tooltip when it is disabled, or in place of "Attach a document". */
  attachTooltip?: ReactNode;
  /** The paperclip's accessible name; default "Attach a document". */
  attachLabel?: string;
  /** A short notice above the attachments (a rejected file, for example). */
  attachmentNotice?: ReactNode;
  trailing?: ReactNode;
  /** Controls at the right edge of the actions row, just before Send (or Stop); the leading `trailing` controls stay at the left. */
  endActions?: ReactNode;
  maxRows?: number;
  autoFocus?: boolean;
  /** Candidates offered above the field while it has text (autocomplete). Empty or omitted: no list. */
  suggestions?: string[];
  /** Ref to the message textarea, so a host can focus it after filling the draft. */
  inputRef?: Ref<HTMLTextAreaElement | HTMLInputElement>;
  /** Extra attributes for the bordered surface, for example an analytics mask. */
  rootProps?: Partial<BoxProps> & DataAttributes;
  /**
   * Shows a mic toggle that dictates into the box, where the browser supports speech recognition. Default: off.
   * Pass an object with `transcribe` to record instead: the audio goes to your function and the text it returns
   * is added to the box. See `ComposerVoiceOptions`.
   */
  voice?: boolean | ComposerVoiceOptions;
  /** The dictation language as a BCP 47 tag, for example `en-PH`. Default: the browser's. */
  voiceLang?: string;
  /** On/off chips in the actions row (for example "Search the web"), after the attach button. */
  toggles?: ComposerToggle[];
  /** Extra controls (menu items) shown behind a "More" button in the actions row. */
  moreActions?: ReactNode;
  /**
   * How the app's own row controls (`trailing`) appear when the composer is narrow. Omitted: `trailing` stays in the row.
   * Given, and narrow: `trailing` leaves the row and these items are shown in the More menu, below the voice item and
   * above the toggles and `moreActions`. Pass menu items, or a function that receives `{ closeMenu }` for an item
   * that opens something else and should close the menu when it is done. Wide composers ignore it.
   */
  narrowMoreItems?: ReactNode | ((context: ComposerMoreContext) => ReactNode);
  /** The "More" button's accessible name; default "More". The name gains ", N on" while N toggles inside are on. */
  moreLabel?: string;
  /** Shows a round call button in the actions row, just before Send. Omit it while a call is running. */
  onStartCall?: () => void;
  /** The call button's tooltip and accessible name; default "Start a call". */
  callLabel?: string;
  /** Greys the call button only. */
  callDisabled?: boolean;
  /**
   * Set while the agent waits on an answer: a chip above the text says "Answering: <question>"
   * and the placeholder becomes "Type your answer". The box, voice and attachments work as usual.
   */
  answering?: { question: string };
  /** The chip's lead-in; default "Answering:". */
  answeringLabel?: string;
  /** The placeholder while `answering`; default "Type your answer". */
  answeringPlaceholder?: string;
  /**
   * Slash commands the app offers. Typing `/` as the first thing in the box opens a list above it; typing filters,
   * ArrowUp/ArrowDown move, Enter or Tab pick, Escape closes. The kit ships none. Omitted or empty: no list.
   */
  commands?: SlashCommand[];
  /** Called after a command is picked and the box is updated. A command without `insert` is an action: do it here. */
  onCommand?: (command: SlashCommand) => void;
  /** The list's accessible name; default "Commands". */
  commandsLabel?: string;
  /** Adds a last row to the list that calls this and closes the list, for an app's own command editor. */
  onManageCommands?: () => void;
  /** The last row's text; default "Edit commands". */
  manageCommandsLabel?: string;
  /** Said in the list when nothing matches; default "No matching commands". */
  commandsEmptyText?: string;
};
