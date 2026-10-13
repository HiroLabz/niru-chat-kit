"use client";

/**
 * Long pasted text drawn above the composer's field, beside the attachment previews: an icon
 * tile, the title, a size line with a "Show in text field" link and a round remove button.
 * The kit only draws them; the app holds the text and decides what Send does with it.
 */

import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import { pastedTextTitle, type ComposerPastedText } from "../../core/pasted-text";
import { useChatKitStyles } from "../theme";
import type { ComposerExtrasLabels } from "./composer-extras-labels";

const CARD_WIDTH = 280;
const TILE_SIZE = 40;

export function ComposerPastedTextList({
  items,
  labels,
  disabled,
  onShow,
  onRemove,
}: {
  items: ComposerPastedText[];
  labels: ComposerExtrasLabels;
  disabled?: boolean;
  onShow?: (id: string) => void;
  onRemove?: (id: string) => void;
}) {
  const { scheme } = useChatKitStyles();
  if (!items.length) return null;
  return (
    <Stack direction="row" spacing={1} data-chat="composer-pasted" sx={{ flexWrap: "wrap", rowGap: 1, mb: 1, pt: 1, alignItems: "center" }}>
      {items.map((item) => {
        const title = item.title ?? pastedTextTitle(item.text);
        const size = labels.pastedSize.replace("{count}", item.text.length.toLocaleString("en-US"));
        return (
          <Box
            key={item.id}
            data-chat="composer-pasted-item"
            sx={scheme((c) => ({
              position: "relative",
              display: "flex",
              alignItems: "center",
              gap: 1.25,
              width: CARD_WIDTH,
              maxWidth: "100%",
              p: 1,
              borderRadius: "14px",
              border: 1,
              borderColor: c.border,
              bgcolor: c.surface,
              color: c.text,
            }))}
          >
            <Box
              sx={scheme((c) => ({
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                width: TILE_SIZE,
                height: TILE_SIZE,
                borderRadius: "10px",
                bgcolor: c.muted,
                color: c.mutedText,
              }))}
            >
              <ArticleOutlinedIcon />
            </Box>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography noWrap variant="body2" title={title} sx={{ fontWeight: 600 }}>
                {title}
              </Typography>
              <Box sx={{ display: "flex", alignItems: "baseline", gap: 1, minWidth: 0 }}>
                <Typography noWrap variant="caption" sx={scheme((c) => ({ color: c.mutedText }))}>
                  {size}
                </Typography>
                {onShow ? (
                  <ButtonBase
                    disabled={disabled}
                    onClick={() => onShow(item.id)}
                    sx={scheme((c) => ({ typography: "caption", color: c.accent, textDecoration: "underline", borderRadius: 0.5, whiteSpace: "nowrap" }))}
                  >
                    {labels.showPasted}
                  </ButtonBase>
                ) : null}
              </Box>
            </Box>
            {onRemove ? (
              <IconButton
                size="small"
                disabled={disabled}
                aria-label={`${labels.remove} ${title}`}
                onClick={() => onRemove(item.id)}
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
      })}
    </Stack>
  );
}
