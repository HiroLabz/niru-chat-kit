"use client";

/**
 * The composer's Add menu: a round plus button in the actions row and a panel above the
 * message box with the upload action first, then the app's sections. The panel is drawn
 * inside the composer's `position: relative` wrapper, like the slash list, so the box never
 * changes height when it opens. It is a `menu` whose rows are real focus stops: arrows move,
 * Home and End jump, Escape closes and puts focus back on the plus button.
 */

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject } from "react";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import { PromptInput } from "../primitives/prompt-input";
import { useChatKitStyles } from "../theme";
import { ADD_STOP, ComposerAddItemRow, ComposerAddNote, ComposerAddSearch, type ComposerAddItem } from "./composer-add-rows";
import type { ComposerExtrasLabels } from "./composer-extras-labels";

export type { ComposerAddItem } from "./composer-add-rows";

export type ComposerAddSection = {
  id: string;
  /** A small heading above the section's items. */
  title?: string;
  items: ComposerAddItem[];
  /** Adds a search field that filters this section's items by label and description. */
  searchable?: boolean;
  /** The search field's placeholder and name; default "Search". */
  searchPlaceholder?: string;
  /** Said when the section has nothing to show (a search with no match, or no items); default "No matches" for a searchable section. */
  emptyText?: string;
  /** Shows a quiet "Loading" row in the section. */
  loading?: boolean;
};

export type ComposerAddMenuOptions = {
  /** The plus button's accessible name and the panel's heading; default "Add". */
  label?: string;
  sections: ComposerAddSection[];
};

