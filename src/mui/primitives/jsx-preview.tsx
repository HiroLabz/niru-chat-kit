"use client";

import { createElement, useMemo, type ElementType, type ReactNode } from "react";
import Box from "@mui/material/Box";
import type { BoxProps } from "@mui/material/Box";
import { parseJsx, type JsxNode } from "./jsx-parser";

export type JSXPreviewProps = {
  /** The markup an agent wrote. It is parsed, never evaluated. */
  jsx: string;
  /**
   * The components the markup may use, by tag name. Off without it: nothing renders.
   * With it, those components and a fixed set of plain HTML tags render; every other
   * tag shows as text.
   */
  components?: Record<string, ElementType>;
  /** Close any tag still open and hide a half-written one, so a streaming reply stays renderable. */
  isStreaming?: boolean;
  sx?: BoxProps["sx"];
  className?: string;
};

function renderNodes(
  nodes: JsxNode[],
  components: Record<string, ElementType>,
  prefix: string
): ReactNode[] {
  return nodes.map((node, index) => {
    const key = `${prefix}${index}`;
    if (node.type === "text") return node.text;
    const children = renderNodes(node.children, components, `${key}.`);
    const type = node.component ? components[node.name] : node.name;
    return createElement(type, { ...node.props, key }, ...(children.length > 0 ? children : []));
  });
}

/**
 * Renders JSX an agent wrote, safely. Only components the caller lists and plain HTML tags
 * render; attributes are limited to a safe set (`on*` handlers, `dangerouslySetInnerHTML`
 * and `javascript:` or `data:` URLs never pass); `{expressions}` are never evaluated. Never
 * enable it on a public surface.
 */
export function JSXPreview({ jsx, components, isStreaming = false, sx, className }: JSXPreviewProps) {
  const tree = useMemo(
    () => (components ? parseJsx(jsx, new Set(Object.keys(components)), isStreaming) : null),
    [jsx, components, isStreaming]
  );
  if (!components || !tree) return null;
  return (
    <Box className={className} sx={sx} data-jsx-preview="">
      {renderNodes(tree, components, "")}
    </Box>
  );
}
