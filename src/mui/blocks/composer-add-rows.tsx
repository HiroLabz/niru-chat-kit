"use client";

/** The rows of the composer's Add panel: a choosable item, a section's search field and its quiet status lines. */

import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import CircularProgress from "@mui/material/CircularProgress";
import InputBase from "@mui/material/InputBase";
import Typography from "@mui/material/Typography";
import CheckIcon from "@mui/icons-material/Check";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import { useChatKitStyles } from "../theme";

/** One choosable row of the Add panel. */
export type ComposerAddItem = {
  id: string;
  label: string;
  /** One grey line after the label. */
  description?: string;
  icon?: ReactNode;
  onSelect: () => void;
  /** Shown but cannot be chosen. */
  disabled?: boolean;
  /** Shown in place of the description while the item is disabled, so the person learns why. */
  disabledReason?: string;
  /** Defined: the row is a checkable item (`menuitemcheckbox`), drawn with a check at the right while true. */
  checked?: boolean;
  /** Keep the panel open after the item is chosen, for a row that toggles something. */
  keepOpen?: boolean;
};

/** The marker the panel's keyboard handling looks for on every focusable row. */
export const ADD_STOP = "data-add-stop";

export function ComposerAddItemRow({ item, onChoose }: { item: ComposerAddItem; onChoose: (item: ComposerAddItem) => void }) {
  const { scheme } = useChatKitStyles();
  const disabled = Boolean(item.disabled);
  const description = disabled ? (item.disabledReason ?? item.description) : item.description;
  return (
    <ButtonBase
      role={item.checked === undefined ? "menuitem" : "menuitemcheckbox"}
      aria-checked={item.checked}
      aria-disabled={disabled || undefined}
      tabIndex={-1}
      {...{ [ADD_STOP]: "" }}
      onClick={() => onChoose(item)}
      sx={scheme((c) => ({
        display: "flex",
        width: "100%",
        justifyContent: "flex-start",
        textAlign: "left",
        gap: 1.25,
        px: 1,
        py: 0.75,
        minHeight: 36,
        borderRadius: 1,
        color: c.text,
        opacity: disabled ? 0.55 : 1,
        cursor: disabled ? "default" : "pointer",
        "&:hover, &:focus-visible": { bgcolor: disabled ? "transparent" : c.muted },
      }))}
    >
      {item.icon ? <Box sx={{ display: "inline-flex", flexShrink: 0 }}>{item.icon}</Box> : null}
      <Box sx={{ display: "flex", alignItems: "baseline", gap: 1, flex: 1, minWidth: 0 }}>
        <Typography component="span" variant="body2" noWrap sx={{ fontWeight: 600, flexShrink: 0, maxWidth: "65%" }}>
          {item.label}
        </Typography>
        {description ? (
          <Typography component="span" variant="body2" noWrap sx={scheme((c) => ({ color: c.mutedText, minWidth: 0 }))}>
            {description}
          </Typography>
        ) : null}
      </Box>
      {item.checked ? <CheckIcon fontSize="small" sx={{ flexShrink: 0 }} /> : null}
    </ButtonBase>
  );
}

export function ComposerAddSearch({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  const { scheme } = useChatKitStyles();
  return (
    <InputBase
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      fullWidth
      startAdornment={<SearchOutlinedIcon fontSize="small" sx={{ mr: 1 }} />}
      inputProps={{ "aria-label": placeholder, [ADD_STOP]: "" }}
      sx={scheme((c) => ({ px: 1, py: 0.25, mb: 0.5, borderRadius: 1, border: 1, borderColor: c.border, color: c.text, fontSize: 14 }))}
    />
  );
}

/** A quiet line inside a section: the empty text, or "Loading" with a small spinner. */
export function ComposerAddNote({ children, busy }: { children: ReactNode; busy?: boolean }) {
  const { scheme } = useChatKitStyles();
  return (
    <Typography
      variant="body2"
      role={busy ? "status" : "presentation"}
      sx={scheme((c) => ({ display: "flex", alignItems: "center", gap: 1, px: 1, py: 0.75, color: c.mutedText }))}
    >
      {busy ? <CircularProgress size={14} color="inherit" aria-hidden /> : null}
      {children}
    </Typography>
  );
}
