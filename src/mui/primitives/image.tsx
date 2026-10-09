"use client";

/**
 * Model-written image, reached through the markdown `img` override. A skeleton
 * covers the layout gap while the image loads; a broken or blocked URL (dead link,
 * a protocol react-markdown's URL sanitising already stripped before this ever
 * mounts) falls back to text instead of the browser's broken-image icon.
 */

import { useState } from "react";
import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import Typography from "@mui/material/Typography";
import type { SxProps, Theme } from "@mui/material/styles";
import { useChatKitStyles } from "../theme";
import { sxArray } from "./sx";

type ImageStatus = "loading" | "loaded" | "error";

export function Image({
  src,
  alt = "",
  sx,
  className,
}: {
  src: string;
  alt?: string;
  sx?: SxProps<Theme>;
  className?: string;
}) {
  const [status, setStatus] = useState<ImageStatus>("loading");
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
          src={src}
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
