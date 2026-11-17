"use client";

import { useRef, useState, type ComponentPropsWithoutRef } from "react";
import IconButton from "@mui/material/IconButton";
import OpenInFullOutlinedIcon from "@mui/icons-material/OpenInFullOutlined";
import { MarkdownTableDialog, TABLE_DIALOG_COPY } from "./markdown-table-dialog";
import { useTableBreakout } from "./markdown-table-layout";
import { useTableOverflow } from "./markdown-table-scroll";

export { WIDE_AREA_ATTRIBUTE, WIDE_AREA_GUTTER_PX } from "./markdown-table-layout";
export { markdownTableStyles } from "./markdown-table-styles";

type TableProps = ComponentPropsWithoutRef<"table"> & { node?: unknown };

/**
 * A markdown table. On its own it keeps its natural column widths and scrolls inside the reply.
 * Inside a wide area (see `WIDE_AREA_ATTRIBUTE`) a table wider than the reply's column grows
 * past it, centred on the column, up to the area's width less a gutter, and only then scrolls;
 * prose, avatars and actions keep the column. A narrow table is never stretched.
 *
 * A table that still does not fit shows that it scrolls: the edge with more content fades, its
 * scrollbar stays drawn (and is repeated above a tall table, so one is always in view), and an
 * Expand button opens it over the whole window. A table that fits shows none of these.
 */
export function MarkdownTable({ node: _node, ...props }: TableProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const mirrorRef = useRef<HTMLDivElement | null>(null);
  const tableRef = useRef<HTMLTableElement | null>(null);
  const [expanded, setExpanded] = useState(false);

  useTableBreakout(wrapperRef, frameRef, tableRef);
  const { overflowing, tall, contentWidth, onMirrorScroll, syncMirror } = useTableOverflow(scrollRef, tableRef, mirrorRef);

  return (
    <div ref={wrapperRef} data-chat-table="">
      <div ref={frameRef} data-chat-table-frame="">
        {overflowing && tall ? (
          <div
            ref={(node) => {
              mirrorRef.current = node;
              if (node) syncMirror();
            }}
            data-chat-table-mirror=""
            aria-hidden="true"
            onScroll={onMirrorScroll}
          >
            <div style={{ width: contentWidth }} />
          </div>
        ) : null}
        <div data-chat-table-body="">
          <div
            ref={scrollRef}
            data-chat-table-scroll=""
            // A scroller the keyboard cannot reach cannot be read sideways without a mouse.
            {...(overflowing ? { tabIndex: 0, role: "region", "aria-label": TABLE_DIALOG_COPY.region } : {})}
          >
            <table ref={tableRef} {...props} />
          </div>
          {overflowing ? (
            <IconButton
              size="small"
              data-chat-table-expand=""
              aria-label={TABLE_DIALOG_COPY.expand}
              title={TABLE_DIALOG_COPY.expand}
              aria-haspopup="dialog"
              onClick={() => setExpanded(true)}
            >
              <OpenInFullOutlinedIcon fontSize="inherit" />
            </IconButton>
          ) : null}
        </div>
      </div>
      {expanded ? <MarkdownTableDialog table={props} onClose={() => setExpanded(false)} /> : null}
    </div>
  );
}
