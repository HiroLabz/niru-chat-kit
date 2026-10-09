"use client";

import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { Citation } from "../../core/types";
import { useChatKitStyles } from "../theme";
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

/** Long titles truncate with an ellipsis past this width; the full title stays in the hover card and `title`. */
const SOURCE_CHIP_MAX_WIDTH = 240;

/**
 * Compact "Sources" row rendered under an assistant message. Document citations render as
 * plain chips labeled with `citation.label`: they carry no URL, so there is nothing to
 * hover-card or link out to. Web citations render as a `Source` chip: clicking opens
 * `citation.url` in a new tab, hovering or focusing shows a card with the title and host.
 * Renders nothing when there are no citations.
 */
export function SourceList({ citations }: { citations?: Citation[] | null }) {
  const { scheme } = useChatKitStyles();
  const deduped = citations && citations.length > 0 ? dedupeCitations(citations) : [];
  if (deduped.length === 0) return null;

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
      direction="row"
      sx={{ mt: 0.5, flexWrap: "wrap", gap: 0.75, alignItems: "center", minWidth: 0, maxWidth: "100%" }}
    >
      <Typography variant="caption" sx={scheme((c) => ({ color: c.mutedText }))}>
        Sources:
      </Typography>
      {deduped.map((citation) =>
        citation.kind === "web" && citation.url ? (
          <Source key={dedupeKey(citation)} href={citation.url} sx={{ minWidth: 0, maxWidth: "100%" }}>
            <Source.Trigger label={citation.label} slotProps={{ root: { sx: chipLike } }} />
            <Source.Content title={citation.title ?? citation.label} />
          </Source>
        ) : (
          <Chip
            key={dedupeKey(citation)}
            size="small"
            variant="outlined"
            label={citation.label}
            title={citation.label}
            sx={scheme((c) => ({ maxWidth: SOURCE_CHIP_MAX_WIDTH, color: c.text, borderColor: c.border }))}
          />
        )
      )}
    </Stack>
  );
}
