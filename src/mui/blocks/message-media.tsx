"use client";

import { useEffect, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ButtonBase from "@mui/material/ButtonBase";
import Skeleton from "@mui/material/Skeleton";
import Typography from "@mui/material/Typography";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import ReplayOutlinedIcon from "@mui/icons-material/ReplayOutlined";
import type { MediaItem } from "../../core/media";
import { useReducedMotion } from "../call/use-reduced-motion";
import { useChatKitStyles } from "../theme";
import { MessageMediaLightbox, mediaName } from "./message-media-lightbox";
import { DEFAULT_MESSAGE_MEDIA_LABELS, fillLabel, type MessageMediaLabels } from "./message-media-labels";

export { DEFAULT_MESSAGE_MEDIA_LABELS, type MessageMediaLabels } from "./message-media-labels";

const DEFAULT_MAX_COLUMNS = 2;
const DEFAULT_MAX_HEIGHT = 360;
/** Shape of a skeleton or a video when the item gives no size. */
const DEFAULT_RATIO = "4 / 3";
const VIDEO_RATIO = "16 / 9";
const SINGLE_MAX_WIDTH = 480;

export interface MessageMediaProps {
  items: MediaItem[];
  /**
   * Called when an image is clicked. Given, the kit does not open its own lightbox and the app
   * shows the image itself.
   */
  onOpen?: (item: MediaItem) => void;
  /** Given, the lightbox, each video and each audio item show a Download button that calls this. The kit saves nothing itself. */
  onDownload?: (item: MediaItem) => void;
  /** Given, a failed item shows a Retry button that calls this. */
  onRetry?: (item: MediaItem) => void;
  /** Every visible word; any key can be replaced. */
  labels?: Partial<MessageMediaLabels>;
  /** Most columns of the grid. Default 2. A single item always takes one. */
  maxColumns?: number;
  /** Tallest an image or video is drawn, in px. Default 360. */
  maxHeight?: number;
}

function ratioOf(item: MediaItem, fallback: string): string {
  return item.width && item.height && item.width > 0 && item.height > 0 ? `${item.width} / ${item.height}` : fallback;
}

function FailedItem({ item, labels, onRetry }: { item: MediaItem; labels: MessageMediaLabels; onRetry?: (item: MediaItem) => void }) {
  const { scheme } = useChatKitStyles();
  const title = item.title?.trim();
  return (
    <Box
      data-testid="media-failed"
      sx={scheme((c) => ({ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 0.5, p: 1.5, borderRadius: 2, border: "1px solid", borderColor: c.border, bgcolor: c.surface, color: c.mutedText }))}
    >
      <Typography role="status" variant="body2">
        {title ? fillLabel(labels.failed, { title }) : labels.failedUntitled}
      </Typography>
      {onRetry ? (
        <Button size="small" startIcon={<ReplayOutlinedIcon />} onClick={() => onRetry(item)}>
          {labels.retry}
        </Button>
      ) : null}
    </Box>
  );
}

function LoadingItem({ item, labels, maxHeight }: { item: MediaItem; labels: MessageMediaLabels; maxHeight: number }) {
  const ratio = ratioOf(item, item.kind === "video" ? VIDEO_RATIO : item.kind === "audio" ? "8 / 1" : DEFAULT_RATIO);
  return (
    <Skeleton
      variant="rounded"
      role="status"
      aria-label={fillLabel(labels.loading, { title: mediaName(item, labels) })}
      data-testid="media-loading"
      sx={{ width: "100%", height: "auto", aspectRatio: ratio, maxHeight, minHeight: item.kind === "audio" ? 40 : undefined }}
    />
  );
}

function ImageItem({ item, labels, maxHeight, reduced, onClick, onRetry }: { item: MediaItem; labels: MessageMediaLabels; maxHeight: number; reduced: boolean; onClick: () => void; onRetry?: (item: MediaItem) => void }) {
  const { scheme } = useChatKitStyles();
  const [loaded, setLoaded] = useState(false);
  const [broken, setBroken] = useState(false);
  useEffect(() => {
    setLoaded(false);
    setBroken(false);
  }, [item.src]);
  if (broken) return <FailedItem item={item} labels={labels} onRetry={onRetry} />;
  const alt = item.alt?.trim() || mediaName(item, labels);
  const ratio = ratioOf(item, DEFAULT_RATIO);
  const sized = Boolean(item.width && item.height);
  return (
    <ButtonBase
      onClick={onClick}
      aria-haspopup="dialog"
      sx={scheme((c) => ({
        position: "relative",
        display: "block",
        width: "100%",
        overflow: "hidden",
        borderRadius: 2,
        border: "1px solid",
        borderColor: c.border,
        bgcolor: c.surface,
        // A known size keeps the box the picture will fill, so nothing jumps; an unknown one takes the picture's own.
        ...(sized || !loaded ? { aspectRatio: ratio } : {}),
        maxHeight,
        "&.Mui-focusVisible": { outline: "2px solid", outlineColor: c.border, outlineOffset: 2 },
        "& img": reduced ? undefined : { transition: "opacity 160ms ease, transform 200ms ease" },
        ...(reduced ? {} : { "&:hover img": { transform: "scale(1.02)" } }),
      }))}
    >
      {!loaded ? <Skeleton variant="rectangular" data-testid="media-image-skeleton" sx={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} /> : null}
      <Box
        component="img"
        src={item.src ?? undefined}
        alt={alt}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onError={() => setBroken(true)}
        sx={{ display: "block", width: "100%", height: sized ? "100%" : "auto", maxHeight, objectFit: "contain", opacity: loaded || reduced ? 1 : 0 }}
      />
    </ButtonBase>
  );
}

function DownloadButton({ item, labels, onDownload }: { item: MediaItem; labels: MessageMediaLabels; onDownload?: (item: MediaItem) => void }) {
  if (!onDownload) return null;
  const label = `${labels.download} ${mediaName(item, labels)}`;
  return (
    <Button size="small" aria-label={label} startIcon={<FileDownloadOutlinedIcon />} onClick={() => onDownload(item)} sx={{ alignSelf: "flex-start" }}>
      {labels.download}
    </Button>
  );
}

function VideoItem({ item, labels, maxHeight, onDownload, onRetry }: { item: MediaItem; labels: MessageMediaLabels; maxHeight: number; onDownload?: (item: MediaItem) => void; onRetry?: (item: MediaItem) => void }) {
  const { scheme } = useChatKitStyles();
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [item.src]);
  if (broken) return <FailedItem item={item} labels={labels} onRetry={onRetry} />;
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, minWidth: 0 }}>
      <Box
        component="video"
        controls
        preload="metadata"
        playsInline
        src={item.src ?? undefined}
        poster={item.poster ?? undefined}
        aria-label={mediaName(item, labels)}
        onError={() => setBroken(true)}
        sx={scheme((c) => ({ display: "block", width: "100%", maxHeight, aspectRatio: ratioOf(item, VIDEO_RATIO), borderRadius: 2, border: "1px solid", borderColor: c.border, bgcolor: c.surface, objectFit: "contain" }))}
      />
      <DownloadButton item={item} labels={labels} onDownload={onDownload} />
    </Box>
  );
}

