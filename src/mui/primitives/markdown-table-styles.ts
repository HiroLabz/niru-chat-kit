import type { ChatKitColorTokens } from "../../core/tokens";
import { BREAKOUT_VARIABLES as V } from "./markdown-table-layout";
import { SCROLLBAR_VARIABLE } from "./markdown-table-scroll";

/** Height of a table's horizontal scrollbar, in px: thin, but wide enough to grab with a mouse. */
export const TABLE_SCROLLBAR_PX = 10;

/** How far the edge fade reaches into a table that has more to that side, in px. */
export const TABLE_FADE_PX = 48;

/**
 * A scrollbar that stays drawn. macOS (and any system set to overlay scrollbars) hides a plain
 * scrollbar until the person scrolls, so a table cut off at the edge gave no sign it scrolls.
 * Styling `::-webkit-scrollbar` makes Chromium and Safari draw a classic, always visible bar;
 * the standard `scrollbar-*` properties would turn those rules off in current Chrome, so they
 * are only set where the webkit pseudo-element does not exist (Firefox).
 */
export function visibleScrollbar(c: ChatKitColorTokens) {
  return {
    // `scrollbar-color` is inherited: the transcript's own thin scrollbar would otherwise reach
    // the table and switch its webkit rules off.
    scrollbarColor: "auto",
    scrollbarWidth: "auto",
    "&::-webkit-scrollbar": { height: TABLE_SCROLLBAR_PX, width: TABLE_SCROLLBAR_PX },
    "&::-webkit-scrollbar-track": { backgroundColor: c.muted, borderRadius: TABLE_SCROLLBAR_PX },
    "&::-webkit-scrollbar-thumb": {
      backgroundColor: c.mutedText,
      borderRadius: TABLE_SCROLLBAR_PX,
      border: "2px solid transparent",
      backgroundClip: "content-box",
    },
    "@supports not selector(::-webkit-scrollbar)": {
      scrollbarWidth: "thin",
      scrollbarColor: `${c.mutedText} ${c.muted}`,
    },
  } as const;
}

// The edge fade is a mask: only its alpha matters, so `black` here means "shown", not a colour.
// The second layer keeps the scrollbar's own strip (its thickness measured into a variable)
// unfaded.
const FADE_MASK = {
  "--nck-fade-left": "0px",
  "--nck-fade-right": "0px",
  maskImage: `linear-gradient(to right, transparent, black var(--nck-fade-left), black calc(100% - var(--nck-fade-right)), transparent), linear-gradient(black, black)`,
  maskSize: `100% calc(100% - var(${SCROLLBAR_VARIABLE}, 0px)), 100% var(${SCROLLBAR_VARIABLE}, 0px)`,
  maskPosition: "0 0, 0 100%",
  maskRepeat: "no-repeat",
} as const;

/** Styles for `MarkdownTable`, merged into the markdown styles. */
export function markdownTableStyles(c: ChatKitColorTokens) {
  return {
    "& [data-chat-table]": { my: 1, maxWidth: "100%" },
    // A table cannot wrap its way into a narrow column the way a paragraph can: a chat
    // bubble can be ~254px wide, so eight columns of `display: table` were squeezed to
    // ~30px each and every cell broke one character per line. `width: max-content` lets
    // the table keep its natural column widths and scroll on its own axis instead, exactly
    // as `pre` already does. A table drawn by `MarkdownTable` scrolls inside its frame; any
    // other table (a host's own override) scrolls itself.
    "& table": {
      borderCollapse: "collapse",
      display: "block",
      width: "max-content",
      maxWidth: "100%",
      overflowX: "auto",
    },
    "& table:not([data-chat-table-scroll] > table)": { my: 1 },
    "& [data-chat-table-frame]": { position: "relative", width: "max-content", maxWidth: "100%", minWidth: 0 },
    "& [data-chat-table-body]": { position: "relative" },
    "& [data-chat-table-scroll]": {
      overflowX: "auto",
      overflowY: "hidden",
      ...visibleScrollbar(c),
      "&[data-overflow]": FADE_MASK,
      "&[data-more-left]": { "--nck-fade-left": `${TABLE_FADE_PX}px` },
      "&[data-more-right]": { "--nck-fade-right": `${TABLE_FADE_PX}px` },
      // Room for the Expand button at the end of the header row, so scrolled to the end it
      // covers no text.
      "&[data-overflow] > table > :first-child > tr:first-of-type > :last-child": { paddingInlineEnd: "40px" },
      "&:focus-visible": { outline: `2px solid ${c.accent}`, outlineOffset: 2 },
      "& > table": { display: "table", maxWidth: "none", overflow: "visible" },
    },
    // A second scrollbar above a tall table, so one is in view whichever end the person is at.
    // Touch screens swipe the table itself, and Firefox only draws overlay scrollbars there,
    // so neither gets the (then empty) strip.
    "& [data-chat-table-mirror]": {
      overflowX: "auto",
      overflowY: "hidden",
      mb: 0.5,
      ...visibleScrollbar(c),
      "& > div": { height: "1px" },
      "@media (hover: none) and (pointer: coarse)": { display: "none" },
      "@supports not selector(::-webkit-scrollbar)": { display: "none" },
    },
    "& [data-chat-table-expand]": {
      position: "absolute",
      top: 4,
      insetInlineEnd: 4,
      zIndex: 1,
      bgcolor: c.surface,
      color: c.text,
      border: "1px solid",
      borderColor: c.border,
      "&:hover": { bgcolor: c.muted },
    },
    // Broken out: the wrapper spans the whole wide area (pulled back by the column's offset in
    // it), and two spacers place the table. The table itself never grows past its content.
    '& [data-chat-table][data-breakout="on"]': {
      display: "flex",
      boxSizing: "border-box",
      width: `var(${V.area})`,
      maxWidth: "none",
      marginInlineStart: `calc(-1 * var(${V.pull}))`,
      paddingTop: `var(${V.clear}, 0px)`,
      "&::before": { content: '""', flex: `1 1 var(${V.before})`, maxWidth: `var(${V.pull})` },
      "&::after": { content: '""', flex: `1 1 var(${V.after})` },
      "& > [data-chat-table-frame]": { flex: "0 0 auto", minWidth: 0 },
    },
  } as const;
}
