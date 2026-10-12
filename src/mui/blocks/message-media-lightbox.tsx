"use client";

import { useEffect, useId, useState, type KeyboardEvent } from "react";
import Box from "@mui/material/Box";
import Dialog from "@mui/material/Dialog";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import ChevronLeftOutlinedIcon from "@mui/icons-material/ChevronLeftOutlined";
import ChevronRightOutlinedIcon from "@mui/icons-material/ChevronRightOutlined";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import type { MediaItem } from "../../core/media";
import { useReducedMotion } from "../call/use-reduced-motion";
import { useChatKitStyles } from "../theme";
import { fillLabel, type MessageMediaLabels } from "./message-media-labels";

export function mediaName(item: MediaItem, labels: MessageMediaLabels): string {
  const fallback = item.kind === "image" ? labels.imageFallback : item.kind === "video" ? labels.videoFallback : labels.audioFallback;
  return item.title?.trim() || item.alt?.trim() || fallback;
}

export interface MessageMediaLightboxProps {
  /** The images that can be stepped through. */
  items: MediaItem[];
  /** Index into `items`. */
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  onDownload?: (item: MediaItem) => void;
  labels: MessageMediaLabels;
}

/** The enlarged image: a dialog with a title, Download, Close and, for several images, Previous and Next. */
export function MessageMediaLightbox({ items, index, onIndexChange, onClose, onDownload, labels }: MessageMediaLightboxProps) {
  const { scheme } = useChatKitStyles();
  const reduced = useReducedMotion();
  const titleId = useId();
  const item = items[index];
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [item?.src]);
  if (!item) return null;
  const name = mediaName(item, labels);
  const several = items.length > 1;
  const go = (next: number) => onIndexChange(Math.min(items.length - 1, Math.max(0, next)));
  const onKeyDown = (event: KeyboardEvent) => {
    if (!several) return;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      go(index - 1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      go(index + 1);
    }
  };
  return (
    <Dialog
      open
      onClose={onClose}
      onKeyDown={onKeyDown}
      aria-labelledby={titleId}
      maxWidth={false}
      transitionDuration={reduced ? 0 : undefined}
      slotProps={{ paper: { sx: scheme((c) => ({ bgcolor: c.surface, color: c.text, backgroundImage: "none", maxWidth: "min(96vw, 1200px)", m: 1, overflow: "hidden" })) } }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, pl: 2, pr: 1, py: 0.5 }}>
        <Typography id={titleId} component="h2" noWrap sx={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 600 }}>
          {name}
        </Typography>
        {several ? (
          <Typography variant="caption" data-testid="media-position" sx={scheme((c) => ({ color: c.mutedText, px: 0.5 }))}>
            {fillLabel(labels.position, { index: index + 1, count: items.length })}
          </Typography>
        ) : null}
        {onDownload ? (
          <IconButton aria-label={labels.download} title={labels.download} onClick={() => onDownload(item)}>
            <FileDownloadOutlinedIcon />
          </IconButton>
        ) : null}
        <IconButton aria-label={labels.close} title={labels.close} onClick={onClose}>
          <CloseOutlinedIcon />
        </IconButton>
      </Box>
      <Box sx={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 120, px: 1, pb: 1 }}>
        {several ? (
          <IconButton
            aria-label={labels.previous}
            title={labels.previous}
            disabled={index === 0}
            onClick={() => go(index - 1)}
            sx={scheme((c) => ({ position: "absolute", left: 12, zIndex: 1, bgcolor: c.surface, border: "1px solid", borderColor: c.border }))}
          >
            <ChevronLeftOutlinedIcon />
          </IconButton>
        ) : null}
        {broken || !item.src ? (
          <Typography role="status" sx={scheme((c) => ({ color: c.mutedText, py: 6 }))}>
            {fillLabel(labels.failed, { title: name })}
          </Typography>
        ) : (
          <Box
            component="img"
            src={item.src}
            alt={item.alt?.trim() || name}
            onError={() => setBroken(true)}
            sx={{ display: "block", maxWidth: "100%", maxHeight: "78vh", objectFit: "contain" }}
          />
        )}
        {several ? (
          <IconButton
            aria-label={labels.next}
            title={labels.next}
            disabled={index === items.length - 1}
            onClick={() => go(index + 1)}
            sx={scheme((c) => ({ position: "absolute", right: 12, zIndex: 1, bgcolor: c.surface, border: "1px solid", borderColor: c.border }))}
          >
            <ChevronRightOutlinedIcon />
          </IconButton>
        ) : null}
      </Box>
    </Dialog>
  );
}
