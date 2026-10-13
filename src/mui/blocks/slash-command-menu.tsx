"use client";

/**
 * The slash-command list shown above the composer's text box: `/name` in a medium weight
 * with the description after it, small group headings, an optional last row that opens the
 * app's command editor. A controlled listbox that owns no focus (see `useSlashCommands`).
 *
 * It floats above the composer's bordered box, absolutely positioned against the
 * `position: relative` wrapper `composer.tsx` renders around both, the same way
 * `ComposerSuggestionsList` does, so the box never changes height when the list appears.
 */

import { useEffect, useRef, type MouseEvent } from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import type { SlashCommand } from "../../core/slash-commands";
import { useChatKitStyles } from "../theme";

/** About this many rows show before the list scrolls. */
const MAX_VISIBLE_ROWS = 8;
const ROW_HEIGHT_EM = 2.5;
/** The list's padding, in theme spacing units (8 px each). */
const LIST_PADDING = 0.5;

export type SlashCommandMenuProps = {
  /** The matching commands, in list order. */
  commands: SlashCommand[];
  /** Highlighted row: an index into `commands`, `commands.length` for the manage row, -1 for none. */
  activeIndex: number;
  listboxId: string;
  optionId: (index: number) => string;
  /** The listbox's accessible name. */
  label: string;
  /** Said in place of rows when nothing matches. */
  emptyText: string;
  /** Text of the last row; omit for no such row. */
  manageLabel?: string;
  onPick: (index: number) => void;
  onHighlight: (index: number) => void;
};

export function SlashCommandMenu({
  commands,
  activeIndex,
  listboxId,
  optionId,
  label,
  emptyText,
  manageLabel,
  onPick,
  onHighlight,
}: SlashCommandMenuProps) {
  const { scheme } = useChatKitStyles();
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const row = listRef.current?.querySelector('[aria-selected="true"]') as HTMLElement | null;
    row?.scrollIntoView?.({ block: "nearest" });
  }, [activeIndex]);

  // A mousedown anywhere on the list (a row or its scrollbar) must not take focus from the text box.
  const keepFocus = (event: MouseEvent) => event.preventDefault();

  const rowSx = (index: number, disabled: boolean) =>
    scheme((c) => ({
      display: "flex",
      alignItems: "baseline",
      gap: 1,
      px: 1,
      minHeight: `${ROW_HEIGHT_EM}em`,
      py: 0.5,
      borderRadius: 1,
      cursor: disabled ? "default" : "pointer",
      opacity: disabled ? 0.5 : 1,
      color: c.text,
      bgcolor: index === activeIndex ? c.muted : "transparent",
    }));

  let previousGroup: string | undefined;
  const rows = commands.map((command, index) => {
    const heading = command.group && command.group !== previousGroup ? command.group : null;
    previousGroup = command.group;
    const disabled = Boolean(command.disabled);
    return (
      <Box key={command.id}>
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
          aria-disabled={disabled}
          onMouseEnter={() => onHighlight(index)}
          onClick={() => onPick(index)}
          sx={rowSx(index, disabled)}
        >
          <Typography component="span" variant="body2" sx={{ fontWeight: 500, flexShrink: 0 }}>
            {`/${command.name}`}
          </Typography>
          {command.description ? (
            <Typography
              component="span"
              variant="body2"
              noWrap
              sx={scheme((c) => ({ color: c.mutedText, minWidth: 0 }))}
            >
              {command.description}
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
        p: LIST_PADDING,
        maxHeight: `${MAX_VISIBLE_ROWS * ROW_HEIGHT_EM + 1}em`,
        overflowY: "auto",
      }))}
    >
      {rows}
      {commands.length === 0 ? (
        <Typography role="presentation" variant="body2" sx={scheme((c) => ({ px: 1, py: 0.75, color: c.mutedText }))}>
          {emptyText}
        </Typography>
      ) : null}
      {manageLabel ? (
        // Stays at the bottom while the commands scroll, so a long list never hides it. The
        // negative offset covers the list's own padding, which rows would otherwise show through.
        <Box
          role="presentation"
          sx={scheme((c) => ({
            position: "sticky",
            bottom: LIST_PADDING * -8,
            pb: LIST_PADDING,
            mb: -LIST_PADDING,
            bgcolor: c.surface,
          }))}
        >
          <Box
            id={optionId(commands.length)}
            role="option"
            aria-selected={activeIndex === commands.length}
            onMouseEnter={() => onHighlight(commands.length)}
            onClick={() => onPick(commands.length)}
            sx={[
              rowSx(commands.length, false),
              scheme((c) => (commands.length ? { mt: 0.5, borderTop: 1, borderColor: c.border, borderRadius: 0 } : {})),
            ]}
          >
            <Typography component="span" variant="body2" sx={scheme((c) => ({ color: c.mutedText }))}>
              {manageLabel}
            </Typography>
          </Box>
        </Box>
      ) : null}
    </Paper>
  );
}
