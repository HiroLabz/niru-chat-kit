"use client";

import { createContext, isValidElement, memo, useContext, useId, useMemo, type ReactNode } from "react";
import { marked } from "marked";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import Box from "@mui/material/Box";
import type { SxProps, Theme } from "@mui/material/styles";
import {
  hasMathDelimiter,
  joinMathBlocks,
  normalizeMathDelimiters,
} from "../../core/markdown/math-delimiters";
import { useMathPlugins, type MathPlugins } from "../../core/markdown/math-plugins";
import type { ChatKitColorTokens, ChatKitTokens } from "../../core/tokens";
import { useChatKitStyles } from "../theme";
import { CodeBlock } from "./code-block";
import { Image } from "./image";
import { sxArray } from "./sx";

function flattenToText(node: ReactNode): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(flattenToText).join("");
  if (isValidElement(node)) {
    return flattenToText((node.props as { children?: ReactNode }).children);
  }
  return "";
}

/**
 * `pre` unwraps: `CodeBlock` (reached through the `code` override below)
 * renders its own `<pre>`, so react-markdown's would otherwise double-wrap
 * a fenced block.
 */
const defaultComponents: Components = {
  pre({ children }) {
    return <>{children}</>;
  },
  code({ className, children }) {
    const text = flattenToText(children).replace(/\n$/, "");
    const languageMatch = /language-(\S+)/.exec(className ?? "");
    const isBlock = Boolean(languageMatch) || text.includes("\n");
    if (isBlock) {
      return <CodeBlock code={text} language={languageMatch?.[1]} />;
    }
    return <code>{children}</code>;
  },
  // `src` has already passed react-markdown's default URL sanitising by the time
  // it reaches an override, so a `javascript:` source never arrives here as a
  // usable string: guarding on it being a non-empty string is enough.
  img({ src, alt }) {
    if (typeof src !== "string" || src.length === 0) return null;
    return <Image src={src} alt={alt} />;
  },
};

/**
 * Element overrides the host app supplies once for every markdown the kit renders (messages,
 * timelines). The web app uses it to put an image policy on `img`: model-written images load
 * only from allowed hosts and anything else waits behind a "Load image" button.
 */
const MarkdownComponentsContext = createContext<Partial<Components> | undefined>(undefined);

export function MarkdownComponentsProvider({
  components,
  children,
}: {
  components: Partial<Components>;
  children: ReactNode;
}) {
  return <MarkdownComponentsContext.Provider value={components}>{children}</MarkdownComponentsContext.Provider>;
}

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
    // A table cannot wrap its way into a narrow column the way a paragraph can: a chat
    // bubble can be ~254px wide, so eight columns of `display: table` were squeezed to
    // ~30px each and every cell broke one character per line. `display: block` +
    // `width: max-content` lets the table keep its natural column widths and scroll on
    // its own axis instead, exactly as `pre` above already does.
    "& table": {
      borderCollapse: "collapse",
      my: 1,
      display: "block",
      width: "max-content",
      maxWidth: "100%",
      overflowX: "auto",
    },
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

type MarkdownBlockProps = {
  content: string;
  /** Loaded maths plugins; `null` renders plain markdown. */
  math?: MathPlugins | null;
  components?: Partial<Components>;
  /** Test-only: called on every render of this block, to verify memoisation. */
  onRender?: () => void;
};

/**
 * One top-level markdown block (heading, paragraph, list, fenced code, ...).
 * Memoised on `content` alone: `onRender` is excluded from the comparison on purpose,
 * since it is only an instrumentation hook for tests and a new closure on every parent
 * render must not defeat the memo it is measuring.
 */
export const MarkdownBlock = memo(
  function MarkdownBlock({ content, math, components, onRender }: MarkdownBlockProps) {
    onRender?.();
    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm, ...(math?.remarkPlugins ?? [])]}
        rehypePlugins={math?.rehypePlugins}
        components={components ? { ...defaultComponents, ...components } : defaultComponents}
      >
        {content}
      </ReactMarkdown>
    );
  },
  (prev, next) =>
    prev.content === next.content && prev.math === next.math && prev.components === next.components
);

/**
 * Assistant markdown, split into `marked`'s top-level block tokens so a
 * streaming reply only re-renders the block that is still growing.
 * react-markdown reruns its whole remark pipeline on every render; here
 * each settled block keeps its rendered output across the rest of the stream.
 *
 * Never renders raw HTML (no `rehype-raw`) and keeps react-markdown's default
 * URL sanitising: the only injected HTML in this tree is shiki's own output
 * for a code string, inside `CodeBlock`.
 */
export function Markdown({
  children,
  id,
  sx,
  className,
  components,
  onBlockRender,
}: {
  children: string;
  id?: string;
  sx?: SxProps<Theme>;
  className?: string;
  /** Replaces react-markdown elements by name, over the kit's own code, pre and img. */
  components?: Partial<Components>;
  /** Test-only hook: called with a block's index whenever that block renders. */
  onBlockRender?: (index: number) => void;
}) {
  const autoId = useId();
  const provided = useContext(MarkdownComponentsContext);
  const merged = useMemo(
    () => (provided || components ? { ...provided, ...components } : undefined),
    [provided, components]
  );
  const blockId = id ?? autoId;
  const { scheme } = useChatKitStyles();
  // KaTeX is only fetched for a message that contains a maths delimiter.
  const math = useMathPlugins(hasMathDelimiter(children));
  const blocks = useMemo(
    () =>
      joinMathBlocks(marked.lexer(math ? normalizeMathDelimiters(children) : children))
        // `marked` emits "space" tokens for the blank lines between blocks;
        // they render nothing and would shift indices away from the content
        // blocks they sit between.
        .filter((raw) => raw.trim().length > 0),
    [children, math]
  );

  return (
    <Box className={className} sx={[scheme(markdownStyles), ...sxArray(sx)]}>
      {blocks.map((raw, index) => (
        <MarkdownBlock
          key={`${blockId}-block-${index}`}
          content={raw}
          math={math}
          components={merged}
          onRender={onBlockRender ? () => onBlockRender(index) : undefined}
        />
      ))}
    </Box>
  );
}

/** The name this component had before it moved into the kit. */
export const ChatMarkdown = Markdown;
