"use client";

/** Info/warning/error banner for the transcript, built on MUI `Alert` and coloured from the tokens. */

import type { ReactNode } from "react";
import Alert from "@mui/material/Alert";
import type { AlertProps } from "@mui/material/Alert";
import { darken, lighten } from "@mui/material/styles";
import { useChatKitStyles } from "../theme";
import { sxArray } from "./sx";

export type SystemMessageSlotProps = {
  root?: Partial<AlertProps>;
};

export function SystemMessage({
  severity,
  children,
  action,
  sx,
  className,
  slotProps,
}: {
  severity: "info" | "warning" | "error";
  children: ReactNode;
  action?: ReactNode;
  sx?: AlertProps["sx"];
  className?: string;
  slotProps?: SystemMessageSlotProps;
}) {
  const { scheme } = useChatKitStyles();
  const { sx: rootSx, ...rootRest } = slotProps?.root ?? {};

  return (
    <Alert
      severity={severity}
      action={action}
      className={className}
      sx={[
        scheme((c, _all, mode) => ({
          backgroundColor: mode === "light" ? lighten(c[severity], 0.9) : darken(c[severity], 0.5),
          color: mode === "light" ? darken(c[severity], 0.6) : lighten(c[severity], 0.6),
          "& .MuiAlert-icon": { color: c[severity] },
        })),
        ...sxArray(sx),
        ...sxArray(rootSx),
      ]}
      {...rootRest}
    >
      {children}
    </Alert>
  );
}
