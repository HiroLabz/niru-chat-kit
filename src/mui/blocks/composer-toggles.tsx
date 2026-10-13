"use client";

/** Toggle chips and the "More" menu in the composer's actions row. */

import { useId, useState, type ReactNode } from "react";
import Badge from "@mui/material/Badge";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Tooltip from "@mui/material/Tooltip";
import { alpha } from "@mui/material/styles";
import CheckIcon from "@mui/icons-material/Check";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import { useChatKitStyles } from "../theme";

export type ComposerToggle = {
  id: string;
  label: string;
  icon: ReactNode;
  active: boolean;
  onToggle: () => void;
  disabled?: boolean;
};

export function ComposerToggles({ toggles, disabled }: { toggles: ComposerToggle[]; disabled?: boolean }) {
  const { scheme } = useChatKitStyles();
  return (
    <>
      {toggles.map((toggle) => (
        <Chip
          key={toggle.id}
          size="small"
          label={toggle.label}
          icon={<span style={{ display: "inline-flex" }}>{toggle.icon}</span>}
          aria-pressed={toggle.active}
          disabled={disabled || toggle.disabled}
          onClick={toggle.onToggle}
          variant={toggle.active ? "filled" : "outlined"}
          sx={scheme((c) => ({
            color: toggle.active ? c.accent : c.mutedText,
            borderColor: toggle.active ? alpha(c.accent, 0.7) : c.border,
            bgcolor: toggle.active ? alpha(c.accent, 0.12) : "transparent",
            "&:hover": { bgcolor: alpha(c.accent, 0.16) },
            "& .MuiChip-icon": { color: "inherit" },
          }))}
        />
      ))}
    </>
  );
}

/** What a More-menu slot receives: close the menu (for an item that finishes on click). */
export type ComposerMoreContext = { closeMenu: () => void };

/**
 * The More menu. `leadItems` are the composer's own items for a narrow row (voice input), then `narrowItems`
 * are the app's, then `toggles` (the toggle chips when the row is too narrow for them: each becomes a checkable
 * item, `role="menuitemcheckbox"`), then a divider, then `children`.
 * A small dot marks the button while a toggle inside is on, and the accessible name says how many ("More, 1 on").
 */
export function ComposerMoreMenu({
  children,
  label = "More",
  disabled,
  toggles,
  leadItems,
  narrowItems,
}: {
  children?: ReactNode;
  label?: string;
  disabled?: boolean;
  toggles?: ComposerToggle[];
  leadItems?: (context: ComposerMoreContext) => ReactNode;
  narrowItems?: ReactNode | ((context: ComposerMoreContext) => ReactNode);
}) {
  const { scheme } = useChatKitStyles();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const menuId = useId();
  const closeMenu = () => setAnchor(null);
  const context: ComposerMoreContext = { closeMenu };
  const activeCount = toggles?.filter((toggle) => toggle.active).length ?? 0;
  const name = activeCount ? `${label}, ${activeCount} on` : label;
  const appItems = typeof narrowItems === "function" ? narrowItems(context) : narrowItems;
  const hasCommon = Boolean(toggles?.length) || Boolean(leadItems) || Boolean(appItems);
  return (
    <>
      <Tooltip title={label}>
        <span>
          <Badge
            variant="dot"
            invisible={!activeCount}
            data-chat="more-active"
            sx={scheme((c) => ({ "& .MuiBadge-badge": { bgcolor: c.accent, top: 4, right: 4 } }))}
          >
            <IconButton
              size="small"
              aria-label={name}
              aria-haspopup="menu"
              aria-expanded={Boolean(anchor)}
              aria-controls={anchor ? menuId : undefined}
              disabled={disabled}
              onClick={(event) => setAnchor(event.currentTarget)}
            >
              <MoreHorizIcon fontSize="small" />
            </IconButton>
          </Badge>
        </span>
      </Tooltip>
      <Menu id={menuId} anchorEl={anchor} open={Boolean(anchor)} onClose={closeMenu}>
        {leadItems?.(context)}
        {appItems}
        {toggles?.map((toggle) => (
          <MenuItem
            key={toggle.id}
            role="menuitemcheckbox"
            aria-checked={toggle.active}
            disabled={toggle.disabled}
            onClick={toggle.onToggle}
          >
            <ListItemIcon sx={{ color: "inherit" }}>{toggle.icon}</ListItemIcon>
            <ListItemText>{toggle.label}</ListItemText>
            {toggle.active ? <CheckIcon fontSize="small" sx={{ ml: 2 }} /> : null}
          </MenuItem>
        ))}
        {hasCommon && children ? <Divider component="li" /> : null}
        {children}
      </Menu>
    </>
  );
}
