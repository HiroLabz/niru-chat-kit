"use client";

import { useId, useState } from "react";
import ButtonBase from "@mui/material/ButtonBase";
import Chip from "@mui/material/Chip";
import Collapse from "@mui/material/Collapse";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { Citation } from "../../core/types";
import { SOURCE_LIST_COPY } from "../../core/stream/turn-copy";
import { useChatKitStyles } from "../theme";
import { DisclosureChevron } from "../primitives/disclosure-chevron";
import { Source } from "../primitives/source";

function dedupeKey(citation: Citation): string {
  return citation.kind === "web" ? (citation.url ?? citation.label) : citation.label;
}

function dedupeCitations(citations: Citation[]): Citation[] {
  const seen = new Set<string>();
  const deduped: Citation[] = [];
  for (const citation of citations) {
    const key = dedupeKey(citation);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(citation);
  }
  return deduped;
}

/** Long web titles truncate with an ellipsis past this width; the full title stays in the hover card and `title`. */
const SOURCE_CHIP_MAX_WIDTH = 240;

/** The always-visible "View Sources" button; points at the chips only while they are mounted. */
function SourcesToggle({ open, controls, onToggle }: { open: boolean; controls: string; onToggle: () => void }) {
  const { scheme } = useChatKitStyles();
  return (
    <ButtonBase
      onClick={onToggle}
      disableRipple
      aria-expanded={open}
      aria-controls={open ? controls : undefined}
      data-chat="sources-toggle"
      sx={scheme((c) => ({
        alignSelf: "flex-start",
        gap: 0.5,
        borderRadius: 1,
        color: c.mutedText,
        "&:focus-visible": { outline: "2px solid", outlineColor: c.accent },
      }))}
    >
      <Typography variant="caption" sx={scheme((c) => ({ color: c.mutedText }))}>
        {SOURCE_LIST_COPY.toggle}
      </Typography>
      <DisclosureChevron open={open} size={14} />
    </ButtonBase>
  );
}

/** A source with no URL: a plain chip whose long label wraps so it reads in full. */
function DocumentChip({ label }: { label: string }) {
  const { scheme } = useChatKitStyles();
  return (
    <Chip
      size="small"
      variant="outlined"
      label={label}
      title={label}
      data-chat="source"
      sx={scheme((c) => ({
        maxWidth: "100%",
        height: "auto",
        minHeight: 24,
        color: c.text,
        borderColor: c.border,
        "& .MuiChip-label": { whiteSpace: "normal", overflowWrap: "anywhere", py: 0.25 },
      }))}
    />
  );
}

/**
 * One chip per source. Document citations render as plain chips labeled with `citation.label`:
 * they carry no URL, so there is nothing to hover-card or link out to, and a long label wraps
 * inside the chip so it reads in full. Web citations render as a `Source` chip: clicking opens
 * `citation.url` in a new tab, hovering or focusing shows a card with the title and host.
 */
function SourceChips({ id, citations }: { id: string; citations: Citation[] }) {
  const { scheme } = useChatKitStyles();
  // Chip look shared with the plain, non-linking document chip, so a web citation's
  // `Source.Trigger` reads as the same control.
  const chipLike = scheme((c) => ({
    display: "inline-flex",
    alignItems: "center",
    minWidth: 0,
    maxWidth: SOURCE_CHIP_MAX_WIDTH,
    height: 24,
    lineHeight: "24px",
    whiteSpace: "nowrap",
    px: 1.25,
    gap: 0.5,
    borderRadius: 999,
    border: "1px solid",
    borderColor: c.border,
    fontSize: 13,
    color: c.text,
    textDecoration: "none",
  }));

  return (
    <Stack
      id={id}
      direction="row"
      sx={{ flexWrap: "wrap", gap: 0.75, alignItems: "center", minWidth: 0, maxWidth: "100%" }}
    >
      {citations.map((citation) =>
        citation.kind === "web" && citation.url ? (
          <Source key={dedupeKey(citation)} href={citation.url} sx={{ minWidth: 0, maxWidth: "100%" }}>
            <Source.Trigger label={citation.label} slotProps={{ root: { sx: chipLike, "data-chat": "source" } as never }} />
            <Source.Content title={citation.title ?? citation.label} />
          </Source>
        ) : (
          <DocumentChip key={dedupeKey(citation)} label={citation.label} />
        )
      )}
    </Stack>
  );
}

/**
 * Collapsed "View Sources" section rendered under an assistant message: a button
 * (`aria-expanded`, chevron) that shows or hides the source chips, closed by default.
 * Renders nothing when there are no citations.
 */
export function SourceList({ citations }: { citations?: Citation[] | null }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const deduped = citations && citations.length > 0 ? dedupeCitations(citations) : [];
  if (deduped.length === 0) return null;

  return (
    <Stack sx={{ mt: 0.5, gap: 0.5, minWidth: 0, maxWidth: "100%" }}>
      <SourcesToggle open={open} controls={id} onToggle={() => setOpen((value) => !value)} />
      <Collapse in={open} unmountOnExit>
        <SourceChips id={id} citations={deduped} />
      </Collapse>
    </Stack>
  );
}
