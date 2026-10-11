"use client";

import { useState } from "react";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import ReplayOutlinedIcon from "@mui/icons-material/ReplayOutlined";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { TURN_ACTION_COPY } from "../../core/stream/turn-copy";
import type { ChatMessage, ChatTurnActions, FeedbackRating } from "../../core/types";
import { useChatKitStyles } from "../theme";
import { FeedbackBar } from "../primitives/feedback-bar";
import { TurnCopyButton } from "./turn-copy-button";
import { TurnDeleteButton } from "./turn-delete-button";

function SiblingSwitcher({
  siblingIds,
  index,
  actions,
}: {
  siblingIds: string[];
  index: number;
  actions: ChatTurnActions;
}) {
  const { scheme } = useChatKitStyles();
  const switchBranch = actions.onSwitchBranch;
  const previousId = index > 0 ? siblingIds[index - 1] : undefined;
  const nextId = index < siblingIds.length - 1 ? siblingIds[index + 1] : undefined;
  return (
    <Stack direction="row" sx={{ alignItems: "center" }} data-testid="sibling-switcher">
      <IconButton
        size="small"
        aria-label={TURN_ACTION_COPY.previous}
        disabled={actions.disabled || previousId === undefined}
        onClick={() => previousId && switchBranch?.(previousId)}
      >
        <ChevronLeftIcon fontSize="small" />
      </IconButton>
      <Typography
        variant="caption"
        sx={scheme((c) => ({ color: c.mutedText, minWidth: 32, textAlign: "center" }))}
      >
        {`${index + 1} / ${siblingIds.length}`}
      </Typography>
      <IconButton
        size="small"
        aria-label={TURN_ACTION_COPY.next}
        disabled={actions.disabled || nextId === undefined}
        onClick={() => nextId && switchBranch?.(nextId)}
      >
        <ChevronRightIcon fontSize="small" />
      </IconButton>
    </Stack>
  );
}

/**
 * Holds the rating this turn settles on once the server has recorded it. There is no
 * field on `ChatMessage` to read an existing rating back from (feedback is write-only
 * from here), so a fresh click is this component's only source of truth.
 */
function FeedbackRatingBar({
  serverId,
  disabled,
  onFeedback,
}: {
  serverId: string;
  disabled: boolean;
  onFeedback: (messageId: string, rating: FeedbackRating) => Promise<void>;
}) {
  const [rating, setRating] = useState<FeedbackRating | null>(null);
  return (
    <FeedbackBar
      value={rating}
      disabled={disabled}
      onRate={async (next) => {
        await onFeedback(serverId, next);
        setRating(next);
      }}
    />
  );
}

/**
 * The controls under a settled turn: copy a reply (no server id needed), and, by server id, regenerate it, rate it, edit a question, and step between the alternatives recorded at this
 * place. Each control shows whenever the surface supplied its handler in `actions`; there
 * are no per-surface switches here, so a surface that omits one has chosen to omit it.
 */
export function TurnActions({
  message,
  actions,
  onStartEdit,
}: {
  message: ChatMessage;
  actions: ChatTurnActions;
  onStartEdit: () => void;
}) {
  const { scheme } = useChatKitStyles();
  if (message.pending || message.role === "system") return null;
  const serverId = message.serverId;
  const isUser = message.role === "user";
  const onCopy = actions.onCopy;
  // Copy needs only the text, so a surface whose replies carry no server id (the public
  // widget) still gets it; every other control below is keyed on that id.
  const copyAction =
    isUser || !message.text
      ? null
      : onCopy
        ? <TurnCopyButton message={message} onCopy={onCopy} />
        : serverId
          ? (actions.renderCopy?.(message) ?? null)
          : null;
  const extraActions = isUser || !message.text ? null : (actions.renderExtraActions?.(message) ?? null);
  const onDelete = actions.onDelete;
  const deleteAction = onDelete ? (
    <TurnDeleteButton message={message} onDelete={onDelete} disabled={actions.disabled} />
  ) : null;
  if (!serverId) {
    return copyAction || extraActions || deleteAction ? (
      <Stack direction="row" data-chat="actions" sx={scheme((c) => ({ alignItems: "center", mt: 0.25, color: c.mutedText }))}>
        {copyAction}
        {extraActions}
        {deleteAction}
      </Stack>
    ) : null;
  }
  const siblingIds = message.siblingIds ?? [serverId];
  const index = Math.min(Math.max(message.siblingIndex ?? 0, 0), siblingIds.length - 1);
  const label = isUser ? TURN_ACTION_COPY.edit : TURN_ACTION_COPY.regenerate;
  const onFeedback = actions.onFeedback;
  const onRegenerate = actions.onRegenerate;
  const showEdit = isUser ? Boolean(actions.onEdit) && actions.canEdit !== false : Boolean(onRegenerate);
  const showBranches = siblingIds.length > 1 && Boolean(actions.onSwitchBranch);
  if (!showEdit && !showBranches && !copyAction && !onFeedback && !extraActions && !deleteAction) return null;
  return (
    <Stack
      direction="row"
      spacing={0.25}
      data-chat="actions"
      sx={scheme((c) => ({ alignItems: "center", mt: 0.25, color: c.mutedText }))}
    >
      {showBranches ? (
        <SiblingSwitcher siblingIds={siblingIds} index={index} actions={actions} />
      ) : null}
      {showEdit ? (
        <Tooltip title={label}>
          <span>
            <IconButton
              size="small"
              aria-label={label}
              disabled={actions.disabled}
              onClick={() => (isUser ? onStartEdit() : onRegenerate?.(serverId))}
            >
              {isUser ? <EditOutlinedIcon fontSize="small" /> : <ReplayOutlinedIcon fontSize="small" />}
            </IconButton>
          </span>
        </Tooltip>
      ) : null}
      {copyAction}
      {!isUser && onFeedback ? (
        <FeedbackRatingBar serverId={serverId} disabled={actions.disabled} onFeedback={onFeedback} />
      ) : null}
      {extraActions}
      {deleteAction}
    </Stack>
  );
}
