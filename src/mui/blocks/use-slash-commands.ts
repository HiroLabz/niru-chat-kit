"use client";

/**
 * The state machine behind the composer's slash-command list: which command is being typed
 * (from the text and the caret), which rows match, which is highlighted, and what the
 * keys do. `SlashCommandMenu` is the view. Focus never leaves the text box; the highlight
 * is announced through `aria-activedescendant`.
 */

import {
  useCallback,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type Ref,
} from "react";
import { applySlashCommand, matchSlashCommands, slashQuery, type SlashCommand } from "../../core/slash-commands";

type InputElement = HTMLTextAreaElement | HTMLInputElement;

export type SlashCommandsController = {
  open: boolean;
  /** The commands that match what is typed, in list order. */
  matches: SlashCommand[];
  /** Highlighted row: an index into `matches`, `matches.length` for the manage row, -1 for none. */
  activeIndex: number;
  activeId: string | undefined;
  listboxId: string;
  optionId: (index: number) => string;
  /** Whether the list ends with the manage row. */
  hasManage: boolean;
  /** Picks a row (a command, or the manage row); a disabled row does nothing. */
  pick: (index: number) => void;
  highlight: (index: number) => void;
  handleKeyDown: (event: KeyboardEvent<InputElement>) => void;
  /** Dismisses the list for the text that produced it, same as Escape. */
  close: () => void;
  /** Merge into the textarea's own `ref` (it also keeps the caller's `inputRef`). */
  inputRef: Ref<InputElement>;
  /** Native attributes and handlers for the textarea; empty of ARIA when no commands were passed. */
  inputProps: Record<string, unknown>;
};

export function useSlashCommands({
  value,
  onChange,
  commands,
  onCommand,
  onManage,
  inputRef: callerRef,
}: {
  value: string;
  onChange: (value: string) => void;
  commands?: SlashCommand[];
  onCommand?: (command: SlashCommand) => void;
  onManage?: () => void;
  inputRef?: Ref<InputElement>;
}): SlashCommandsController {
  const listboxId = useId();
  const input = useRef<InputElement | null>(null);
  const pendingCaret = useRef<number | null>(null);
  const [caret, setCaret] = useState(value.length);
  const [closedAtValue, setClosedAtValue] = useState<string | null>(null);
  const [chosen, setChosen] = useState<{ key: string; index: number } | null>(null);

  const range = commands?.length ? slashQuery(value, Math.min(caret, value.length)) : null;
  const matches = useMemo(() => (range && commands ? matchSlashCommands(commands, range.query) : []), [commands, range?.query]); // eslint-disable-line react-hooks/exhaustive-deps
  const open = range !== null && closedAtValue !== value;
  const hasManage = Boolean(onManage);
  const rowCount = matches.length + (hasManage ? 1 : 0);

  const selectable = useMemo(() => {
    const rows: number[] = [];
    matches.forEach((command, index) => {
      if (!command.disabled) rows.push(index);
    });
    if (hasManage) rows.push(matches.length);
    return rows;
  }, [matches, hasManage]);

  // The highlight starts on the first command that can be picked and restarts whenever the
  // matching rows change; the manage row is never the starting point.
  const key = `${range?.query ?? ""}\u0000${matches.map((command) => command.id).join("\u0000")}`;
  const firstCommand = matches.findIndex((command) => !command.disabled);
  const activeIndex = !open ? -1 : chosen?.key === key && chosen.index < rowCount ? chosen.index : firstCommand;
  const optionId = useCallback((index: number) => `${listboxId}-option-${index}`, [listboxId]);

  const sync = useCallback(() => {
    const node = input.current;
    if (node && typeof node.selectionStart === "number") setCaret(node.selectionStart);
  }, []);

  // After a pick the new text lands on the next render; put the caret where the template ends.
  useLayoutEffect(() => {
    const node = input.current;
    if (node && pendingCaret.current !== null) {
      node.focus();
      node.setSelectionRange(pendingCaret.current, pendingCaret.current);
      pendingCaret.current = null;
    }
    sync();
  }, [value, sync]);

  const setInput = useCallback(
    (node: InputElement | null) => {
      input.current = node;
      if (typeof callerRef === "function") callerRef(node);
      else if (callerRef) (callerRef as { current: InputElement | null }).current = node;
    },
    [callerRef]
  );

  function pick(index: number): void {
    if (!open) return;
    if (index === matches.length && hasManage) {
      setClosedAtValue(value);
      onManage?.();
      return;
    }
    const command = matches[index];
    if (!range || !command || command.disabled) return;
    const next = applySlashCommand(value, range, command);
    setClosedAtValue(next.text);
    onChange(next.text);
    if (next.text === value && input.current) {
      input.current.focus();
      input.current.setSelectionRange(next.caret, next.caret);
    } else {
      pendingCaret.current = next.caret;
    }
    onCommand?.(command);
  }

  function highlight(index: number): void {
    if (selectable.includes(index)) setChosen({ key, index });
  }

  function move(step: number): void {
    if (!selectable.length) return;
    const at = selectable.indexOf(activeIndex);
    const next = at < 0 ? (step > 0 ? 0 : selectable.length - 1) : (at + step + selectable.length) % selectable.length;
    setChosen({ key, index: selectable[next] });
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
        if (!selectable.length) return;
        swallow();
        setChosen({ key, index: event.key === "Home" ? selectable[0] : selectable[selectable.length - 1] });
        return;
      case "Escape":
        swallow();
        setClosedAtValue(value);
        return;
      case "Enter":
      case "Tab": {
        if (event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) return;
        // With no match, Enter sends the text as it is and Tab moves focus on; unless the
        // manage row was highlighted, which is a row like any other.
        if (!matches.length && activeIndex < 0) return;
        if (event.key === "Tab" && activeIndex < 0) return;
        swallow();
        if (activeIndex >= 0) pick(activeIndex);
        return;
      }
    }
  }

  const aria: Record<string, unknown> = commands
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
    activeId: activeIndex >= 0 ? optionId(activeIndex) : undefined,
    listboxId,
    optionId,
    hasManage,
    pick,
    highlight,
    handleKeyDown,
    close: () => setClosedAtValue(value),
    inputRef: setInput,
    inputProps: commands ? { ...aria, onSelect: sync, onKeyUp: sync, onClick: sync } : {},
  };
}
