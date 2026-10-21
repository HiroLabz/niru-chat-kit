"use client";

/**
 * The prompt composer.
 *
 * One bordered surface holds the message field and its controls, so the whole composer
 * reads as a single input rather than a textarea with a toolbar bolted underneath. The
 * field grows with the message up to a cap and then scrolls, keeping the send affordance
 * in a fixed place.
 *
 * Run settings and attachments live inside the surface because they belong to the message
 * being written, not to the page. Callers pass their own settings body.
 *
 * The settings body is an in-flow disclosure rather than a portalled popover on purpose.
 * Every surface that passes `settings` renders this composer inside a narrow column, so a
 * fixed-width floating sheet cannot be kept inside its own column. Growing in flow makes
 * the surface's own width the bound, which no breakpoint can break.
 */

import {
  useCallback,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type KeyboardEvent,
} from "react";
import Box from "@mui/material/Box";
import Collapse from "@mui/material/Collapse";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import AttachFileOutlinedIcon from "@mui/icons-material/AttachFileOutlined";
import TuneOutlinedIcon from "@mui/icons-material/TuneOutlined";
import { PromptInput } from "../primitives/prompt-input";
import { useChatKitStyles } from "../theme";
import { ComposerSuggestionsList, useComposerSuggestions } from "./composer-suggestions";
import { SlashCommandMenu } from "./slash-command-menu";
import { useSlashCommands } from "./use-slash-commands";
import { useDismissOnOutsidePointer } from "./use-outside-pointer";
import { ComposerAttachmentList } from "./composer-attachments";
import { ComposerAddButton, ComposerAddPanel, useComposerAddMenu } from "./composer-add-menu";
import { ComposerApprovalButton, ComposerApprovalMoreItems } from "./composer-approval-mode";
import { ComposerChips } from "./composer-chips";
import { composerExtrasLabels } from "./composer-extras-labels";
import { MentionMenu, useMentions } from "./composer-mentions";
import { ComposerPastedTextList } from "./composer-pasted-text";
import { takePaste } from "./composer-paste";
import type { ComposerProps } from "./composer-props";
import { ComposerMicButton, ComposerMicCaret, ComposerMicChoiceItems, ComposerMicMenuItem, ComposerVoiceStatus, useComposerVoice, voiceIsBusy } from "./composer-voice";
import { ComposerMoreMenu, ComposerToggles } from "./composer-toggles";
import { ComposerAnsweringChip, ComposerSendSlot, sendSlotState } from "./composer-send";
import { useNarrowBox } from "./use-narrow-box";
import { PromptQueue } from "./prompt-queue";

export type { ComposerAttachment } from "./composer-attachments";
export type { ComposerProps } from "./composer-props";
export type { ComposerMoreContext, ComposerToggle } from "./composer-toggles";
export type { ComposerAddItem, ComposerAddMenuOptions, ComposerAddSection } from "./composer-add-menu";
export type { ComposerApprovalMode, ComposerApprovalOption } from "./composer-approval-mode";
export type { ComposerChip } from "./composer-chips";
export { DEFAULT_COMPOSER_EXTRAS_LABELS, type ComposerExtrasLabels } from "./composer-extras-labels";

/** How far the field grows before it scrolls. */
const MAX_FIELD_ROWS = 12;
/** How tall the settings sheet grows before it scrolls its own overflow, so an open sheet
 *  can never squeeze the transcript above it out of the panel. */
const SETTINGS_MAX_HEIGHT = 260;
/** The composer's corner radius is the shared radius scaled up, so a larger token rounds it too. */
const COMPOSER_RADIUS_SCALE = 1.5;

/**
 * Breathing room between this sheet's scroll edge and the controls inside it. Setting
 * `overflow-y: auto` makes CSS compute `overflow-x: auto` as well, so the box clips its
 * children at its padding box on both axes; flush children lost an outlined field's
 * floating label and a select's chevron at the edge.
 */
const SETTINGS_CLIP_INSET = 1.25;

/** Below this width (px) of the composer itself, the toggles move into the More menu so Send always fits. */
const TOGGLES_INTO_MORE_BELOW = 460;

const NO_SUGGESTIONS: string[] = [];

