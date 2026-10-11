import { useCallback, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Switch from "@mui/material/Switch";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { ChatKitProvider } from "@hiro/niru-chat-kit/mui";
import { Link as RouterLink } from "react-router-dom";
import { useMode } from "../site/mode";
import { usePageTitle } from "../site/use-page-title";
import { BUILT_IN, SCRIPTED } from "./capabilities";
import { CUSTOM_TOKENS } from "./custom-tokens";
import { DemoCallLayer, DemoCallStrip } from "./DemoCallLayer";
import { DemoChat } from "./DemoChat";
import { useDemoCall } from "./use-demo-call";
import { useWorkspace } from "./use-workspace";

const SPEEDS = [0.5, 1, 2] as const;

/** The full-screen demo: every capability of the kit, driven by scripted runs, with no network. */
export default function DemoPage() {
  usePageTitle("Live demo");
  const { mode, toggle } = useMode();
  const [custom, setCustom] = useState(false);
  const [speed, setSpeed] = useState<number>(1);
  const [help, setHelp] = useState(false);
  const speedRef = useRef(1);
  speedRef.current = speed;
  const getSpeed = useCallback(() => speedRef.current, []);
  const workspace = useWorkspace(getSpeed);
  const call = useDemoCall(workspace.activeId);
  const main = useRef<HTMLElement>(null);

  return (
    <Box sx={{ height: "100dvh", display: "flex", flexDirection: "column", bgcolor: "background.default", color: "text.primary" }}>
      <Box
        component="a"
        href="#/demo"
        onClick={(event: React.MouseEvent) => {
          event.preventDefault();
          main.current?.focus();
        }}
        sx={{ position: "absolute", left: 8, top: -64, bgcolor: "background.paper", px: 2, py: 1, zIndex: 2000, "&:focus": { top: 8 } }}
      >
        Skip to the chat
      </Box>
      <Box component="header" sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1.5, px: 2, py: 1, borderBottom: 1, borderColor: "divider", bgcolor: "background.paper" }}>
        <Button component={RouterLink} to="/" startIcon={<ArrowBackIcon />} size="small" color="inherit">
          Docs
        </Button>
        <Typography component="h1" variant="subtitle1" sx={{ fontWeight: 700, mr: "auto" }}>
          niru-chat-kit live demo
        </Typography>
        <Button size="small" onClick={() => setHelp(true)}>
          What can I try?
        </Button>
        <FormControlLabel control={<Switch size="small" checked={mode === "dark"} onChange={toggle} />} label="Dark mode" />
        <FormControlLabel control={<Switch size="small" checked={custom} onChange={(_event, on) => setCustom(on)} />} label="Custom colours" />
        <ToggleButtonGroup size="small" exclusive value={speed} onChange={(_event, next: number | null) => next && setSpeed(next)} aria-label="Reply speed">
          {SPEEDS.map((value) => (
            <ToggleButton key={value} value={value} aria-label={`${value} times speed`} sx={{ px: 1.25, py: 0.25 }}>
              {value}x
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>
      <Box component="main" id="main" ref={main} tabIndex={-1} sx={{ flex: 1, minHeight: 0, display: "flex", outline: "none", position: "relative" }}>
        <ChatKitProvider tokens={custom ? CUSTOM_TOKENS : undefined}>
          <DemoChat
            key={workspace.activeId}
            conversation={workspace.active}
            callCards={call.cards.filter((card) => card.conversationId === workspace.activeId)}
            onCallAgain={call.start}
            onStartCall={call.session ? undefined : call.start}
            aboveComposer={<DemoCallStrip call={call} />}
            onFirstMessage={workspace.adopt}
            history={{
              items: workspace.items,
              activeId: workspace.items.some((item) => item.id === workspace.activeId) ? workspace.activeId : null,
              onSelect: workspace.select,
              onNew: workspace.newChat,
              identity: { name: "Demo agent", initial: "D", subtitle: "Scripted, runs in your browser" },
              ...HISTORY_FEATURES,
              onRename: workspace.rename,
              onDelete: workspace.remove,
            }}
          />
          <DemoCallLayer call={call} />
        </ChatKitProvider>
      </Box>
      <Dialog open={help} onClose={() => setHelp(false)} maxWidth="sm" fullWidth aria-labelledby="demo-help-title">
        <DialogTitle id="demo-help-title">What can I try?</DialogTitle>
        <DialogContent>
          <Typography variant="subtitle2">Scripted replies (press a suggestion in the chat, or type its keyword)</Typography>
          <List dense>
            {SCRIPTED.map((item) => (
              <ListItem key={item.starter} disableGutters>
                <ListItemText primary={item.starter} secondary={item.shows} />
              </ListItem>
            ))}
          </List>
          <Typography variant="subtitle2">Things the kit does for you</Typography>
          <List dense>
            {BUILT_IN.map((text) => (
              <ListItem key={text} disableGutters>
                <ListItemText primary={text} />
              </ListItem>
            ))}
          </List>
          <Typography variant="subtitle2">Call mode</Typography>
          <List dense>
            <ListItem disableGutters>
              <ListItemText primary="The call button (next to Send)" secondary="Press the round phone button next to Send to start a scripted voice call. You will see it listen, think and speak, with captions. You can turn on your camera or share your screen to preview them. The browser asks permission first, and nothing leaves your device. Press the minimise button to shrink the call to a bar above the message box. Press End to finish, and the chat keeps a card with the transcript." />
            </ListItem>
          </List>
          <Typography variant="body2" color="text.secondary">
            Nothing here calls an AI model or the network. Every answer is a recording, played back as the same kind of frames a real backend would send.
          </Typography>
        </DialogContent>
      </Dialog>
    </Box>
  );
}

const HISTORY_FEATURES = { searchable: true, grouped: true } as const;
