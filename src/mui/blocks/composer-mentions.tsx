"use client";

/**
 * `@` mentions in the composer: the state behind the list (which `@query` is being typed from
 * the text and the caret, which rows match, which is highlighted, what the keys do) and the
 * list itself. It follows the slash list: focus never leaves the text box, the highlight is
 * announced through `aria-activedescendant`, and the list floats above the box.
 */

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type Ref,
} from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import { applyMention, matchMentions, mentionQuery, type ComposerMention } from "../../core/mentions";
import { useChatKitStyles } from "../theme";

type InputElement = HTMLTextAreaElement | HTMLInputElement;

/**
 * Events after which the caret may have moved without the text changing. NOT `input`: a state update from a native `input`
 * listener is flushed before React's own change handler runs, React then writes the old text back into the field, sees no
 * change, and the typed character is lost (seen live: real key presses dropped characters). A text change is followed
 * through the `value` prop instead.
 */
const CARET_EVENTS = ["select", "keyup", "click", "focus"] as const;

export type MentionsController = {
  open: boolean;
  matches: ComposerMention[];
  activeIndex: number;
  listboxId: string;
  optionId: (index: number) => string;
  pick: (index: number) => void;
  highlight: (index: number) => void;
  handleKeyDown: (event: KeyboardEvent<InputElement>) => void;
  /** Dismisses the list for the text that produced it, same as Escape. */
  close: () => void;
  /** Merge into the textarea's own `ref`; it also forwards to the `inputRef` it was given. */
  inputRef: Ref<InputElement>;
  /** ARIA for the textarea; empty when no `mentions` were passed. */
  inputProps: Record<string, unknown>;
};

export function useMentions({
  value,
  onChange,
  mentions,
  onMention,
  suppressed,
  inputRef: callerRef,
}: {
  value: string;
  onChange: (value: string) => void;
  mentions?: ComposerMention[];
  onMention?: (item: ComposerMention) => void;
  /** True while another list owns the box (the slash list): this one stays closed. */
  suppressed?: boolean;
  inputRef?: Ref<InputElement>;
}): MentionsController {
  const listboxId = useId();
  const input = useRef<InputElement | null>(null);
  const detach = useRef<(() => void) | null>(null);
  const pendingCaret = useRef<number | null>(null);
  const [caret, setCaret] = useState(value.length);
  const [closedAtValue, setClosedAtValue] = useState<string | null>(null);
  const [chosen, setChosen] = useState<{ key: string; index: number } | null>(null);

  const range = mentions && !suppressed ? mentionQuery(value, Math.min(caret, value.length)) : null;
  const matches = useMemo(() => (range && mentions ? matchMentions(mentions, range.query) : []), [mentions, range?.query]); // eslint-disable-line react-hooks/exhaustive-deps
  // Spaces are allowed while something still matches (a label can hold spaces); with nothing left to match they end it.
  // A whole label followed by a space is a finished mention (typed out, or put in by the app): the list stays closed.
  const finished =
    range !== null && /\s$/.test(range.query) && (mentions ?? []).some((item) => item.label.toLowerCase() === range.query.trimEnd().toLowerCase());
  const open = range !== null && !finished && closedAtValue !== value && (matches.length > 0 || !/\s/.test(range.query));

  const key = `${range?.query ?? ""}\u0000${matches.map((item) => item.id).join("\u0000")}`;
  const activeIndex = !open || !matches.length ? -1 : chosen?.key === key && chosen.index < matches.length ? chosen.index : 0;
  const optionId = useCallback((index: number) => `${listboxId}-option-${index}`, [listboxId]);

  const latestValue = useRef(value);
  latestValue.current = value;
  const sync = useCallback(() => {
    const node = input.current;
    // While the field holds text React has not taken yet, a re-render would write the old text back: wait for the value to arrive.
    if (!node || node.value !== latestValue.current) return;
    if (typeof node.selectionStart === "number") setCaret(node.selectionStart);
  }, []);

  useLayoutEffect(() => {
    const node = input.current;
    if (node && pendingCaret.current !== null) {
      node.focus();
      node.setSelectionRange(pendingCaret.current, pendingCaret.current);
      pendingCaret.current = null;
    }
    sync();
  }, [value, sync]);

  // The caret moves without the text changing (arrows, a click); listen on the field itself so the slash list's own props stay as they are.
  const setInput = useCallback(
    (node: InputElement | null) => {
      detach.current?.();
      detach.current = null;
      input.current = node;
      if (node) {
        CARET_EVENTS.forEach((name) => node.addEventListener(name, sync));
        detach.current = () => CARET_EVENTS.forEach((name) => node.removeEventListener(name, sync));
      }
      if (typeof callerRef === "function") callerRef(node);
      else if (callerRef) (callerRef as { current: InputElement | null }).current = node;
    },
    [callerRef, sync]
  );
  useEffect(() => () => detach.current?.(), []);

  function pick(index: number): void {
    const item = matches[index];
    if (!open || !range || !item) return;
    const next = applyMention(value, range, item);
    setClosedAtValue(next.value);
    onChange(next.value);
    if (next.value === value && input.current) {
      input.current.focus();
      input.current.setSelectionRange(next.caret, next.caret);
    } else {
      pendingCaret.current = next.caret;
    }
    onMention?.(item);
  }

  function move(step: number): void {
    if (!matches.length) return;
    const base = activeIndex < 0 ? (step > 0 ? -1 : 0) : activeIndex;
    setChosen({ key, index: (base + step + matches.length) % matches.length });
  }

  function handleKeyDown(event: KeyboardEvent<InputElement>): void {
    if (!open || event.nativeEvent.isComposing) return;
    const swallow = () => {
      event.preventDefault();
      event.stopPropagation();
    };
    switch (event.key) {
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
        if (!matches.length) return;
        swallow();
        setChosen({ key, index: event.key === "Home" ? 0 : matches.length - 1 });
        return;
      case "Escape":
        swallow();
        setClosedAtValue(value);
        return;
      case "Enter":
      case "Tab":
        if (event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) return;
        // With no match, Enter sends the text as it is and Tab moves focus on.
        if (activeIndex < 0) return;
        swallow();
        pick(activeIndex);
        return;
    }
  }

  const inputProps: Record<string, unknown> = mentions
    ? {
        role: "combobox",
        "aria-autocomplete": "list",
        ...(open
          ? { "aria-expanded": true, "aria-controls": listboxId, "aria-activedescendant": activeIndex >= 0 ? optionId(activeIndex) : undefined }
          : {}),
      }
    : {};

  return {
    open,
    matches,
    activeIndex,
    listboxId,
    optionId,
    pick,
    highlight: (index) => setChosen({ key, index }),
    handleKeyDown,
    close: () => setClosedAtValue(value),
    inputRef: setInput,
    inputProps,
  };
}

