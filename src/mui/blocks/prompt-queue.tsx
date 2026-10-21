"use client";

/**
 * Prompts typed while a turn works, stacked just above the composer's text box. Each row has Steer (add it to the
 * working turn without interrupting it), Edit (take it back into the box) and Delete. The host owns the list; see
 * `usePromptQueue` in core for one that also sends the next prompt when the turn ends.
 */

import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import type { QueuedPrompt } from "../../core/hooks/use-prompt-queue";
import { useChatKitStyles } from "../theme";

export type PromptQueueLabels = {
  /** The small header; default "Queued". */
  heading: string;
  steer: string;
  edit: string;
  delete: string;
};

export const DEFAULT_PROMPT_QUEUE_LABELS: PromptQueueLabels = { heading: "Queued", steer: "Steer", edit: "Edit", delete: "Delete" };

export type PromptQueueProps = {
  items: QueuedPrompt[];
  /** Add the prompt to the working turn. Hidden on every row when `canSteer` is false. */
  onSteer?: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  /** Default true when `onSteer` is given. */
  canSteer?: boolean;
  /** Ids being steered: their Steer shows a spinner and the row's buttons wait. */
  steering?: string[];
  /** Why the last steer did not work. */
  note?: string | null;
  labels?: Partial<PromptQueueLabels>;
  disabled?: boolean;
};

const ICON_BUTTON_SIZE = 28;

export function PromptQueue({ items, onSteer, onEdit, onDelete, canSteer, steering = [], note, labels, disabled }: PromptQueueProps) {
  const { scheme } = useChatKitStyles();
  const words = { ...DEFAULT_PROMPT_QUEUE_LABELS, ...labels };
  const showSteer = Boolean(onSteer) && canSteer !== false;
  if (!items.length && !note) return null;
  return (
    <Box
      data-chat="prompt-queue"
      sx={scheme((c) => ({ mb: 1, pb: 0.5, borderBottom: 1, borderColor: c.border, color: c.text }))}
    >
      {items.length ? (
        <Typography variant="caption" component="div" sx={scheme((c) => ({ color: c.mutedText, fontWeight: 600, mb: 0.25 }))}>
          {words.heading}
        </Typography>
      ) : null}
      <Box component="ul" role="list" aria-label={words.heading} sx={{ listStyle: "none", m: 0, p: 0 }}>
        {items.map((item) => {
          const busy = steering.includes(item.id);
          return (
            <Box
              component="li"
              key={item.id}
              data-chat="prompt-queue-item"
              sx={{ display: "flex", alignItems: "center", gap: 0.5, py: 0.25 }}
            >
              <Typography
                variant="body2"
                title={item.text}
                sx={{
                  flex: 1,
                  minWidth: 0,
                  overflow: "hidden",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflowWrap: "anywhere",
                }}
              >
                {item.text}
              </Typography>
              {showSteer ? (
                <ButtonBase
                  data-chat="prompt-queue-steer"
                  disabled={disabled || busy}
                  aria-busy={busy || undefined}
                  aria-label={`${words.steer}: ${item.text}`}
                  onClick={() => onSteer?.(item.id)}
                  sx={scheme((c) => ({
                    gap: 0.5,
                    px: 0.75,
                    height: ICON_BUTTON_SIZE,
                    borderRadius: "8px",
                    color: c.accent,
                    fontSize: 13,
                    fontWeight: 600,
                    fontFamily: "inherit",
                    "&:hover": { bgcolor: c.muted },
                    "&:focus-visible": { outline: "2px solid", outlineColor: c.accent },
                    "&.Mui-disabled": { opacity: 0.7 },
                  }))}
                >
                  {busy ? (
                    <CircularProgress
                      size={12}
                      thickness={5}
                      color="inherit"
                      aria-hidden
                      sx={{ "@media (prefers-reduced-motion: reduce)": { animation: "none" } }}
                    />
                  ) : null}
                  {words.steer}
                </ButtonBase>
              ) : null}
              <IconButton
                size="small"
                aria-label={words.edit}
                title={`${words.edit}: ${item.text}`}
                disabled={disabled || busy}
                onClick={() => onEdit(item.id)}
                sx={{ width: ICON_BUTTON_SIZE, height: ICON_BUTTON_SIZE }}
              >
                <EditOutlinedIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                aria-label={words.delete}
                title={`${words.delete}: ${item.text}`}
                disabled={disabled || busy}
                onClick={() => onDelete(item.id)}
                sx={{ width: ICON_BUTTON_SIZE, height: ICON_BUTTON_SIZE }}
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Box>
          );
        })}
      </Box>
      {note ? (
        <Typography variant="caption" role="status" sx={scheme((c) => ({ display: "block", mt: 0.25, color: c.warning }))}>
          {note}
        </Typography>
      ) : null}
    </Box>
  );
}
