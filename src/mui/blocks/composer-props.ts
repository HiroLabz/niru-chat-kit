import type { ReactNode, Ref } from "react";
import type { BoxProps } from "@mui/material/Box";
import type { SlashCommand } from "../../core/slash-commands";
import type { ComposerMention } from "../../core/mentions";
import type { ComposerPastedText, LongPasteThreshold } from "../../core/pasted-text";
import type { DataAttributes } from "./data-attributes";
import type { ComposerAttachment } from "./composer-attachments";
import type { ComposerVoiceOptions } from "./composer-voice-labels";
import type { ComposerMoreContext, ComposerToggle } from "./composer-toggles";
import type { ComposerAddMenuOptions } from "./composer-add-menu";
import type { ComposerApprovalMode } from "./composer-approval-mode";
import type { ComposerChip } from "./composer-chips";
import type { ComposerExtrasLabels } from "./composer-extras-labels";
import type { PromptQueueProps } from "./prompt-queue";

export type ComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onStop?: () => void;
  busy?: boolean;
  /**
   * A turn is running while the box still takes text (steering). Send becomes Stop while the box is empty, and
   * comes back as soon as the person types, so a message can still be sent to the running turn. Needs `onStop`.
   */
  running?: boolean;
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
  /**
   * Runs when the paperclip or the Add menu's upload row is pressed, in place of opening the file chooser at once. It gets
   * `chooseFile`, which opens the chooser; call it from a press of your own (a dialog that lists the accepted types and the
   * size limit, say) so the browser still allows the chooser.
   */
  onAttachClick?: (chooseFile: () => void) => void;
  /** A short notice above the attachments (a rejected file, for example). */
  attachmentNotice?: ReactNode;
  /** App controls in the row after the toggles. Narrow: see `narrowMoreItems`. */
  trailing?: ReactNode;
  /** Controls at the right edge of the actions row, just before Send (or Stop); the leading `trailing` controls stay at the left. */
  endActions?: ReactNode;
  /**
   * Content in the end group of the actions row, immediately before the call button, the voice input (with
   * `voicePlacement="end"`) and Send, after `endActions`. For an app control that belongs beside the microphone, such as a
   * model picker. On a narrow composer it follows `trailing`: with `narrowMoreItems` given it leaves the row, otherwise it stays.
   */
  endLeading?: ReactNode;
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
   * is added to the box. See `ComposerVoiceOptions`; with `microphones` and `onSelectMicrophone` in it, a caret
   * beside the mic lets the person choose the microphone to record from.
   */
  voice?: boolean | ComposerVoiceOptions;
  /** The dictation language as a BCP 47 tag, for example `en-PH`. Default: the browser's. */
  voiceLang?: string;
  /**
   * Where the voice input sits in the action row. `"start"` (default): after the attach button, as always.
   * `"end"`: immediately left of Send, drawn like the call button (a round outline), with the call button, if any, before it.
   * On a narrow composer `"end"` keeps the mic in the row (attach, More, [call], mic, Send) and puts the
   * microphone choice (`voice.microphones`) in More under a "Choose microphone" heading; `"start"` keeps it in More as before.
   */
  voicePlacement?: "start" | "end";
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
  /**
   * Shows a round waveform button in the Send slot while there is nothing to send (no text, files or pasted text) and no
   * run to stop; typing turns it back into Send. Omit it while a call is running.
   */
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
  /**
   * Replaces the paperclip with a round plus button that opens an "Add" panel above the box: when the composer can
   * attach (`onAttach` given, not disabled) the first row is the upload action (named by `attachLabel`, opening the
   * same file chooser), then your `sections` in order, each with an optional title, rows with icon, label, one grey
   * line, an optional check, a disabled reason, and an optional search field for a long section. Arrows, Home, End
   * and Enter work; Escape closes and returns focus to the plus button. Omitted: the paperclip, exactly as before.
   */
  addMenu?: ComposerAddMenuOptions;
  /** Small state chips in the row after the plus button ("Plan mode", "Goal: ..."). With no room they wrap to their own line; on a narrow composer they sit on a line above the row. */
  chips?: ComposerChip[];
  /**
   * Long pastes you are holding for the person, drawn above the text beside the attachment previews: an icon tile, the
   * title (default the first non-empty line), the size, a "Show in text field" link (needs `onShowPastedText`) and a remove
   * button (needs `onRemovePastedText`). The kit never sends or stores the text: you decide what Send does with it.
   */
  pastedTexts?: ComposerPastedText[];
  /**
   * Given, a plain-text paste into the box that is at or over `longPasteThreshold` does not enter the text: it is handed
   * to this function (files in the same paste still go to `onAttach`). Shorter pastes, and every paste while the composer
   * is disabled, are untouched. Omitted: pasting behaves as before.
   */
  onPasteLongText?: (text: string) => void;
  /** The remove button on a pasted text chip. */
  onRemovePastedText?: (id: string) => void;
  /** The "Show in text field" link on a pasted text chip. */
  onShowPastedText?: (id: string) => void;
  /** What counts as a long paste: at least `characters` (default 2000) or `lines` (default 40). */
  longPasteThreshold?: LongPasteThreshold;
  /**
   * Items offered when the person types `@` at the start of the text or after whitespace (never in an email address or
   * inside a word). A list opens above the box, typing filters it (label, keywords, description), items are grouped by
   * `group`, ArrowUp/ArrowDown/Home/End move, Enter or Tab pick, Escape closes and keeps the text. Picking writes
   * `@Label ` and calls `onMention`. Given (even empty) the list is on; omitted: no mentions. Never open with the slash list.
   */
  mentions?: ComposerMention[];
  /** Called after an item is picked and the text is updated. Use `mentionsIn(value, items)` at send time to find which are still in the text. */
  onMention?: (item: ComposerMention) => void;
  /** The mention list's accessible name; default "Mentions". */
  mentionsLabel?: string;
  /** Said in the mention list when nothing matches; default "No matches". */
  mentionsEmptyText?: string;
  /** Shows a quiet "Loading" row in the mention list, for items that arrive late. */
  mentionsLoading?: boolean;
  /** A quiet button in the row with the current approval choice that opens a menu of choices. On a narrow composer the choices move into More. */
  approvalMode?: ComposerApprovalMode;
  /** Overrides for the words of the extras above (Add menu, chips, pasted text, approval); see `ComposerExtrasLabels`. */
  extrasLabels?: Partial<ComposerExtrasLabels>;
  /**
   * Prompts waiting behind the running turn, stacked above the text box inside the composer: each row has Steer, Edit and
   * Delete. Pass the return of core's `usePromptQueue` as is, or `{ items, onSteer, onEdit, onDelete, canSteer, note, steering, labels }`.
   * While `running`, Send calls `onSubmit` so the host can add the text to the queue. Omitted: nothing changes.
   */
  queue?: PromptQueueProps;
};