/** The open state, ids and upload row the composer needs for its Add menu. `uploadIcon` is the paperclip's icon for the upload row. */
export function useComposerAddMenu({
  disabled,
  canAttach,
  attachLabel,
  attachDisabled,
  attachTooltip,
  uploadIcon,
  openFileChooser,
}: {
  disabled: boolean;
  canAttach: boolean;
  attachLabel: string;
  attachDisabled: boolean;
  attachTooltip?: ReactNode;
  uploadIcon: ReactNode;
  openFileChooser: () => void;
}) {
  const [requested, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const panelId = useId();
  /** The upload row: the paperclip's label and file chooser, offered only when the composer can attach. */
  const upload: ComposerAddItem | undefined =
    canAttach && !disabled
      ? {
          id: "upload",
          label: attachLabel,
          icon: uploadIcon,
          onSelect: openFileChooser,
          disabled: attachDisabled,
          disabledReason: typeof attachTooltip === "string" ? attachTooltip : undefined,
        }
      : undefined;
  return { open: requested && !disabled, toggle: () => setOpen((value) => !value), close: () => setOpen(false), buttonRef, panelId, upload };
}

const PANEL_MAX_WIDTH = 440;
const PANEL_MAX_HEIGHT = 420;

export function ComposerAddButton({
  label,
  open,
  disabled,
  panelId,
  buttonRef,
  onToggle,
}: {
  label: string;
  open: boolean;
  disabled?: boolean;
  panelId: string;
  buttonRef: RefObject<HTMLButtonElement | null>;
  onToggle: () => void;
}) {
  const { scheme } = useChatKitStyles();
  return (
    <PromptInput.Action tooltip={label}>
      <IconButton
        ref={buttonRef}
        size="small"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        data-chat="add"
        disabled={disabled}
        onClick={onToggle}
        sx={scheme((c) => ({ border: 1, borderColor: c.border, color: c.text, "&:hover": { bgcolor: c.muted } }))}
      >
        <AddOutlinedIcon fontSize="small" />
      </IconButton>
    </PromptInput.Action>
  );
}

function matches(item: ComposerAddItem, needle: string): boolean {
  return `${item.label} ${item.description ?? ""}`.toLowerCase().includes(needle);
}

export function ComposerAddPanel({
  id,
  label,
  upload,
  sections,
  labels,
  buttonRef,
  onClose,
}: {
  id: string;
  label: string;
  /** The upload action, first in the panel; absent when the composer cannot attach. */
  upload?: ComposerAddItem;
  sections: ComposerAddSection[];
  labels: ComposerExtrasLabels;
  buttonRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}) {
  const { scheme } = useChatKitStyles();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [queries, setQueries] = useState<Record<string, string>>({});
  const all: ComposerAddSection[] = upload ? [{ id: "__upload", items: [upload] }, ...sections] : sections;

  const stops = () =>
    Array.from(rootRef.current?.querySelectorAll<HTMLElement>(`[${ADD_STOP}]`) ?? []).filter((node) => node.getAttribute("aria-disabled") !== "true");

  useEffect(() => {
    stops()[0]?.focus();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // A press anywhere outside the panel and its button closes it.
  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      onClose();
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [buttonRef, onClose]);

  function close() {
    onClose();
    buttonRef.current?.focus();
  }

  function choose(item: ComposerAddItem) {
    if (item.disabled) return;
    if (!item.keepOpen) close();
    item.onSelect();
  }

  function move(to: number | "first" | "last") {
    const list = stops();
    if (!list.length) return;
    const at = list.indexOf(document.activeElement as HTMLElement);
    const next = to === "first" ? 0 : to === "last" ? list.length - 1 : at < 0 ? (to > 0 ? 0 : list.length - 1) : (at + to + list.length) % list.length;
    list[next].focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    const typing = target.tagName === "INPUT";
    const swallow = () => {
      event.preventDefault();
      event.stopPropagation();
    };
    switch (event.key) {
      case "Escape":
        swallow();
        close();
        return;
      case "Tab":
        swallow();
        close();
        return;
      case "ArrowDown":
        swallow();
        move(1);
        return;
      case "ArrowUp":
        swallow();
        move(-1);
        return;
      case "Home":
      case "End":
        if (typing) return;
        swallow();
        move(event.key === "Home" ? "first" : "last");
        return;
      case "Enter": {
        // In a search field Enter chooses that section's first row; on a row it chooses the row.
        swallow();
        const row = typing ? target.closest("[data-section-box]")?.querySelector<HTMLElement>('[role^="menuitem"]:not([aria-disabled="true"])') : target;
        row?.click();
        return;
      }
    }
  }

  return (
    <Paper
      ref={rootRef}
      id={id}
      role="menu"
      aria-label={label}
      elevation={8}
      data-chat="add-panel"
      onKeyDown={handleKeyDown}
      // A paste into the search field must not reach the composer's own paste handling.
      onPaste={(event) => event.stopPropagation()}
      sx={scheme((c) => ({
        bgcolor: c.surface,
        color: c.text,
        position: "absolute",
        left: 0,
        bottom: "100%",
        mb: 1,
        zIndex: 2,
        width: `min(100%, ${PANEL_MAX_WIDTH}px)`,
        maxHeight: PANEL_MAX_HEIGHT,
        overflowY: "auto",
        p: 0.75,
      }))}
    >
      <Typography variant="subtitle2" role="presentation" sx={{ px: 1, pt: 0.5, pb: 0.75 }}>
        {label}
      </Typography>
      {all.map((section) => {
        const needle = (queries[section.id] ?? "").trim().toLowerCase();
        const items = section.searchable && needle ? section.items.filter((item) => matches(item, needle)) : section.items;
        const emptyText = section.emptyText ?? (section.searchable ? labels.noMatches : undefined);
        const headingId = `${id}-${section.id}`;
        if (!section.searchable && !items.length && !section.loading && !section.emptyText) return null;
        return (
          <Box
            key={section.id}
            role={section.title ? "group" : "presentation"}
            aria-labelledby={section.title ? headingId : undefined}
            data-section-box={section.id}
            sx={{ mt: 0.5 }}
          >
            {section.title ? (
              <Typography id={headingId} variant="caption" sx={scheme((c) => ({ display: "block", px: 1, pt: 0.75, pb: 0.5, fontWeight: 600, color: c.mutedText }))}>
                {section.title}
              </Typography>
            ) : null}
            {section.searchable ? (
              <ComposerAddSearch
                value={queries[section.id] ?? ""}
                onChange={(next) => setQueries((current) => ({ ...current, [section.id]: next }))}
                placeholder={section.searchPlaceholder ?? labels.search}
              />
            ) : null}
            {items.map((item) => (
              <ComposerAddItemRow key={item.id} item={item} onChoose={choose} />
            ))}
            {section.loading ? <ComposerAddNote busy>{labels.loading}</ComposerAddNote> : null}
            {!items.length && !section.loading && emptyText ? <ComposerAddNote>{emptyText}</ComposerAddNote> : null}
          </Box>
        );
      })}
    </Paper>
  );
}
