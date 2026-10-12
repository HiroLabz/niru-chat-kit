import { useCallback, useMemo, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import { ChatKitProvider, ConversationHeader, type ChatHistoryTab, type SavedItem } from "@hiro/niru-chat-kit/mui";
import type { ChatMessage } from "@hiro/niru-chat-kit";
import { useMode } from "../site/mode";
import { usePageTitle } from "../site/use-page-title";
import { BUILT_IN, SCRIPTED } from "./capabilities";
import { CUSTOM_TOKENS } from "./custom-tokens";
import { DemoCallLayer, DemoCallStrip } from "./DemoCallLayer";
import { DemoChat } from "./DemoChat";
import { DemoTopBar } from "./DemoTopBar";
import { useDemoCall } from "./use-demo-call";
import { resetLibrary, useLibrary } from "./use-library";
import { useWorkspace } from "./use-workspace";

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
  const library = useLibrary(workspace.seedLibrary);
  const [tab, setTab] = useState<ChatHistoryTab>("chats");
  const [highlightMessage, setHighlightMessage] = useState<string | undefined>();
  const [highlightChat, setHighlightChat] = useState<string | undefined>();

  const activeListed = workspace.items.some((item) => item.id === workspace.activeId);
  const activeTitle = workspace.active.title || "New conversation";
  // Pinned chats first, newest pin first; the sidebar draws them in a Pinned group.
  const rows = useMemo(() => {
    const byId = new Map(workspace.items.map((item) => [item.id, item]));
    const pinned = library.pinned.flatMap((id) => {
      const item = byId.get(id);
      return item ? [{ ...item, pinned: true }] : [];
    });
    return [...pinned, ...workspace.items.filter((item) => !library.pinned.includes(item.id))];
  }, [workspace.items, library.pinned]);
  // A saved item whose chat is gone (a chat from an earlier visit, or a deleted one) is not shown.
  const saved = useMemo(
    () => library.saved.filter((item) => workspace.items.some((chat) => chat.id === item.conversationId)),
    [library.saved, workspace.items]
  );
  const chatSaved = saved.some((item) => item.kind === "conversation" && item.conversationId === workspace.activeId);
  // A reply streamed in this visit has a temporary id; its server id is the one that survives reopening the chat.
  const isMessageSaved = useCallback(
    (message: ChatMessage) => saved.some((item) => item.kind === "message" && item.messageId === (message.serverId ?? message.id)),
    [saved]
  );

  /** Clears the highlight, then sets it a moment later, so opening the same item twice flashes twice. */
  const flash = useCallback((set: (value: string | undefined) => void, value: string) => {
    set(undefined);
    window.setTimeout(() => {
      set(value);
      window.setTimeout(() => set(undefined), 3200);
    }, 30);
  }, []);

  const openSaved = (item: SavedItem) => {
    workspace.select(item.conversationId);
    if (item.kind === "message" && item.messageId) {
      flash(setHighlightMessage, item.messageId);
    } else {
      setTab("chats");
      flash(setHighlightChat, item.conversationId);
    }
  };

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
      <DemoTopBar dark={mode === "dark"} onToggleDark={toggle} custom={custom} onCustomChange={setCustom} speed={speed} onSpeedChange={setSpeed} onHelp={() => setHelp(true)} />
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
            header={
              <ConversationHeader
                title={activeTitle}
                pinned={library.pinned.includes(workspace.activeId)}
                onPinChange={activeListed ? (next) => library.setPinned(workspace.activeId, next) : undefined}
                saved={chatSaved}
                onSaveChange={activeListed ? () => library.toggleSavedChat(workspace.activeId, activeTitle) : undefined}
              />
            }
            highlightMessageId={highlightMessage}
            onSaveMessage={(message) => library.toggleSavedMessage(workspace.activeId, activeTitle, message.serverId ?? message.id, message.text)}
            isMessageSaved={isMessageSaved}
            history={{
              items: rows,
              activeId: workspace.items.some((item) => item.id === workspace.activeId) ? workspace.activeId : null,
              onSelect: workspace.select,
              onNew: workspace.newChat,
              identity: { name: "Demo agent", initial: "D", subtitle: "Scripted, runs in your browser" },
              ...HISTORY_FEATURES,
              onRename: workspace.rename,
              onDelete: workspace.remove,
              onPin: library.setPinned,
              saved,
              onOpenSaved: openSaved,
              onUnsave: library.unsave,
              tab,
              onTabChange: setTab,
              highlightId: highlightChat,
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
          <Typography variant="subtitle2">Pin and save</Typography>
          <List dense>
            <ListItem disableGutters>
              <ListItemText primary="Pin, save and the Saved tab" secondary="Open a chat's menu in the list to pin it. Press the pin or the bookmark above the chat to pin or save the whole chat. Press the bookmark under a reply to save just that reply. The Saved tab lists both. Opening a saved reply takes you to it and highlights it." />
            </ListItem>
          </List>
          <Typography variant="body2" color="text.secondary">
            Pins and saved items are kept in this browser and come back when you reload.{" "}
            <Button
              size="small"
              variant="text"
              onClick={() => {
                resetLibrary();
                window.location.reload();
              }}
              sx={{ p: 0, minWidth: 0, textTransform: "none", verticalAlign: "baseline" }}
            >
              Reset demo
            </Button>
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Nothing here calls an AI model or the network. Every answer is a recording, played back as the same kind of frames a real backend would send.
          </Typography>
        </DialogContent>
      </Dialog>
    </Box>
  );
}

const HISTORY_FEATURES = { searchable: true, grouped: true } as const;
