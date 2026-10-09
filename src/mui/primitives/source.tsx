"use client";

/**
 * Compound citation link with a hover/focus card. `Source` holds the shared
 * `href` and open state; `Source.Trigger` is the visible link (hover or focus
 * opens the card, leaving either closes it after a short delay so the pointer
 * can cross into the card itself); `Source.Content` is the card's content,
 * rendered in a non-modal MUI `Popper` anchored to the trigger (no backdrop, no
 * scroll lock, so the link stays hoverable and clickable while the card is open).
 *
 * A favicon is requested only for a plain `http(s)` URL — `faviconHost` returns
 * `null` for anything else (`javascript:`, `data:`, `mailto:`, a relative path),
 * and `Source.Trigger` never renders an `<img>` when it does, so a non-http(s)
 * value can never cause a third-party favicon request.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type FocusEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Popper from "@mui/material/Popper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { BoxProps } from "@mui/material/Box";
import type { StackProps } from "@mui/material/Stack";
import { useChatKitStyles } from "../theme";
import { sxArray } from "./sx";

/** Long enough to move the pointer from the trigger into the popped-over card. */
const CLOSE_DELAY_MS = 120;

type SourceContextValue = {
  href: string;
  open: boolean;
  anchorEl: HTMLElement | null;
  cardId: string;
  openCard: (el: HTMLElement) => void;
  scheduleClose: () => void;
  cancelClose: () => void;
  closeNow: () => void;
};

const SourceContext = createContext<SourceContextValue | null>(null);

/** Read by every compound part; throws outside `<Source>` rather than rendering nothing. */
export function useSource(): SourceContextValue {
  const context = useContext(SourceContext);
  if (!context) {
    throw new Error("Source parts must be used inside <Source>");
  }
  return context;
}

/** The host to favicon for, or `null` when `href` is not a plain `http(s)` URL. */
export function faviconHost(href: string): string | null {
  try {
    const url = new URL(href);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.host;
  } catch {
    return null;
  }
}

/** The host shown in the card, falling back to the raw value when `href` does not parse. */
function displayHost(href: string): string {
  try {
    return new URL(href).host;
  } catch {
    return href;
  }
}

export type SourceSlotProps = {
  root?: Partial<BoxProps>;
};

export function Source({
  href,
  children,
  sx,
  className,
  slotProps,
}: {
  href: string;
  children?: ReactNode;
  sx?: BoxProps["sx"];
  className?: string;
  slotProps?: SourceSlotProps;
}) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<number | null>(null);
  const cardId = useId();

  const cancelClose = useCallback(() => {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  function openCard(el: HTMLElement) {
    cancelClose();
    setAnchorEl(el);
    setOpen(true);
  }

  const closeNow = useCallback(() => {
    cancelClose();
    setOpen(false);
  }, [cancelClose]);

  useEffect(() => cancelClose, [cancelClose]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeNow();
    }
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", closeNow, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", closeNow, true);
    };
  }, [open, closeNow]);

  function scheduleClose() {
    cancelClose();
    closeTimer.current = window.setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  }

  const context: SourceContextValue = {
    href,
    open,
    anchorEl,
    cardId,
    openCard,
    scheduleClose,
    cancelClose,
    closeNow,
  };
  const { sx: rootSx, ...rootRest } = slotProps?.root ?? {};

  return (
    <SourceContext.Provider value={context}>
      <Box
        component="span"
        className={className}
        sx={[{ display: "inline-flex" }, ...sxArray(sx), ...sxArray(rootSx)]}
        {...rootRest}
      >
        {children}
      </Box>
    </SourceContext.Provider>
  );
}

export type SourceTriggerSlotProps = {
  root?: Partial<BoxProps>;
};

function SourceTrigger({
  label,
  showFavicon = true,
  sx,
  className,
  slotProps,
}: {
  label: string;
  showFavicon?: boolean;
  sx?: BoxProps["sx"];
  className?: string;
  slotProps?: SourceTriggerSlotProps;
}) {
  const { href, open, cardId, openCard, scheduleClose, closeNow } = useSource();
  const touched = useRef(false);

  useEffect(() => closeNow, [closeNow]);

  const host = showFavicon ? faviconHost(href) : null;
  const faviconSrc = host ? `https://www.google.com/s2/favicons?sz=32&domain=${host}` : null;

  return (
    <Box
      component="a"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-describedby={open ? cardId : undefined}
      onTouchStart={() => {
        touched.current = true;
      }}
      onMouseEnter={(event: MouseEvent<HTMLElement>) => {
        if (touched.current) {
          touched.current = false;
          return;
        }
        openCard(event.currentTarget);
      }}
      onFocus={(event: FocusEvent<HTMLElement>) => {
        if (touched.current) return;
        openCard(event.currentTarget);
      }}
      onMouseLeave={scheduleClose}
      onBlur={scheduleClose}
      title={label}
      className={className}
      sx={[
        { display: "inline-flex", alignItems: "center", gap: 0.5, color: "inherit", textDecoration: "none" },
        ...sxArray(sx),
      ]}
      {...slotProps?.root}
    >
      {faviconSrc ? (
        <Box
          component="img"
          src={faviconSrc}
          alt=""
          aria-hidden
          sx={{ width: 14, height: 14, borderRadius: 0.5, flexShrink: 0 }}
        />
      ) : null}
      <Box
        component="span"
        sx={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
      >
        {label}
      </Box>
    </Box>
  );
}

export type SourceContentSlotProps = {
  root?: Partial<StackProps>;
};

function SourceContent({
  title,
  description,
  sx,
  className,
  slotProps,
}: {
  title?: string;
  description?: string;
  sx?: StackProps["sx"];
  className?: string;
  slotProps?: SourceContentSlotProps;
}) {
  const { href, open, anchorEl, cardId, cancelClose, scheduleClose } = useSource();
  const { scheme } = useChatKitStyles();

  return (
    <Popper
      id={cardId}
      open={open && Boolean(anchorEl)}
      anchorEl={anchorEl}
      placement="bottom-start"
      modifiers={[{ name: "offset", options: { offset: [0, 6] } }]}
      sx={{ zIndex: (theme) => theme.zIndex.tooltip, pointerEvents: "none" }}
    >
      <Paper
        elevation={4}
        onMouseEnter={cancelClose}
        onMouseLeave={scheduleClose}
        sx={scheme((c) => ({ p: 1.5, maxWidth: 320, pointerEvents: "auto", bgcolor: c.surface, color: c.text }))}
      >
        <Stack spacing={0.5} className={className} sx={sx} {...slotProps?.root}>
          {title ? <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{title}</Typography> : null}
          <Typography sx={scheme((c) => ({ fontSize: 12, color: c.mutedText }))}>{displayHost(href)}</Typography>
          {description ? <Typography sx={{ fontSize: 12 }}>{description}</Typography> : null}
        </Stack>
      </Paper>
    </Popper>
  );
}

Source.Trigger = SourceTrigger;
Source.Content = SourceContent;

export { SourceTrigger, SourceContent };
