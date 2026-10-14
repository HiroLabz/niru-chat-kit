"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ButtonBase from "@mui/material/ButtonBase";
import Typography from "@mui/material/Typography";
import type { CallTranscriptLine } from "../../core/call-report";
import { useChatKitStyles } from "../theme";
import { fillLabel } from "./message-media-labels";
import type { CallPlaybackLabels } from "./call-playback-labels";
import { clock } from "./call-playback-player";

/** The line being played: the last one that has started and has not ended. -1 when none. */
export function activeLineIndex(lines: CallTranscriptLine[], seconds: number): number {
  let found = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (line.start_s <= seconds) found = i;
    else break;
  }
  return found >= 0 && seconds <= lines[found]!.end_s ? found : -1;
}

export function CallPlaybackTranscript({
  lines,
  truncated,
  labels,
  current,
  highlight,
  playing,
  canSeek,
  onSeek,
  collapsedLines,
  defaultExpanded,
}: {
  lines: CallTranscriptLine[];
  truncated: boolean;
  labels: CallPlaybackLabels;
  current: number;
  /** Mark the active line (true once there is a recording that has started). */
  highlight: boolean;
  playing: boolean;
  canSeek: boolean;
  onSeek: (seconds: number) => void;
  collapsedLines: number;
  defaultExpanded: boolean;
}) {
  const { scheme } = useChatKitStyles();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const listRef = useRef<HTMLUListElement | null>(null);
  const active = highlight ? activeLineIndex(lines, current) : -1;
  const limit = Math.max(1, Math.floor(collapsedLines));
  const collapsible = lines.length > limit;
  const folded = collapsible && !expanded;
  // Folded, the window starts at the playing line so it never plays out of sight.
  const first = useMemo(() => (folded && active >= limit ? Math.min(active - 1, lines.length - limit) : 0), [folded, active, limit, lines.length]);
  const visible = folded ? lines.slice(first, first + limit) : lines;

  // Keep the playing line in view inside the list, without scrolling the page.
  useEffect(() => {
    const list = listRef.current;
    if (!playing || active < 0 || !list) return;
    const row = list.querySelector<HTMLElement>(`[data-line-index="${active}"]`);
    if (!row) return;
    const top = row.offsetTop - list.offsetTop;
    if (top < list.scrollTop) list.scrollTop = top;
    else if (top + row.offsetHeight > list.scrollTop + list.clientHeight) list.scrollTop = top + row.offsetHeight - list.clientHeight;
  }, [active, playing, folded, first]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, minWidth: 0 }}>
      <Typography variant="overline" component="h3" sx={scheme((c) => ({ color: c.mutedText, lineHeight: 1.6 }))}>
        {labels.transcript}
      </Typography>
      {lines.length === 0 ? (
        <Typography variant="body2" sx={scheme((c) => ({ color: c.mutedText }))}>
          {labels.noTranscript}
        </Typography>
      ) : (
        <Box
          component="ul"
          ref={listRef}
          data-testid="call-transcript"
          sx={{ listStyle: "none", m: 0, p: 0, display: "flex", flexDirection: "column", gap: 0.25, maxHeight: folded ? undefined : 280, overflowY: folded ? "visible" : "auto", position: "relative" }}
        >
          {visible.map((line, offset) => {
            const index = first + offset;
            const isActive = index === active;
            const speaker = line.speaker === "niru" ? labels.speakerNiru : labels.speakerThem;
            const time = clock(line.start_s);
            const content = (
              <>
                <Typography component="span" variant="caption" sx={scheme((c) => ({ color: c.mutedText, fontVariantNumeric: "tabular-nums", flexShrink: 0, minWidth: 32, pt: "2px" }))}>
                  {time}
                </Typography>
                <Box component="span" sx={{ minWidth: 0 }}>
                  <Typography component="span" variant="caption" sx={{ display: "block", fontWeight: 600 }}>
                    {speaker}
                  </Typography>
                  <Typography component="span" variant="body2" sx={{ display: "block", overflowWrap: "anywhere", whiteSpace: "pre-wrap" }}>
                    {line.text}
                  </Typography>
                </Box>
              </>
            );
            const rowSx = scheme((c) => ({
              display: "flex",
              alignItems: "flex-start",
              gap: 1,
              width: "100%",
              textAlign: "left",
              px: 1,
              py: 0.5,
              borderRadius: 1.5,
              color: c.text,
              bgcolor: isActive ? c.muted : "transparent",
              boxShadow: isActive ? `inset 3px 0 0 ${c.accent}` : "none",
              ...(canSeek ? { "&:hover": { bgcolor: c.muted }, "&.Mui-focusVisible": { outline: "2px solid", outlineColor: c.accent, outlineOffset: -2 } } : {}),
            }));
            return (
              <li key={index} data-line-index={index} data-active={isActive ? "true" : undefined}>
                {canSeek ? (
                  <ButtonBase
                    onClick={() => onSeek(line.start_s)}
                    aria-current={isActive ? "true" : undefined}
                    aria-label={fillLabel(labels.playFromLine, { speaker, time, text: line.text })}
                    sx={rowSx}
                  >
                    {content}
                  </ButtonBase>
                ) : (
                  <Box role="group" aria-label={fillLabel(labels.line, { speaker, time, text: line.text })} sx={rowSx}>
                    {content}
                  </Box>
                )}
              </li>
            );
          })}
        </Box>
      )}
      {collapsible ? (
        <Button size="small" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded} sx={{ alignSelf: "flex-start" }}>
          {expanded ? labels.showLess : labels.showFull}
        </Button>
      ) : null}
      {truncated ? (
        <Typography role="note" variant="caption" sx={scheme((c) => ({ color: c.mutedText }))}>
          {labels.truncated}
        </Typography>
      ) : null}
    </Box>
  );
}