function AudioItem({ item, labels, onDownload, onRetry }: { item: MediaItem; labels: MessageMediaLabels; onDownload?: (item: MediaItem) => void; onRetry?: (item: MediaItem) => void }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [item.src]);
  if (broken) return <FailedItem item={item} labels={labels} onRetry={onRetry} />;
  const name = mediaName(item, labels);
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, minWidth: 0 }}>
      {item.title?.trim() ? (
        <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
          {item.title.trim()}
        </Typography>
      ) : null}
      <Box component="audio" controls preload="metadata" src={item.src ?? undefined} aria-label={name} onError={() => setBroken(true)} sx={{ display: "block", width: "100%" }} />
      <DownloadButton item={item} labels={labels} onDownload={onDownload} />
    </Box>
  );
}

/**
 * The images, videos and sounds of one assistant reply. Images sit in a responsive grid that keeps
 * each picture's shape; clicking one opens a lightbox (or calls `onOpen`). Videos and audio use the
 * browser's own player, never autoplay, and load only their metadata. The kit never fetches: `src` is
 * drawn as given (an https address, a `blob:` or a `data:` URL). Renders nothing for an empty list.
 */
export function MessageMedia({ items, onOpen, onDownload, onRetry, labels, maxColumns = DEFAULT_MAX_COLUMNS, maxHeight = DEFAULT_MAX_HEIGHT }: MessageMediaProps) {
  const merged = useMemo(() => ({ ...DEFAULT_MESSAGE_MEDIA_LABELS, ...labels }), [labels]);
  const reduced = useReducedMotion();
  const [openId, setOpenId] = useState<string | null>(null);
  // The lightbox steps through the images that are ready, in the order they are drawn.
  const viewable = useMemo(() => items.filter((item) => item.kind === "image" && item.status === "ready" && item.src), [items]);
  if (items.length === 0) return null;
  const columns = Math.max(1, Math.min(Math.floor(maxColumns) || 1, items.length));
  const openIndex = openId === null ? -1 : viewable.findIndex((item) => item.id === openId);

  const draw = (item: MediaItem) => {
    if (item.status === "loading") return <LoadingItem item={item} labels={merged} maxHeight={maxHeight} />;
    if (item.status === "failed" || !item.src) return <FailedItem item={item} labels={merged} onRetry={onRetry} />;
    if (item.kind === "image") {
      return (
        <ImageItem
          item={item}
          labels={merged}
          maxHeight={maxHeight}
          reduced={reduced}
          onRetry={onRetry}
          onClick={() => (onOpen ? onOpen(item) : setOpenId(item.id))}
        />
      );
    }
    if (item.kind === "video") return <VideoItem item={item} labels={merged} maxHeight={maxHeight} onDownload={onDownload} onRetry={onRetry} />;
    return <AudioItem item={item} labels={merged} onDownload={onDownload} onRetry={onRetry} />;
  };

  return (
    <Box
      role="group"
      aria-label={merged.group}
      data-testid="message-media"
      sx={{
        display: "grid",
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        gap: 1,
        width: "100%",
        minWidth: 0,
        mt: 1,
        maxWidth: items.length === 1 ? SINGLE_MAX_WIDTH : undefined,
        alignItems: "start",
      }}
    >
      {items.map((item) => (
        <Box key={item.id} data-media-id={item.id} data-kind={item.kind} data-status={item.status} sx={{ minWidth: 0 }}>
          {draw(item)}
        </Box>
      ))}
      {openIndex >= 0 ? (
        <MessageMediaLightbox
          items={viewable}
          index={openIndex}
          onIndexChange={(next) => setOpenId(viewable[next]?.id ?? null)}
          onClose={() => setOpenId(null)}
          onDownload={onDownload}
          labels={merged}
        />
      ) : null}
    </Box>
  );
}