export function Composer({
  value,
  onChange,
  onSubmit,
  onStop,
  running,
  busy = false,
  disabled = false,
  placeholder = "Send a message to start a chat",
  settings,
  settingsLabel = "Run settings",
  attachments = [],
  onAttach,
  onRemoveAttachment,
  accept,
  attachDisabled = false,
  attachTooltip,
  attachLabel = "Attach a document",
  onAttachClick,
  attachmentNotice,
  trailing,
  endActions,
  endLeading,
  maxRows = MAX_FIELD_ROWS,
  autoFocus = false,
  suggestions = NO_SUGGESTIONS,
  inputRef,
  rootProps,
  voice: voiceProp = false,
  voiceLang,
  voicePlacement = "start",
  toggles,
  moreActions,
  narrowMoreItems,
  moreLabel,
  onStartCall,
  callLabel,
  callDisabled,
  answering,
  answeringLabel = "Answering:",
  answeringPlaceholder = "Type your answer",
  commands,
  onCommand,
  commandsLabel = "Commands",
  onManageCommands,
  manageCommandsLabel = "Edit commands",
  commandsEmptyText = "No matching commands",
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
  extrasLabels,
  queue,
}: ComposerProps) {
  const { scheme } = useChatKitStyles();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsId = useId();
  const fileInput = useRef<HTMLInputElement | null>(null);
  const chooseFile = () => fileInput.current?.click();
  const openAttach = () => (onAttachClick ? onAttachClick(chooseFile) : chooseFile());
  const composerRootRef = useRef<HTMLDivElement | null>(null);
  const extras = composerExtrasLabels(extrasLabels);
  const addLabel = addMenu?.label ?? extras.add;
  const add = useComposerAddMenu({
    disabled,
    canAttach: Boolean(onAttach),
    attachLabel,
    attachDisabled,
    attachTooltip,
    uploadIcon: <AttachFileOutlinedIcon fontSize="small" />,
    openFileChooser: openAttach,
  });
  const narrow = useNarrowBox(composerRootRef, TOGGLES_INTO_MORE_BELOW);
  const foldToggles = narrow && Boolean(toggles?.length);
  const approvalHeading = approvalMode?.heading ?? extras.approvalHeading;
  const foldApproval = narrow && Boolean(approvalMode);
  const foldTrailing = narrow && narrowMoreItems !== undefined && narrowMoreItems !== null;
  const canSend = value.trim().length > 0 && !disabled && !busy;
  const voice = useComposerVoice({ enabled: Boolean(voiceProp), value, onChange, lang: voiceLang, options: typeof voiceProp === "object" ? voiceProp : undefined });
  const stopVoice = voice.endForSend;
  const voiceBusy = voiceIsBusy(voice);
  const { sendBusy, talk, caretOnCall } = sendSlotState({ busy, running, canSend, onStartCall, onStop, narrow, choice: Boolean(voice.choice), waiting: attachments.length > 0 || Boolean(pastedTexts?.length) || voiceBusy });
  /** Narrow: the mic is a More item while idle, and stays in the row (with its stop control) while it works. */
  const micAtEnd = voicePlacement === "end";
  /** At the end the mic is a main action and stays in the row; only its microphone choice goes into More. */
  const foldVoice = narrow && !micAtEnd && voice.visible && !voiceBusy;
  const foldMicChoice = narrow && micAtEnd && voice.visible && Boolean(voice.choice);
  /** Sending ends any dictation, so words heard after Send do not land in the next draft. */
  const submit = useCallback(() => {
    stopVoice();
    onSubmit();
  }, [stopVoice, onSubmit]);
  const slash = useSlashCommands({ value, onChange, commands, onCommand, onManage: onManageCommands, inputRef });
  // The mention list never opens with the slash list; it passes the textarea on to the slash list's own ref.
  const mention = useMentions({ value, onChange, mentions, onMention, suppressed: slash.open, inputRef: slash.inputRef });
  const fieldAria = mention.open ? mention.inputProps : { ...mention.inputProps, ...slash.inputProps };
  // An open list owns the box, so the autocomplete list stays out of its way.
  const composerSuggestions = useComposerSuggestions({
    value,
    suggestions: slash.open || mention.open ? NO_SUGGESTIONS : suggestions,
    onFill: onChange,
  });
  /** The slash and mention lists get each key first; what they leave alone goes on to the suggestions. */
  function handleFieldKeyDown(event: KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) {
    slash.handleKeyDown(event);
    if (!event.defaultPrevented) mention.handleKeyDown(event);
    if (!event.defaultPrevented) composerSuggestions.handleKeyDown(event);
  }

  /** Escape closes the sheet here rather than reaching the panel that hosts the composer. */
  function handleEscape(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Escape" || !settingsOpen) return;
    event.stopPropagation();
    setSettingsOpen(false);
  }

  // Both floating lists close on a click anywhere outside the composer, like any combobox popup.
  useDismissOnOutsidePointer(composerRootRef, composerSuggestions.open, composerSuggestions.close);
  useDismissOnOutsidePointer(composerRootRef, slash.open, slash.close);
  useDismissOnOutsidePointer(composerRootRef, mention.open, mention.close);

  function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length && onAttach) onAttach(files);
    event.target.value = "";
  }

  function handlePaste(event: ClipboardEvent<HTMLDivElement>) {
    if (disabled) return;
    if (takePaste(event, { onAttach, onPasteLongText, threshold: longPasteThreshold })) event.preventDefault();
  }

  return (
    // `position: relative` anchor for the floating suggestions list below: it is a sibling
    // of `PromptInput`'s own bordered box, not a child, so that box's height never depends
    // on whether a suggestion is showing.
    <Box ref={composerRootRef} sx={{ position: "relative" }} onPaste={handlePaste}>
      <PromptInput
        value={value}
        onValueChange={onChange}
        onSubmit={submit}
        isLoading={busy}
        disabled={disabled}
        maxRows={maxRows}
        slotProps={{ root: { onKeyDown: handleEscape, "data-chat": "composer", ...rootProps } as never }}
        sx={scheme((c, all) => ({
          borderRadius: `${all.radius * COMPOSER_RADIUS_SCALE}px`,
          border: 1,
          borderColor: c.border,
          bgcolor: c.surface,
          color: c.text,
          fontFamily: all.fontFamily,
          px: 1.5,
          pt: 1.25,
          pb: 1,
          transition: "border-color 150ms, box-shadow 150ms",
          "&:focus-within": {
            borderColor: c.accent,
            boxShadow: `0 0 0 3px ${alpha(c.accent, 0.16)}`,
          },
        }))}
      >
        {answering ? <ComposerAnsweringChip question={answering.question} label={answeringLabel} /> : null}
        {attachmentNotice ? (
          <Typography variant="body2" role="status" sx={scheme((c) => ({ mb: 1, color: c.mutedText }))}>
            {attachmentNotice}
          </Typography>
        ) : null}
        <ComposerAttachmentList attachments={attachments} onRemoveAttachment={onRemoveAttachment} />
        {pastedTexts?.length ? (
          <ComposerPastedTextList items={pastedTexts} labels={extras} disabled={disabled} onShow={onShowPastedText} onRemove={onRemovePastedText} />
        ) : null}

        <Collapse in={settingsOpen} unmountOnExit>
          <Box
            id={settingsId}
            sx={scheme((c) => ({
              mb: 1,
              pt: SETTINGS_CLIP_INSET,
              pr: SETTINGS_CLIP_INSET,
              pb: 1.5,
              borderBottom: 1,
              borderColor: c.border,
              maxHeight: SETTINGS_MAX_HEIGHT,
              overflowY: "auto",
              scrollbarGutter: "stable",
            }))}
          >
            <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
              {settingsLabel}
            </Typography>
            {settings}
          </Box>
        </Collapse>

        {queue ? <PromptQueue {...queue} disabled={queue.disabled ?? disabled} /> : null}

        <PromptInput.Textarea
          placeholder={answering ? answeringPlaceholder : placeholder}
          autoFocus={autoFocus}
          onKeyDown={handleFieldKeyDown}
          sx={{ px: 0.5, fontSize: 15, lineHeight: 1.55, color: "inherit", fontFamily: "inherit" }}
          slotProps={{
            input: {
              ...({ "data-chat": "composer-field" } as object),
              inputRef: mention.inputRef,
              inputProps: {
                "data-chat": "composer-input",
                "aria-expanded": composerSuggestions.open,
                "aria-controls": composerSuggestions.open ? composerSuggestions.listboxId : undefined,
                "aria-activedescendant": composerSuggestions.activeId,
                ...fieldAria,
              },
            },
          }}
        />

        <ComposerVoiceStatus voice={voice} />

        {narrow && chips?.length ? (
          <Box data-chat="composer-chips" sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.75 }}>
            <ComposerChips chips={chips} disabled={disabled} removeWord={extras.remove} />
          </Box>
        ) : null}

        <PromptInput.Actions sx={{ mt: 0.75, flexWrap: narrow ? "nowrap" : "wrap", minWidth: 0 }} slotProps={{ root: { "data-chat": "composer-bar" } as never }}>
          {settings ? (
            <PromptInput.Action tooltip={settingsLabel}>
              <IconButton
                size="small"
                aria-label={settingsLabel}
                aria-expanded={settingsOpen}
                aria-controls={settingsOpen ? settingsId : undefined}
                onClick={() => setSettingsOpen((open) => !open)}
              >
                <TuneOutlinedIcon fontSize="small" />
              </IconButton>
            </PromptInput.Action>
          ) : null}

          {addMenu ? (
            <ComposerAddButton
              label={addLabel}
              open={add.open}
              disabled={disabled}
              panelId={add.panelId}
              buttonRef={add.buttonRef}
              onToggle={add.toggle}
            />
          ) : onAttach ? (
            <PromptInput.Action tooltip={attachTooltip ?? attachLabel}>
              <IconButton
                size="small"
                aria-label={attachLabel}
                data-chat="attach"
                disabled={disabled || attachDisabled}
                onClick={openAttach}
              >
                <AttachFileOutlinedIcon fontSize="small" />
              </IconButton>
            </PromptInput.Action>
          ) : null}

          {foldVoice || micAtEnd ? null : <ComposerMicButton voice={voice} disabled={disabled} caret={!caretOnCall} />}

          {!narrow && chips?.length ? <ComposerChips chips={chips} disabled={disabled} removeWord={extras.remove} /> : null}

          {approvalMode && !narrow ? <ComposerApprovalButton approval={approvalMode} heading={approvalHeading} disabled={disabled} /> : null}

          {toggles?.length && !foldToggles ? <ComposerToggles toggles={toggles} disabled={disabled} /> : null}

          {moreActions || foldToggles || foldVoice || foldMicChoice || foldTrailing || foldApproval ? (
            <ComposerMoreMenu
              label={moreLabel}
              disabled={disabled}
              toggles={foldToggles ? toggles : undefined}
              leadItems={
                foldVoice || foldMicChoice || foldApproval
                  ? ({ closeMenu }) => [
                      foldVoice ? <ComposerMicMenuItem key="mic" voice={voice} disabled={disabled} closeMenu={closeMenu} /> : null,
                      foldMicChoice ? <ComposerMicChoiceItems key="mics" voice={voice} disabled={disabled} closeMenu={closeMenu} /> : null,
                      foldApproval && approvalMode ? <ComposerApprovalMoreItems key="approval" approval={approvalMode} heading={approvalHeading} disabled={disabled} closeMenu={closeMenu} /> : null,
                    ]
                  : undefined
              }
              narrowItems={foldTrailing ? narrowMoreItems : undefined}
            >
              {moreActions}
            </ComposerMoreMenu>
          ) : null}

          {foldTrailing ? null : trailing}

          <Box sx={{ flexGrow: 1 }} />

          {endActions}

          {foldTrailing ? null : endLeading}

          {micAtEnd ? <ComposerMicButton voice={voice} disabled={disabled} placement="end" caret={!narrow && !caretOnCall} /> : null}

          <ComposerSendSlot
            busy={sendBusy}
            onStop={onStop}
            canSend={canSend}
            onSend={submit}
            tooltip={canSend ? "Send" : attachments.length ? "Add a message to send your files" : "Write a message to send"}
            call={{ onStartCall, label: callLabel, disabled: disabled || callDisabled, talk }}
            caret={caretOnCall ? <ComposerMicCaret voice={voice} disabled={disabled} /> : null}
          />
        </PromptInput.Actions>

        {onAttach ? (
          <input ref={fileInput} type="file" hidden multiple accept={accept} onChange={handleFiles} />
        ) : null}
      </PromptInput>
      <ComposerSuggestionsList controller={composerSuggestions} />
      {addMenu && add.open ? (
        <ComposerAddPanel
          id={add.panelId}
          label={addLabel}
          upload={add.upload}
          sections={addMenu.sections}
          labels={extras}
          buttonRef={add.buttonRef}
          onClose={add.close}
        />
      ) : null}
      {mention.open ? (
        <MentionMenu
          controller={mention}
          label={mentionsLabel ?? extras.mentions}
          emptyText={mentionsEmptyText ?? extras.mentionsEmpty}
          loadingText={extras.loading}
          loading={mentionsLoading}
        />
      ) : null}
      {slash.open ? (
        <SlashCommandMenu
          commands={slash.matches}
          activeIndex={slash.activeIndex}
          listboxId={slash.listboxId}
          optionId={slash.optionId}
          label={commandsLabel}
          emptyText={commandsEmptyText}
          manageLabel={slash.hasManage ? manageCommandsLabel : undefined}
          onPick={slash.pick}
          onHighlight={slash.highlight}
        />
      ) : null}
    </Box>
  );
}
