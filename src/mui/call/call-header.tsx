"use client";

import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import ClosedCaptionIcon from "@mui/icons-material/ClosedCaption";
import ClosedCaptionDisabledIcon from "@mui/icons-material/ClosedCaptionDisabled";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import PauseIcon from "@mui/icons-material/Pause";
import { useCall } from "./call-context";

export interface CallStageHeaderProps {
  /** The top-left slot, for the app's menu button. Defaults to the stage's `menu`. */
  menu?: ReactNode;
  /** The top-right avatar of the person. Defaults to the stage's `user.avatar`. */
  avatar?: ReactNode;
  /** Extra controls placed before the captions toggle. */
  children?: ReactNode;
}

/**
 * The top row. Left: the menu slot and, when the stage has `onMinimise`, a minimise button. Right:
 * hold (only when the session can hold), the captions toggle (only when it supports captions;
 * the icon carries a slash while captions are off) and the person's avatar slot.
 */
export function CallStageHeader({ menu, avatar, children }: CallStageHeaderProps) {
  const call = useCall();
  const { session, snapshot, colors, t } = call;
  const iconSx = { color: colors.text, "&.Mui-focusVisible": { outline: `2px solid ${colors.text}` } } as const;
  const open = snapshot.phase !== "ended" && snapshot.phase !== "failed" && snapshot.phase !== "connecting";
  return (
    <Box component="header" data-testid="call-header" sx={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, p: { xs: 1.5, sm: 2 }, minWidth: 0 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, minWidth: 40 }}>
        {menu ?? call.menu}
        {call.onMinimise ? (
          <IconButton aria-label={t("minimise")} title={t("minimise")} onClick={call.onMinimise} sx={iconSx}>
            <KeyboardArrowDownIcon />
          </IconButton>
        ) : null}
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
        {children}
        {snapshot.capabilities.hold && open && snapshot.phase !== "held" ? (
          <IconButton aria-label={t("hold")} title={t("hold")} onClick={() => session.hold()} sx={iconSx}>
            <PauseIcon />
          </IconButton>
        ) : null}
        {snapshot.capabilities.captions ? (
          <IconButton
            aria-label={snapshot.captions ? t("captionsOff") : t("captionsOn")}
            title={snapshot.captions ? t("captionsOff") : t("captionsOn")}
            onClick={() => session.setCaptions(!snapshot.captions)}
            sx={iconSx}
          >
            {snapshot.captions ? <ClosedCaptionIcon /> : <ClosedCaptionDisabledIcon />}
          </IconButton>
        ) : null}
        {avatar ?? call.user.avatar}
      </Box>
    </Box>
  );
}
