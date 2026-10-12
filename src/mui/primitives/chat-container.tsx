"use client";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactNode,
  type Ref,
} from "react";
import Box from "@mui/material/Box";
import type { BoxProps } from "@mui/material/Box";
import { ScrollButton } from "./scroll-button";
import { sxArray } from "./sx";

/**
 * How far off the bottom still counts as "at the bottom" when deciding to resume
 * auto-following. Sub-pixel layout and fractional device pixel ratios mean a
 * genuinely-bottomed log reports a remainder slightly above zero.
 */
const FOLLOW_BOTTOM_SLACK_PX = 4;

/**
 * Keys that scroll a focused log. The scrollbar is hidden (`scrollbarWidth: "none"`),
 * so together with wheel, touch and pointer these are every way a person can move this
 * transcript, which is what lets `onScroll` re-arm only, and never disarm.
 */
const SCROLLING_KEYS = new Set(["PageUp", "PageDown", "Home", "End", "ArrowUp", "ArrowDown", " "]);

type ChatContainerContextValue = {
  isAtBottom: boolean;
  scrollToBottom: () => void;
};

const ChatContainerContext = createContext<ChatContainerContextValue | null>(null);

/** Whether the log is at its bottom, and a way back to it. Throws outside `<ChatContainer.Root>`. */
export function useChatContainer(): ChatContainerContextValue {
  const context = useContext(ChatContainerContext);
  if (!context) throw new Error("ChatContainer parts must be used inside <ChatContainer.Root>");
  return context;
}

export type ChatContainerRootProps = {
  children?: ReactNode;
  /**
   * Following resumes whenever this changes to a new non-null value, so a surface can
   * say "the person just sent something, watch what comes back" (the id of their newest turn).
   */
  rearmKey?: string | null;
  /**
   * Following lets go whenever this changes to a new non-null value, so a surface can scroll
   * to something in the middle of the transcript (a highlighted message) without the log
   * pulling back down to the newest turn. Scrolling to the bottom resumes following.
   */
  holdKey?: string | null;
  /** Show the floating "jump to latest" button once scrolled away from the bottom. */
  scrollButton?: boolean;
  sx?: BoxProps["sx"];
  className?: string;
} & Omit<HTMLAttributes<HTMLDivElement>, "className" | "children" | "role">;

/**
 * Scrollable, auto-following `role="log"` transcript: it stays pinned to the newest
 * content while that content grows, lets go the moment the person scrolls away, and
 * takes hold again when they scroll back or send something. Extra props land on the log element.
 */
