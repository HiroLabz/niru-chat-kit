import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import Popover from "@mui/material/Popover";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import TuneIcon from "@mui/icons-material/Tune";
import { Link as RouterLink } from "react-router-dom";

const SPEEDS = [0.5, 1, 2] as const;

type Props = {
  dark: boolean;
  onToggleDark: () => void;
  custom: boolean;
  onCustomChange: (on: boolean) => void;
  speed: number;
  onSpeedChange: (speed: number) => void;
  onHelp: () => void;
};

/**
 * The demo's top bar. Wide: the back link, the title, then the help button and the three
 * settings in a row. Narrow (below the `md` breakpoint): the back link, the title and one
 * settings button on one line, and the settings open in a small panel.
 */
export function DemoTopBar({ dark, onToggleDark, custom, onCustomChange, speed, onSpeedChange, onHelp }: Props) {
  const theme = useTheme();
  const narrow = useMediaQuery(theme.breakpoints.down("md"));
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  const darkSwitch = <FormControlLabel control={<Switch size="small" checked={dark} onChange={onToggleDark} />} label="Dark mode" />;
  const customSwitch = <FormControlLabel control={<Switch size="small" checked={custom} onChange={(_event, on) => onCustomChange(on)} />} label="Custom colours" />;
  const speeds = (
    <ToggleButtonGroup size="small" exclusive value={speed} onChange={(_event, next: number | null) => next && onSpeedChange(next)} aria-label="Reply speed">
      {SPEEDS.map((value) => (
        <ToggleButton key={value} value={value} aria-label={`${value} times speed`} sx={{ px: 1.25, py: 0.25 }}>
          {value}x
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );

  return (
    <Box component="header" sx={{ display: "flex", alignItems: "center", gap: { xs: 1, md: 1.5 }, px: { xs: 1, md: 2 }, py: 1, minWidth: 0, borderBottom: 1, borderColor: "divider", bgcolor: "background.paper" }}>
      {narrow ? (
        <IconButton component={RouterLink} to="/" aria-label="Back to the docs" size="small" color="inherit">
          <ArrowBackIcon />
        </IconButton>
      ) : (
        <Button component={RouterLink} to="/" startIcon={<ArrowBackIcon />} size="small" color="inherit">
          Docs
        </Button>
      )}
      <Typography component="h1" variant="subtitle1" noWrap sx={{ fontWeight: 700, mr: "auto", minWidth: 0 }}>
        niru-chat-kit live demo
      </Typography>
      {narrow ? (
        <>
          <IconButton aria-label="Demo settings" aria-haspopup="dialog" aria-expanded={Boolean(anchor)} onClick={(event) => setAnchor(event.currentTarget)}>
            <TuneIcon />
          </IconButton>
          <Popover open={Boolean(anchor)} anchorEl={anchor} onClose={() => setAnchor(null)} anchorOrigin={{ vertical: "bottom", horizontal: "right" }} transformOrigin={{ vertical: "top", horizontal: "right" }}>
            <Stack role="group" aria-label="Demo settings" spacing={0.5} sx={{ p: 2, alignItems: "flex-start" }}>
              <Button
                size="small"
                onClick={() => {
                  setAnchor(null);
                  onHelp();
                }}
              >
                What can I try?
              </Button>
              {darkSwitch}
              {customSwitch}
              {speeds}
            </Stack>
          </Popover>
        </>
      ) : (
        <>
          <Button size="small" onClick={onHelp}>
            What can I try?
          </Button>
          {darkSwitch}
          {customSwitch}
          {speeds}
        </>
      )}
    </Box>
  );
}
