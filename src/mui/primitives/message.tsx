"use client";

import { createContext, useContext, type ReactNode } from "react";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import type { BoxProps } from "@mui/material/Box";
import type { TooltipProps } from "@mui/material/Tooltip";
import { useChatKitStyles } from "../theme";
import { Markdown } from "./markdown";
import { sxArray } from "./sx";

export type MessageFrom = "user" | "assistant";

/**
 * Big enough to read as a face rather than a dot. Every assistant turn's content can
 * indent by this plus {@link MESSAGE_ROW_GAP}, so the size and the alignment cannot drift apart.
 */
export const MESSAGE_AVATAR_SIZE = 36;
/** Gap between the avatar and the bubble (MUI `gap: 1`), in px. */
export const MESSAGE_ROW_GAP = 8;
export const MESSAGE_CONTENT_OFFSET = MESSAGE_AVATAR_SIZE + MESSAGE_ROW_GAP;

const MessageContext = createContext<MessageFrom>("assistant");

/**
 * One chat turn as a row: `Message.Avatar`, `Message.Content` and `Message.Actions`
 * laid out by who spoke. A user turn sits at the end of the row, an assistant turn at the start.
 */
export function Message({
  from = "assistant",
  children,
  sx,
  className,
  ...rest
}: {
  from?: MessageFrom;
  children?: ReactNode;
  sx?: BoxProps["sx"];
  className?: string;
} & Omit<BoxProps, "sx" | "className" | "children">) {
  return (
    <MessageContext.Provider value={from}>
      <Box
        className={className}
        sx={[
          {
            display: "flex",
            gap: 1,
            justifyContent: from === "user" ? "flex-end" : "flex-start",
            alignItems: "flex-end",
          },
          ...sxArray(sx),
        ]}
        {...rest}
      >
        {children}
      </Box>
    </MessageContext.Provider>
  );
}

function MessageAvatar({
  initial,
  src,
  alt,
  size = MESSAGE_AVATAR_SIZE,
  sx,
  className,
}: {
  initial?: string;
  src?: string;
  alt?: string;
  size?: number;
  sx?: BoxProps["sx"];
  className?: string;
}) {
  const { scheme } = useChatKitStyles();
  return (
    <Avatar
      src={src}
      alt={alt}
      className={className}
      sx={[
        scheme((c) => ({
          width: size,
          height: size,
          fontSize: size * 0.45,
          fontWeight: 600,
          bgcolor: c.assistantSurface,
          color: c.assistantText,
        })),
        ...sxArray(sx),
      ]}
    >
      {initial}
    </Avatar>
  );
}

function MessageContent({
  children,
  from: fromProp,
  markdown = false,
  markdownId,
  sx,
  className,
  ...rest
}: {
  children?: ReactNode;
  /** Which side's colours to wear; defaults to the enclosing `Message`'s. */
  from?: MessageFrom;
  /** Renders `children` (a string) as markdown with code, tables and maths. */
  markdown?: boolean;
  markdownId?: string;
  sx?: BoxProps["sx"];
  className?: string;
} & Omit<BoxProps, "sx" | "className" | "children">) {
  const inherited = useContext(MessageContext);
  const from = fromProp ?? inherited;
  const { scheme } = useChatKitStyles();
  return (
    <Box
      data-chat-bubble={from}
      className={className}
      sx={[
        scheme((c, all) => ({
          borderRadius: `${all.bubbleRadius}px`,
          px: 1.5,
          py: 1,
          fontSize: 14,
          // A reply is arbitrary text, so it must never be the thing that decides how
          // wide the transcript is. The bubble is a flex item aligned to one edge, so
          // its width is fit-content and nothing clamped it to the column: a fenced
          // code block or a long identifier pushed it past the column and a narrow panel
          // clipped the result. `maxWidth` bounds it to the column, `overflowWrap` gives
          // long tokens a break opportunity, and a `pre` too wide to wrap then scrolls
          // on its own axis instead of growing.
          minWidth: 0,
          maxWidth: "100%",
          overflowWrap: "anywhere",
          ...(from === "user"
            ? { bgcolor: c.userBubble, color: c.userBubbleText, whiteSpace: "pre-wrap" }
            : {
                bgcolor: c.assistantSurface,
                color: c.assistantText,
                "& a": { color: "inherit" },
                "& code": { bgcolor: c.codeInlineSurface },
                "& pre": { bgcolor: c.codeInlineSurface },
              }),
        })),
        ...sxArray(sx),
      ]}
      {...rest}
    >
      {markdown && typeof children === "string" ? <Markdown id={markdownId}>{children}</Markdown> : children}
    </Box>
  );
}

function MessageActions({
  children,
  sx,
  className,
}: {
  children?: ReactNode;
  sx?: BoxProps["sx"];
  className?: string;
}) {
  const { scheme } = useChatKitStyles();
  return (
    <Stack
      direction="row"
      className={className}
      sx={[scheme((c) => ({ alignItems: "center", gap: 0.5, color: c.mutedText })), ...sxArray(sx)]}
    >
      {children}
    </Stack>
  );
}

function MessageAction({
  tooltip,
  children,
  side = "top",
  sx,
  className,
  slotProps,
}: {
  tooltip: ReactNode;
  children: ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  sx?: BoxProps["sx"];
  className?: string;
  slotProps?: { tooltip?: Partial<TooltipProps> };
}) {
  return (
    <Tooltip title={tooltip} placement={side} describeChild {...slotProps?.tooltip}>
      <Box component="span" className={className} sx={[{ display: "inline-flex" }, ...sxArray(sx)]}>
        {children}
      </Box>
    </Tooltip>
  );
}

Message.Avatar = MessageAvatar;
Message.Content = MessageContent;
Message.Actions = MessageActions;
Message.Action = MessageAction;

export { MessageAvatar, MessageContent, MessageActions, MessageAction };