function ChatContainerRoot({
  children,
  rearmKey = null,
  holdKey = null,
  scrollButton = true,
  sx,
  className,
  onWheel,
  onTouchStart,
  onPointerDown,
  onKeyDown,
  onScroll,
  ...rest
}: ChatContainerRootProps) {
  const logRef = useRef<HTMLDivElement | null>(null);
  const followBottomRef = useRef(true);
  const lastRearmRef = useRef<string | null>(null);
  const lastHoldRef = useRef<string | null>(null);
  // While held, reaching the bottom (including by our own earlier scrolling, whose scroll event arrives late) does not resume following; only the person can.
  const heldRef = useRef(false);
  const [isAtBottom, setIsAtBottom] = useState(true);

  // Re-arming must stay ABOVE the scrolling effect: effects run in declaration order, so
  // this is what re-arms the flag that one then reads on the same commit.
  useLayoutEffect(() => {
    if (rearmKey && rearmKey !== lastRearmRef.current) {
      followBottomRef.current = true;
      heldRef.current = false;
    }
    lastRearmRef.current = rearmKey;
  }, [rearmKey]);

  useLayoutEffect(() => {
    if (holdKey && holdKey !== lastHoldRef.current) {
      followBottomRef.current = false;
      heldRef.current = true;
    }
    lastHoldRef.current = holdKey;
  }, [holdKey]);

  useLayoutEffect(() => {
    const node = logRef.current;
    if (!node || !followBottomRef.current) return;
    const moveToLatest = () => {
      if (followBottomRef.current) node.scrollTop = node.scrollHeight;
    };
    moveToLatest();
    const firstFrame = window.requestAnimationFrame(moveToLatest);
    const secondFrame = window.requestAnimationFrame(moveToLatest);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(moveToLatest);
    // The log itself is `flex: 1`, so its box never changes size as content arrives:
    // watching only it caught nothing after the two frames above. A long transcript's
    // bubbles are still growing at that point (markdown, code blocks, avatars, web
    // fonts), so the scroll landed on the height the log had mid-layout and the
    // conversation opened somewhere in its middle. Watching each child as well means the
    // last growth re-anchors us at the bottom.
    observer?.observe(node);
    for (const child of node.children) observer?.observe(child);
    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
      observer?.disconnect();
    };
  }, [children]);

  /** An explicit "take me to the newest" gesture, so it re-arms following exactly like sending does. */
  const scrollToBottom = useCallback(() => {
    const node = logRef.current;
    if (!node) return;
    followBottomRef.current = true;
    heldRef.current = false;
    node.scrollTop = node.scrollHeight;
    setIsAtBottom(true);
  }, []);

  const context = useMemo(() => ({ isAtBottom, scrollToBottom }), [isAtBottom, scrollToBottom]);

  return (
    <ChatContainerContext.Provider value={context}>
      <Box sx={{ position: "relative", flex: 1, display: "flex", minHeight: 0 }}>
        <Box
          ref={logRef}
          onWheel={(event) => {
            followBottomRef.current = false;
            heldRef.current = false;
            onWheel?.(event);
          }}
          onTouchStart={(event) => {
            followBottomRef.current = false;
            heldRef.current = false;
            onTouchStart?.(event);
          }}
          onPointerDown={(event) => {
            followBottomRef.current = false;
            heldRef.current = false;
            onPointerDown?.(event);
          }}
          onKeyDown={(event) => {
            if (SCROLLING_KEYS.has(event.key)) {
              followBottomRef.current = false;
              heldRef.current = false;
            }
            onKeyDown?.(event);
          }}
          // Following is given up on any touch of the log, including a click that selects
          // text, which does not scroll at all. Scrolling to the bottom is the unambiguous
          // "I want the newest again" gesture, so it re-arms.
          //
          // Re-arming only. Assigning the predicate outright let the component disarm
          // itself: Chrome dispatches a scroll event for our own `scrollTop` write, and
          // runs the scroll steps BEFORE the resize-observer steps. So the move landed at
          // the bottom of a log that was still 727px tall, the composer below finished
          // laying out and shrank it to 692px, and the resulting scroll event measured a
          // gap and switched following off, leaving the newest message below the fold.
          // Every gesture that really means "stop following" is handled above; the
          // scrollbar is hidden, so wheel, touch, pointer and the scrolling keys are the
          // complete set of ways a person can scroll this log.
          onScroll={(event) => {
            const node = event.currentTarget;
            const atBottom = node.scrollHeight - node.scrollTop - node.clientHeight <= FOLLOW_BOTTOM_SLACK_PX;
            if (atBottom && !heldRef.current) followBottomRef.current = true;
            setIsAtBottom(atBottom);
            onScroll?.(event);
          }}
          role="log"
          aria-live="polite"
          aria-atomic="false"
          className={className}
          sx={[
            {
              flex: 1,
              display: "flex",
              flexDirection: "column",
              overflowY: "auto",
              // Scroll chaining stops at this log: reaching the top or bottom must not hand
              // the wheel to whatever is behind it.
              overscrollBehavior: "contain",
              scrollbarWidth: "none",
              msOverflowStyle: "none",
              "&::-webkit-scrollbar": { display: "none" },
            },
            ...sxArray(sx),
          ]}
          {...rest}
        >
          {children}
        </Box>
        {scrollButton ? <ScrollButton visible={!isAtBottom} onClick={scrollToBottom} /> : null}
      </Box>
    </ChatContainerContext.Provider>
  );
}

/** The column the turns sit in; spacing and padding live here so the log itself stays a plain scroller. */
function ChatContainerContent({
  children,
  sx,
  className,
  ...rest
}: {
  children?: ReactNode;
  sx?: BoxProps["sx"];
  className?: string;
} & Omit<BoxProps, "sx" | "className" | "children">) {
  return (
    <Box
      className={className}
      sx={[{ display: "flex", flexDirection: "column", gap: 1.5, p: 2, width: "100%" }, ...sxArray(sx)]}
      {...rest}
    >
      {children}
    </Box>
  );
}

/** A one-pixel sentinel at the end of the content, for a surface to scroll to or observe. */
function ChatContainerScrollAnchor({
  anchorRef,
  sx,
  className,
}: {
  anchorRef?: Ref<HTMLDivElement>;
  sx?: BoxProps["sx"];
  className?: string;
}) {
  return (
    <Box
      ref={anchorRef}
      aria-hidden="true"
      className={className}
      sx={[{ height: "1px", width: "100%", flexShrink: 0, scrollMarginTop: 16 }, ...sxArray(sx)]}
    />
  );
}

export const ChatContainer = {
  Root: ChatContainerRoot,
  Content: ChatContainerContent,
  ScrollAnchor: ChatContainerScrollAnchor,
};

export { ChatContainerRoot, ChatContainerContent, ChatContainerScrollAnchor };
