"use client";

/** The attachments drawn above the composer's field: thumbnails, file chips and plain chips. */

import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import { useChatKitStyles } from "../theme";

export type ComposerAttachment = {
  id: string;
  name: string;
  /**
   * Set to draw the rich form: a 56 px rounded thumbnail for `image`, a file chip with a
   * PDF icon for `pdf` and a plain file icon otherwise. Without it the attachment is the
   * original outlined chip.
   */
  kind?: "image" | "pdf" | "file";
  /** The thumbnail's source for an `image` (an object URL); the owner revokes it. */
  previewUrl?: string;
};

const THUMBNAIL_SIZE = 56;

export function ComposerAttachmentList({
  attachments,
  onRemoveAttachment,
}: {
  attachments: ComposerAttachment[];
  onRemoveAttachment?: (id: string) => void;
}) {
  const { scheme } = useChatKitStyles();
  if (!attachments.length) return null;
  return (
    <Stack direction="row" spacing={0.75} sx={{ flexWrap: "wrap", rowGap: 0.75, mb: 1, alignItems: "center" }}>
      {attachments.map((attachment) => {
        if (attachment.kind === "image" && attachment.previewUrl) {
          return (
            <Box
              key={attachment.id}
              sx={scheme((c) => ({
                position: "relative",
                width: THUMBNAIL_SIZE,
                height: THUMBNAIL_SIZE,
                borderRadius: "10px",
                border: 1,
                borderColor: c.border,
                overflow: "visible",
              }))}
            >
              <Box
                component="img"
                src={attachment.previewUrl}
                alt={attachment.name}
                sx={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "10px", display: "block" }}
              />
              {onRemoveAttachment ? (
                <IconButton
                  size="small"
                  aria-label={`Remove ${attachment.name}`}
                  onClick={() => onRemoveAttachment(attachment.id)}
                  sx={scheme((c) => ({
                    position: "absolute",
                    top: -8,
                    right: -8,
                    p: 0.25,
                    bgcolor: c.surface,
                    border: 1,
                    borderColor: c.border,
                    "&:hover": { bgcolor: c.muted },
                  }))}
                >
                  <CloseOutlinedIcon sx={{ fontSize: 14 }} />
                </IconButton>
              ) : null}
            </Box>
          );
        }
        if (attachment.kind) {
          return (
            <Box
              key={attachment.id}
              sx={scheme((c) => ({
                display: "inline-flex",
                alignItems: "center",
                gap: 0.5,
                maxWidth: 220,
                height: 32,
                pl: 1,
                pr: 0.25,
                border: 1,
                borderColor: c.border,
                borderRadius: "16px",
                color: c.text,
              }))}
            >
              {attachment.kind === "pdf" ? (
                <PictureAsPdfOutlinedIcon fontSize="small" />
              ) : (
                <DescriptionOutlinedIcon fontSize="small" />
              )}
              <Typography noWrap variant="body2" sx={{ minWidth: 0 }}>
                {attachment.name}
              </Typography>
              {onRemoveAttachment ? (
                <IconButton
                  size="small"
                  aria-label={`Remove ${attachment.name}`}
                  onClick={() => onRemoveAttachment(attachment.id)}
                >
                  <CloseOutlinedIcon sx={{ fontSize: 16 }} />
                </IconButton>
              ) : null}
            </Box>
          );
        }
        return (
          <Chip
            key={attachment.id}
            size="small"
            variant="outlined"
            icon={<DescriptionOutlinedIcon fontSize="small" />}
            label={attachment.name}
            onDelete={onRemoveAttachment ? () => onRemoveAttachment(attachment.id) : undefined}
            sx={scheme((c) => ({ color: c.text, borderColor: c.border }))}
          />
        );
      })}
    </Stack>
  );
}
