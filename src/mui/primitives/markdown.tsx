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
import { useChatKitStyles } from "../theme";
import { CodeBlock } from "./code-block";
import { Image } from "./image";
import { MarkdownTable } from "./markdown-table";
import { markdownStyles } from "./markdown-styles";
import { sxArray } from "./sx";

export { markdownStyles };

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
  table: MarkdownTable,
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
