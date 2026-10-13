"use client";

/**
 * The approval choice in the composer's row: a quiet text button with the current option's
 * icon and label that opens a small menu of choices ("Ask for approval", "Approve for me",
 * "Full access"). The kit only shows and reports the choice; the app decides what each means.
 * On a narrow composer the button leaves the row and the choices appear in More as radio items.
 */

import { useId, useState, type ReactNode } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import CheckIcon from "@mui/icons-material/Check";
import { useChatKitStyles } from "../theme";

export type ComposerApprovalOption = {
  value: string;
  label: string;
  /** Grey text under the label. */
  description?: string;
  icon?: ReactNode;
  /** `"warning"` draws the label and description in the warning colour, for an option that gives up a safeguard. */
  tone?: "default" | "warning";
};

export type ComposerApprovalMode = {
  /** The `value` of the option in force. */
  value: string;
  options: ComposerApprovalOption[];
  /** Called with the chosen option's `value`; not called for the one already in force. */
  onChange: (value: string) => void;
  /** The menu's heading and the start of the button's accessible name; default "How should actions be approved?". */
  heading?: string;
  /** A link button at the right of the heading. The menu closes when it is pressed. */
  learnMore?: { label: string; onClick: () => void };
  /** Greys the button. */
  disabled?: boolean;
  /** Shown as the button's tooltip while it is disabled. */
  disabledReason?: string;
  /** The start of the button's accessible name, "<buttonLabel>: <current label>", in place of the heading. */
  buttonLabel?: string;
  /**
   * Draws the row button as a round icon button (the size of the plus button) showing only the current option's icon.
   * The accessible name stays "<heading>: <label>", the tooltip is the current option's label, and a `warning` tone
   * still colours the icon. An option without an icon shows its label as before. The menu is unchanged.
   */
  iconOnly?: boolean;
};

function useTone() {
  const { scheme } = useChatKitStyles();
  return (option: ComposerApprovalOption) => scheme((c) => ({ color: option.tone === "warning" ? c.warning : c.text }));
}

export function ComposerApprovalButton({ approval, heading, disabled }: { approval: ComposerApprovalMode; heading: string; disabled?: boolean }) {
  const { scheme } = useChatKitStyles();
  const tone = useTone();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const menuId = useId();
  const current = approval.options.find((option) => option.value === approval.value);
  const locked = Boolean(disabled || approval.disabled);
  const name = `${approval.buttonLabel ?? heading}: ${current?.label ?? approval.value}`;
  const close = () => setAnchor(null);
  const asIcon = Boolean(approval.iconOnly && current?.icon);
  const tip = locked ? (approval.disabledReason ?? "") : asIcon ? (current?.label ?? "") : "";
  return (
    <>
      <Tooltip title={tip}>
        <span>
          {asIcon && current ? (
            <IconButton
              size="small"
              aria-label={name}
              aria-haspopup="menu"
              aria-expanded={Boolean(anchor)}
              aria-controls={anchor ? menuId : undefined}
              data-chat="approval-mode"
              disabled={locked}
              onClick={(event) => setAnchor(event.currentTarget)}
              sx={scheme((c) => ({ border: 1, borderColor: c.border, color: current.tone === "warning" ? c.warning : c.mutedText, "&:hover": { bgcolor: c.muted } }))}
            >
              {current.icon}
            </IconButton>
          ) : (
          <Button
            size="small"
            color="inherit"
            aria-label={name}
            aria-haspopup="menu"
            aria-expanded={Boolean(anchor)}
            aria-controls={anchor ? menuId : undefined}
            data-chat="approval-mode"
            disabled={locked}
            startIcon={current?.icon}
            onClick={(event) => setAnchor(event.currentTarget)}
            sx={[scheme((c) => ({ textTransform: "none", whiteSpace: "nowrap", color: c.mutedText, minWidth: 0 })), current ? tone(current) : {}]}
          >
            {current?.label ?? approval.value}
          </Button>
          )}
        </span>
      </Tooltip>
      <Menu
        id={menuId}
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={close}
        slotProps={{
          paper: { sx: scheme((c) => ({ bgcolor: c.surface, color: c.text, minWidth: 280, maxWidth: 360 })) },
          list: {
            subheader: (
              <Box component="li" role="presentation" sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, px: 2, py: 0.75, listStyle: "none" }}>
                <Typography variant="subtitle2" component="span">
                  {heading}
                </Typography>
                {approval.learnMore ? (
                  <Button
                    size="small"
                    onClick={() => {
                      close();
                      approval.learnMore?.onClick();
                    }}
                    sx={scheme((c) => ({ textTransform: "none", color: c.accent, textDecoration: "underline", minWidth: 0, whiteSpace: "nowrap" }))}
                  >
                    {approval.learnMore.label}
                  </Button>
                ) : null}
              </Box>
            ),
          },
        }}
      >
        {approval.options.map((option) => {
          const selected = option.value === approval.value;
          return (
            <MenuItem
              key={option.value}
              role="menuitemradio"
              aria-checked={selected}
              onClick={() => {
                close();
                if (!selected) approval.onChange(option.value);
              }}
              sx={tone(option)}
            >
              {option.icon ? <ListItemIcon sx={{ color: "inherit" }}>{option.icon}</ListItemIcon> : null}
              <ListItemText
                primary={option.label}
                secondary={option.description}
                slotProps={{ primary: { sx: { fontWeight: 600 } }, secondary: { sx: { color: option.tone === "warning" ? "inherit" : "text.secondary", whiteSpace: "normal" } } }}
              />
              {selected ? <CheckIcon fontSize="small" sx={{ ml: 2 }} /> : null}
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
}

/** The choices as radio rows under the heading, for a narrow row's More menu. */
export function ComposerApprovalMoreItems({
  approval,
  heading,
  disabled,
  closeMenu,
}: {
  approval: ComposerApprovalMode;
  heading: string;
  disabled?: boolean;
  closeMenu: () => void;
}) {
  const tone = useTone();
  const locked = Boolean(disabled || approval.disabled);
  return [
    <MenuItem key="heading" disabled role="presentation" sx={{ "&.Mui-disabled": { opacity: 1 }, typography: "caption", minHeight: 0, py: 0.5 }}>
      {approval.buttonLabel ?? heading}
    </MenuItem>,
    ...approval.options.map((option) => {
      const selected = option.value === approval.value;
      return (
        <MenuItem
          key={option.value}
          role="menuitemradio"
          aria-checked={selected}
          disabled={locked}
          onClick={() => {
            closeMenu();
            if (!selected) approval.onChange(option.value);
          }}
          sx={tone(option)}
        >
          <ListItemIcon sx={{ minWidth: 0, color: "inherit", visibility: selected ? "visible" : "hidden" }}>
            <CheckIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary={option.label} secondary={option.description} slotProps={{ secondary: { sx: { color: "inherit", opacity: 0.75, whiteSpace: "normal" } } }} sx={{ ml: 1 }} />
        </MenuItem>
      );
    }),
  ];
}
