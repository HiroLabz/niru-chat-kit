"use client";

/**
 * Model-written image, reached through the markdown `img` override. A skeleton
 * covers the layout gap while the image loads; a broken or blocked URL (dead link,
 * a protocol react-markdown's URL sanitising already stripped before this ever
 * mounts) falls back to text instead of the browser's broken-image icon.
 */

import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import Typography from "@mui/material/Typography";
import type { SxProps, Theme } from "@mui/material/styles";
import { useChatKitStyles } from "../theme";
import { sxArray } from "./sx";

type ImageStatus = "loading" | "loaded" | "error";

/** Only image types are drawn from raw bytes; anything else (text/html, application/*) is refused. */
const IMAGE_MEDIA_TYPE = /^image\/[a-z0-9.+-]+$/i;

function decodeBase64(base64: string): Uint8Array | null {
  try {
    const binary = atob(base64.replace(/^data:[^,]*,/, "").replace(/\s/g, ""));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

/**
 * The URL to draw: `src` as given, or an object URL made from `base64` / `uint8Array` plus a
 * `mediaType`. The object URL is revoked when the bytes change and on unmount. `refused` is set
 * for a media type that is not `image/*` or bytes that cannot be read.
 */
function useImageUrl({
  src,
  base64,
  uint8Array,
  mediaType,
}: Pick<ImageProps, "src" | "base64" | "uint8Array" | "mediaType">): { url: string | null; refused: boolean } {
  const raw = src === undefined && (base64 !== undefined || uint8Array !== undefined);
  const refused = raw && !(mediaType && IMAGE_MEDIA_TYPE.test(mediaType));
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [unreadable, setUnreadable] = useState(false);
  useEffect(() => {
    if (!raw || refused) return;
    const bytes = uint8Array ?? (base64 !== undefined ? decodeBase64(base64) : null);
    setUnreadable(!bytes);
    if (!bytes) return;
    const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: mediaType }));
    setObjectUrl(url);
    return () => {
      URL.revokeObjectURL(url);
      setObjectUrl(null);
    };
  }, [raw, refused, base64, uint8Array, mediaType]);
  if (!raw) return { url: src ?? null, refused: false };
  return { url: refused || unreadable ? null : objectUrl, refused: refused || unreadable };
}

export type ImageProps = {
  /** An address to load. Use this, or `base64` / `uint8Array` with `mediaType`. */
  src?: string;
  /** Image bytes as base64 (a `data:` prefix is tolerated). Needs an `image/*` `mediaType`. */
  base64?: string;
  /** Image bytes. Needs an `image/*` `mediaType`. */
  uint8Array?: Uint8Array;
  /** The bytes' media type, for example `image/png`. Anything that is not `image/*` is refused. */
  mediaType?: string;
  alt?: string;
  sx?: SxProps<Theme>;
  className?: string;
};

export function Image({ src, base64, uint8Array, mediaType, alt = "", sx, className }: ImageProps) {
  const { url, refused } = useImageUrl({ src, base64, uint8Array, mediaType });
  const [loadStatus, setLoadStatus] = useState<ImageStatus>("loading");
  const status: ImageStatus = refused ? "error" : loadStatus;
  const setStatus = setLoadStatus;
  // A new source starts from loading again, so a failed first image does not hide its replacement.
  useEffect(() => {
    setLoadStatus("loading");
  }, [url]);
  const { scheme } = useChatKitStyles();

  return (
    // Markdown wraps an image in a `<p>`, which may only contain inline (phrasing)
    // content — every element here is rendered as a `span`/`img` rather than MUI's
    // `div` defaults, or a bare image in prose would trip React's "div inside p"
    // hydration warning.
    <Box
      component="span"
      className={className}
      sx={[{ position: "relative", display: "inline-block", maxWidth: "100%" }, ...sxArray(sx)]}
    >
      {status === "loading" ? (
        <Skeleton
          component="span"
          data-testid="chat-image-skeleton"
          variant="rounded"
          sx={{ display: "block", width: "100%", height: 160 }}
        />
      ) : null}
      {status === "error" ? (
        <Typography component="span" variant="body2" sx={scheme((c) => ({ color: c.mutedText, fontStyle: "italic" }))}>
          Image could not be loaded
        </Typography>
      ) : (
        <Box
          component="img"
          src={url ?? undefined}
          alt={alt}
          onLoad={() => setStatus("loaded")}
          onError={() => setStatus("error")}
          sx={{ maxWidth: "100%", display: status === "loading" ? "none" : "block" }}
        />
      )}
    </Box>
  );
}

/** The name this component had before it moved into the kit. */
export const ChatImage = Image;
