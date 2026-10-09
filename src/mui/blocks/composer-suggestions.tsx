"use client";

/**
 * Autocomplete suggestions shown above `PromptComposer`'s textarea while it has text:
 * prompt-kit's autocomplete block, reimplemented as a controlled MUI listbox rather than
 * owning any DOM focus itself (focus never leaves the textarea).
 *
 * `useComposerSuggestions` is the state machine; `ComposerSuggestionsList` is the view.
 * Keeping them apart lets `composer.tsx` wire the controller's `handleKeyDown`
 * into `PromptInput.Textarea`'s `onKeyDown` passthrough and the controller's ARIA ids
 * into the textarea's native `inputProps`, without growing either file past 400 lines.
 *
 * The list floats above the composer rather than sitting inside its bordered box: a
 * live-check regression had every suggestion push that box taller, so sending a message
 * moved the send button the user had just lined up the cursor over. `composer.tsx`
 * renders this `Paper` as a sibling of the bordered box, absolutely positioned against a
 * `position: relative` wrapper around both, so the box's own height never depends on
 * whether a suggestion is showing.
 */

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import { useChatKitStyles } from "../theme";
import { PromptSuggestion } from "../primitives/prompt-suggestion";

const MAX_SUGGESTIONS = 4;

/** Suggestions containing `query` (case-insensitive), excluding an exact match, capped. */
export function filterSuggestions(
  suggestions: string[],
  query: string,
  limit: number = MAX_SUGGESTIONS
): string[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  const matches: string[] = [];
  for (const suggestion of suggestions) {
    const candidate = suggestion.toLowerCase();
    if (candidate === needle) continue;
    if (!candidate.includes(needle)) continue;
    matches.push(suggestion);
    if (matches.length >= limit) break;
  }
  return matches;
}

export type ComposerSuggestionsController = {
  open: boolean;
  items: string[];
  query: string;
  activeIndex: number;
  activeId: string | undefined;
  listboxId: string;
  optionId: (index: number) => string;
  handleKeyDown: (event: KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => void;
  select: (text: string) => void;
  /** Dismisses the list for the text that produced it, same as Escape — used when a
   *  click lands outside the whole composer. */
  close: () => void;
};

export function useComposerSuggestions({
  value,
  suggestions,
  onFill,
}: {
  value: string;
  suggestions: string[];
  onFill: (text: string) => void;
}): ComposerSuggestionsController {
  const listboxId = useId();
  const query = value.trim();
  const items = useMemo(() => filterSuggestions(suggestions, value), [suggestions, value]);
  const itemsKey = items.join("\u0000");

  const [activeIndex, setActiveIndex] = useState(-1);
  const previousItemsKey = useRef(itemsKey);
  useEffect(() => {
    if (previousItemsKey.current !== itemsKey) {
      previousItemsKey.current = itemsKey;
      setActiveIndex(-1);
    }
  }, [itemsKey]);

  // Escape dismisses the list for the text that produced it; typing further
  // (a different `value`) re-enables it rather than requiring it be reopened.
  const [closedAtValue, setClosedAtValue] = useState<string | null>(null);
  const open = items.length > 0 && closedAtValue !== value;

  function optionId(index: number): string {
    return `${listboxId}-option-${index}`;
  }

  function select(text: string): void {
    onFill(text);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>): void {
    if (!open) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      event.stopPropagation();
      setActiveIndex((current) => (current + 1) % items.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      event.stopPropagation();
      setActiveIndex((current) => (current <= 0 ? items.length - 1 : current - 1));
      return;
    }

    if (event.key === "Enter") {
      // IME confirmation Enter never fills or sends; let it fall through so
      // the textarea's own composition guard is the single source of truth.
      if (event.nativeEvent.isComposing) return;
      if (activeIndex < 0 || activeIndex >= items.length) return;
      event.preventDefault();
      event.stopPropagation();
      select(items[activeIndex]);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      setClosedAtValue(value);
    }
  }

  function close(): void {
    setClosedAtValue(value);
  }

  return {
    open,
    items,
    query,
    activeIndex,
    activeId: activeIndex >= 0 ? optionId(activeIndex) : undefined,
    listboxId,
    optionId,
    handleKeyDown,
    select,
    close,
  };
}

/** Suggestions are already capped at 4 (`MAX_SUGGESTIONS`); this is a safety net so a
 *  caller passing a larger `limit` still gets a floating panel, not an ever-growing one. */
const MAX_VISIBLE_ROWS = 4;
const ROW_HEIGHT_EM = 2.5;

export function ComposerSuggestionsList({
  controller,
}: {
  controller: ComposerSuggestionsController;
}) {
  const { scheme } = useChatKitStyles();
  if (!controller.open) return null;

  return (
    <Paper
      id={controller.listboxId}
      role="listbox"
      aria-label="Prompt suggestions"
      elevation={8}
      // Floats above the composer's bordered box rather than living inside it (the box
      // must never grow when a suggestion appears), anchored by the `position: relative`
      // wrapper `composer.tsx` renders around both. One suggestion per line,
      // left-aligned (prompt-kit's own autocomplete block layout), not a wrapped row of
      // pills: with `PromptSuggestion`'s `"row"` variant a wrapped row would cut each
      // suggestion's width unpredictably, and arrow-key order would stop lining up with
      // reading order the moment two rows of pills formed.
      sx={scheme((c) => ({
        bgcolor: c.surface,
        color: c.text,
        position: "absolute",
        left: 0,
        right: 0,
        bottom: "100%",
        mb: 1,
        display: "flex",
        flexDirection: "column",
        gap: 0.25,
        p: 0.5,
        maxHeight: `${MAX_VISIBLE_ROWS * ROW_HEIGHT_EM}em`,
        overflowY: "auto",
      }))}
    >
      {controller.items.map((item, index) => (
        <Box
          key={item}
          id={controller.optionId(index)}
          role="option"
          aria-selected={index === controller.activeIndex}
        >
          <PromptSuggestion
            highlight={controller.query}
            onSelect={controller.select}
            sx={
              index === controller.activeIndex
                ? scheme((c) => ({ bgcolor: c.muted }))
                : undefined
            }
          >
            {item}
          </PromptSuggestion>
        </Box>
      ))}
    </Paper>
  );
}
