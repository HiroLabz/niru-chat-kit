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
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from "react";
import Box from "@mui/material/Box";
import type { BoxProps } from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Collapse from "@mui/material/Collapse";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { alpha, darken } from "@mui/material/styles";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import AttachFileOutlinedIcon from "@mui/icons-material/AttachFileOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import StopRoundedIcon from "@mui/icons-material/StopRounded";
import TuneOutlinedIcon from "@mui/icons-material/TuneOutlined";
import { PromptInput } from "../primitives/prompt-input";
import { useChatKitStyles } from "../theme";
import type { DataAttributes } from "./data-attributes";
import { ComposerSuggestionsList, useComposerSuggestions } from "./composer-suggestions";

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

export type ComposerAttachment = {
  id: string;
  name: string;
};

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
  trailing,
  endActions,
  maxRows = MAX_FIELD_ROWS,
  autoFocus = false,
  suggestions = NO_SUGGESTIONS,
  inputRef,
  rootProps,
}: ComposerProps) {
  const { scheme } = useChatKitStyles();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsId = useId();
  const fileInput = useRef<HTMLInputElement | null>(null);
  const composerRootRef = useRef<HTMLDivElement | null>(null);
  const canSend = value.trim().length > 0 && !disabled && !busy;
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

  return (
    // `position: relative` anchor for the floating suggestions list below: it is a sibling
    // of `PromptInput`'s own bordered box, not a child, so that box's height never depends
    // on whether a suggestion is showing.
    <Box ref={composerRootRef} sx={{ position: "relative" }}>
      <PromptInput
        value={value}
        onValueChange={onChange}
        onSubmit={onSubmit}
        isLoading={busy}
        disabled={disabled}
        maxRows={maxRows}
        slotProps={{ root: { onKeyDown: handleEscape, ...rootProps } }}
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
        {attachments.length ? (
          <Stack direction="row" spacing={0.75} sx={{ flexWrap: "wrap", rowGap: 0.75, mb: 1 }}>
            {attachments.map((attachment) => (
              <Chip
                key={attachment.id}
                size="small"
                variant="outlined"
                icon={<DescriptionOutlinedIcon fontSize="small" />}
                label={attachment.name}
                onDelete={onRemoveAttachment ? () => onRemoveAttachment(attachment.id) : undefined}
                sx={scheme((c) => ({ color: c.text, borderColor: c.border }))}
              />
            ))}
          </Stack>
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

        <PromptInput.Textarea
          placeholder={placeholder}
          autoFocus={autoFocus}
          onKeyDown={composerSuggestions.handleKeyDown}
          sx={{ px: 0.5, fontSize: 15, lineHeight: 1.55, color: "inherit", fontFamily: "inherit" }}
          slotProps={{
            input: {
              inputRef,
              inputProps: {
                "aria-expanded": composerSuggestions.open,
                "aria-controls": composerSuggestions.open ? composerSuggestions.listboxId : undefined,
                "aria-activedescendant": composerSuggestions.activeId,
              },
            },
          }}
        />

        <PromptInput.Actions sx={{ mt: 0.75 }}>
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
            <PromptInput.Action tooltip="Attach a document">
              <IconButton
                size="small"
                aria-label="Attach a document"
                disabled={disabled}
                onClick={() => fileInput.current?.click()}
              >
                <AttachFileOutlinedIcon fontSize="small" />
              </IconButton>
            </PromptInput.Action>
          ) : null}

          {trailing}

          <Box sx={{ flexGrow: 1 }} />

          {endActions}

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
            <PromptInput.Action tooltip={canSend ? "Send" : "Write a message to send"}>
              <IconButton
                size="small"
                aria-label="Send"
                disabled={!canSend}
                onClick={onSubmit}
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