const MAX_VISIBLE_ROWS = 8;
const ROW_HEIGHT_EM = 2.5;

export function MentionMenu({
  controller,
  label,
  emptyText,
  loadingText,
  loading,
}: {
  controller: MentionsController;
  label: string;
  emptyText: string;
  loadingText: string;
  loading?: boolean;
}) {
  const { scheme } = useChatKitStyles();
  const listRef = useRef<HTMLDivElement | null>(null);
  const { matches, activeIndex, listboxId, optionId } = controller;

  useEffect(() => {
    const row = listRef.current?.querySelector('[aria-selected="true"]') as HTMLElement | null;
    row?.scrollIntoView?.({ block: "nearest" });
  }, [activeIndex]);

  // A press on the list (a row or its scrollbar) must not take focus from the text box.
  const keepFocus = (event: MouseEvent) => event.preventDefault();

  let previousGroup: string | undefined;
  const rows = matches.map((item, index) => {
    const heading = item.group && item.group !== previousGroup ? item.group : null;
    previousGroup = item.group;
    return (
      <Box key={item.id}>
        {heading ? (
          <Typography
            role="presentation"
            variant="caption"
            sx={scheme((c) => ({ display: "block", px: 1, pt: 0.75, pb: 0.25, fontWeight: 600, color: c.mutedText }))}
          >
            {heading}
          </Typography>
        ) : null}
        <Box
          id={optionId(index)}
          role="option"
          aria-selected={index === activeIndex}
          onMouseEnter={() => controller.highlight(index)}
          onClick={() => controller.pick(index)}
          sx={scheme((c) => ({
            display: "flex",
            alignItems: "center",
            gap: 1,
            px: 1,
            minHeight: `${ROW_HEIGHT_EM}em`,
            py: 0.5,
            borderRadius: 1,
            cursor: "pointer",
            color: c.text,
            bgcolor: index === activeIndex ? c.muted : "transparent",
          }))}
        >
          {item.icon ? <Box sx={{ display: "inline-flex", flexShrink: 0 }}>{item.icon}</Box> : null}
          <Typography component="span" variant="body2" noWrap sx={{ fontWeight: 500, flexShrink: 0, maxWidth: "60%" }}>
            {item.label}
          </Typography>
          {item.description ? (
            <Typography component="span" variant="body2" noWrap sx={scheme((c) => ({ color: c.mutedText, minWidth: 0 }))}>
              {item.description}
            </Typography>
          ) : null}
        </Box>
      </Box>
    );
  });

  return (
    <Paper
      ref={listRef}
      id={listboxId}
      role="listbox"
      aria-label={label}
      elevation={8}
      data-chat="mentions"
      onMouseDown={keepFocus}
      sx={scheme((c) => ({
        bgcolor: c.surface,
        color: c.text,
        position: "absolute",
        left: 0,
        right: 0,
        bottom: "100%",
        mb: 1,
        zIndex: 1,
        p: 0.5,
        maxHeight: `${MAX_VISIBLE_ROWS * ROW_HEIGHT_EM + 1}em`,
        overflowY: "auto",
      }))}
    >
      {rows}
      {loading ? (
        <Typography role="status" variant="body2" sx={scheme((c) => ({ px: 1, py: 0.75, color: c.mutedText }))}>
          {loadingText}
        </Typography>
      ) : null}
      {!matches.length && !loading ? (
        <Typography role="presentation" variant="body2" sx={scheme((c) => ({ px: 1, py: 0.75, color: c.mutedText }))}>
          {emptyText}
        </Typography>
      ) : null}
    </Paper>
  );
}
