import type { ChatKitColorTokens, ChatKitTokens } from "../../core/tokens";
import { markdownTableStyles } from "./markdown-table-styles";

/** Theme-aware spacing and colours for rendered markdown, every colour from the tokens. */
export function markdownStyles(c: ChatKitColorTokens, all: ChatKitTokens) {
  return {
    "& > *:first-of-type": { mt: 0 },
    "& > *:last-child": { mb: 0 },
    "& h1, & h2, & h3, & h4": { fontWeight: 700, lineHeight: 1.3, mt: 2, mb: 1 },
    "& h1": { fontSize: "1.4rem" },
    "& h2": { fontSize: "1.2rem" },
    "& h3": { fontSize: "1.05rem" },
    "& p": { my: 1, lineHeight: 1.6 },
    "& ul, & ol": { my: 1, pl: 3 },
    "& li": { my: 0.25 },
    "& a": { color: c.accent },
    "& blockquote": {
      borderLeft: 3,
      borderColor: c.border,
      color: c.mutedText,
      m: 0,
      my: 1,
      pl: 2,
    },
    "& code": {
      fontFamily: all.monoFontFamily,
      fontSize: "0.85em",
      bgcolor: c.codeInlineSurface,
      px: 0.5,
      py: 0.1,
      borderRadius: `${all.radius / 2}px`,
    },
    "& pre": {
      bgcolor: c.codeSurface,
      p: 1.5,
      borderRadius: `${all.radius}px`,
      overflowX: "auto",
      "& code": { bgcolor: "transparent", px: 0, py: 0 },
    },
    ...markdownTableStyles(c),
    // A bubble may set `overflowWrap: anywhere` so a long identifier cannot widen the
    // column. Inside a table that is the wrong trade: the table scrolls now, so cells
    // break on word boundaries like normal text.
    "& th, & td": {
      border: 1,
      borderColor: c.border,
      px: 1,
      py: 0.5,
      overflowWrap: "normal",
    },
    "& img": { maxWidth: "100%" },
    // Maths takes the surrounding text colour; wide display maths scrolls instead of widening.
    "& .katex": { color: "inherit" },
    "& .katex-display": { overflowX: "auto", overflowY: "hidden" },
  } as const;
}
