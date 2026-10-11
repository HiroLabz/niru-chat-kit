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
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from "react";
import Box from "@mui/material/Box";
import type { BoxProps } from "@mui/material/Box";
import Collapse from "@mui/material/Collapse";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { alpha, darken } from "@mui/material/styles";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import AttachFileOutlinedIcon from "@mui/icons-material/AttachFileOutlined";
import StopRoundedIcon from "@mui/icons-material/StopRounded";
import TuneOutlinedIcon from "@mui/icons-material/TuneOutlined";
import { PromptInput } from "../primitives/prompt-input";
import { useChatKitStyles } from "../theme";
import type { DataAttributes } from "./data-attributes";
import { ComposerSuggestionsList, useComposerSuggestions } from "./composer-suggestions";
import { ComposerAttachmentList, type ComposerAttachment } from "./composer-attachments";
import { ComposerCallButton } from "./composer-call";
import { ComposerMicButton, ComposerVoiceStatus, useComposerVoice } from "./composer-voice";
import { ComposerMoreMenu, ComposerToggles, type ComposerToggle } from "./composer-toggles";

export type { ComposerAttachment } from "./composer-attachments";
export type { ComposerToggle } from "./composer-toggles";

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

const NO_SUGGESTIONS: string[] = [];

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
  /** Shows a mic toggle that dictates into the box, where the browser supports speech recognition. Default: off. */
  voice?: boolean;
  /** The dictation language as a BCP 47 tag, for example `en-PH`. Default: the browser's. */
  voiceLang?: string;
  /** On/off chips in the actions row (for example "Search the web"), after the attach button. */
  toggles?: ComposerToggle[];
  /** Extra controls (menu items) shown behind a "More" button in the actions row. */
  moreActions?: ReactNode;
  /** The "More" button's accessible name; default "More". */
  moreLabel?: string;
  /** Shows a round call button in the actions row, just before Send. Omit it while a call is running. */
  onStartCall?: () => void;
  /** The call button's tooltip and accessible name; default "Start a call". */
  callLabel?: string;
  /** Greys the call button only. */
  callDisabled?: boolean;
};

