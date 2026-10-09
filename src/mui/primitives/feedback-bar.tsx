"use client";

/**
 * Thumbs up/down on a settled agent answer (ADR-0010, `POST /v1/feedback`). Owns no
 * network call itself — `onRate` is the caller's `submitFeedback`, so this stays a
 * pure view: optimistic while `onRate` is pending, reverted and annotated with an
 * inline error on rejection, pressed on the chosen side once it resolves.
 */

import { useState } from "react";
import IconButton from "@mui/material/IconButton";
import type { IconButtonProps } from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import ThumbUpOutlinedIcon from "@mui/icons-material/ThumbUpOutlined";
import ThumbUpIcon from "@mui/icons-material/ThumbUp";
import ThumbDownOutlinedIcon from "@mui/icons-material/ThumbDownOutlined";
import ThumbDownIcon from "@mui/icons-material/ThumbDown";
import type { SxProps, Theme } from "@mui/material/styles";
import { FEEDBACK_COPY } from "../../core/stream/turn-copy";
import type { FeedbackRating } from "../../core/types";
import { useChatKitStyles } from "../theme";
import { sxArray } from "./sx";

export type FeedbackBarSlotProps = {
  up?: Partial<IconButtonProps>;
  down?: Partial<IconButtonProps>;
};

export function FeedbackBar({
  value,
  onRate,
  disabled = false,
  sx,
  className,
  slotProps,
}: {
  /** The rating the server already recorded for this turn, or `null` for none yet. */
  value: FeedbackRating | null;
  onRate: (rating: FeedbackRating) => Promise<void>;
  disabled?: boolean;
  sx?: SxProps<Theme>;
  className?: string;
  slotProps?: FeedbackBarSlotProps;
}) {
  const { scheme } = useChatKitStyles();
  const [pending, setPending] = useState(false);
  // Shown the instant a button is clicked so the choice reads back immediately; cleared
  // on failure so the bar falls back to `value`, the last state the server confirmed.
  const [optimistic, setOptimistic] = useState<FeedbackRating | null>(null);
  const [error, setError] = useState<string | null>(null);
  const current = optimistic ?? value;

  async function rate(rating: FeedbackRating) {
    if (disabled || pending) return;
    setError(null);
    setOptimistic(rating);
    setPending(true);
    try {
      await onRate(rating);
    } catch {
      setOptimistic(null);
      setError(FEEDBACK_COPY.error);
    } finally {
      setPending(false);
    }
  }

  const { up: upSlot, down: downSlot } = slotProps ?? {};

  return (
    <Stack
      direction="row"
      spacing={0.25}
      className={className}
      sx={[{ alignItems: "center" }, ...sxArray(sx)]}
    >
      <Tooltip title={FEEDBACK_COPY.up}>
        <span>
          <IconButton
            size="small"
            aria-label={FEEDBACK_COPY.up}
            aria-pressed={current === "up"}
            disabled={disabled || pending}
            onClick={() => void rate("up")}
            {...upSlot}
          >
            {current === "up" ? (
              <ThumbUpIcon fontSize="small" />
            ) : (
              <ThumbUpOutlinedIcon fontSize="small" />
            )}
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title={FEEDBACK_COPY.down}>
        <span>
          <IconButton
            size="small"
            aria-label={FEEDBACK_COPY.down}
            aria-pressed={current === "down"}
            disabled={disabled || pending}
            onClick={() => void rate("down")}
            {...downSlot}
          >
            {current === "down" ? (
              <ThumbDownIcon fontSize="small" />
            ) : (
              <ThumbDownOutlinedIcon fontSize="small" />
            )}
          </IconButton>
        </span>
      </Tooltip>
      {error ? (
        <Typography variant="caption" role="alert" sx={scheme((c) => ({ color: c.error }))}>
          {error}
        </Typography>
      ) : null}
    </Stack>
  );
}