export function Composer({
  value,
  onChange,
  onSubmit,
  onStop,
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
  attachmentNotice,
  trailing,
  endActions,
  maxRows = MAX_FIELD_ROWS,
  autoFocus = false,
  suggestions = NO_SUGGESTIONS,
  inputRef,
  rootProps,
  voice: voiceEnabled = false,
  voiceLang,
  toggles,
  moreActions,
  moreLabel,
  onStartCall,
  callLabel,
  callDisabled,
}: ComposerProps) {
  const { scheme } = useChatKitStyles();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsId = useId();
  const fileInput = useRef<HTMLInputElement | null>(null);
  const composerRootRef = useRef<HTMLDivElement | null>(null);
  const canSend = value.trim().length > 0 && !disabled && !busy;
  const voice = useComposerVoice({ enabled: voiceEnabled, value, onChange, lang: voiceLang });
  const stopVoice = voice.stop;
  /** Sending ends any dictation, so words heard after Send do not land in the next draft. */
  const submit = useCallback(() => {
    stopVoice();
    onSubmit();
  }, [stopVoice, onSubmit]);
  const composerSuggestions = useComposerSuggestions({
    value,
    suggestions,
    onFill: onChange,
  });

  /** Escape closes the sheet here rather than reaching the panel that hosts the composer. */
  function handleEscape(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Escape" || !settingsOpen) return;
    event.stopPropagation();
    setSettingsOpen(false);
  }

  // The floating suggestions list closes on a click anywhere outside the composer, like any
  // combobox popup; a ref keeps this listener current without re-subscribing per keystroke.
  const suggestionsRef = useRef(composerSuggestions);
  useEffect(() => {
    suggestionsRef.current = composerSuggestions;
  }, [composerSuggestions]);
  useEffect(() => {
    if (!composerSuggestions.open) return;
    function handlePointerDown(event: MouseEvent) {
      if (composerRootRef.current?.contains(event.target as Node)) return;
      suggestionsRef.current.close();
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [composerSuggestions.open]);

  function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length && onAttach) onAttach(files);
    event.target.value = "";
  }

  /** Files on the clipboard (a screenshot, a copied image or files) attach; plain text pastes as text. */
  function handlePaste(event: ClipboardEvent<HTMLDivElement>) {
    if (!onAttach || disabled) return;
    const data = event.clipboardData;
    if (!data) return;
    let files = Array.from(data.files ?? []);
    if (!files.length) {
      files = Array.from(data.items ?? [])
        .filter((item) => item.kind === "file")
        .map((item) => item.getAsFile())
        .filter((file): file is File => file !== null);
    }
    if (!files.length) return;
    event.preventDefault();
    onAttach(files);
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
        {attachmentNotice ? (
          <Typography variant="body2" role="status" sx={scheme((c) => ({ mb: 1, color: c.mutedText }))}>
            {attachmentNotice}
          </Typography>
        ) : null}
        <ComposerAttachmentList attachments={attachments} onRemoveAttachment={onRemoveAttachment} />

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

        <PromptInput.Textarea
          placeholder={placeholder}
          autoFocus={autoFocus}
          onKeyDown={composerSuggestions.handleKeyDown}
          sx={{ px: 0.5, fontSize: 15, lineHeight: 1.55, color: "inherit", fontFamily: "inherit" }}
          slotProps={{
            input: {
              ...({ "data-chat": "composer-field" } as object),
              inputRef,
              inputProps: {
                "data-chat": "composer-input",
                "aria-expanded": composerSuggestions.open,
                "aria-controls": composerSuggestions.open ? composerSuggestions.listboxId : undefined,
                "aria-activedescendant": composerSuggestions.activeId,
              },
            },
          }}
        />

        <ComposerVoiceStatus voice={voice} />

        <PromptInput.Actions sx={{ mt: 0.75 }} slotProps={{ root: { "data-chat": "composer-bar" } as never }}>
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

          {onAttach ? (
            <PromptInput.Action tooltip={attachTooltip ?? attachLabel}>
              <IconButton
                size="small"
                aria-label={attachLabel}
                data-chat="attach"
                disabled={disabled || attachDisabled}
                onClick={() => fileInput.current?.click()}
              >
                <AttachFileOutlinedIcon fontSize="small" />
              </IconButton>
            </PromptInput.Action>
          ) : null}

          <ComposerMicButton voice={voice} disabled={disabled} />

          {toggles?.length ? <ComposerToggles toggles={toggles} disabled={disabled} /> : null}

          {moreActions ? (
            <ComposerMoreMenu label={moreLabel} disabled={disabled}>
              {moreActions}
            </ComposerMoreMenu>
          ) : null}

          {trailing}

          <Box sx={{ flexGrow: 1 }} />

          {endActions}

          <ComposerCallButton onStartCall={onStartCall} label={callLabel} disabled={disabled || callDisabled} />

          {busy && onStop ? (
            <Tooltip title="Stop">
              <IconButton
                size="small"
                aria-label="Stop"
                onClick={onStop}
                sx={scheme((c) => ({ color: c.error }))}
              >
                <StopRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          ) : (
            <PromptInput.Action tooltip={canSend ? "Send" : attachments.length ? "Add a message to send your files" : "Write a message to send"}>
              <IconButton
                size="small"
                aria-label="Send"
                data-chat="send"
                disabled={!canSend}
                onClick={submit}
                sx={scheme((c) => ({
                  bgcolor: c.accent,
                  color: c.accentContrast,
                  "&:hover": { bgcolor: darken(c.accent, 0.15) },
                  "&.Mui-disabled": { bgcolor: c.muted, color: c.mutedText },
                }))}
              >
                <ArrowUpwardIcon fontSize="small" />
              </IconButton>
            </PromptInput.Action>
          )}
        </PromptInput.Actions>

        {onAttach ? (
          <input ref={fileInput} type="file" hidden multiple accept={accept} onChange={handleFiles} />
        ) : null}
      </PromptInput>
      <ComposerSuggestionsList controller={composerSuggestions} />
    </Box>
  );
}
