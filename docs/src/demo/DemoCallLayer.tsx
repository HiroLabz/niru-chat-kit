import { useEffect, useRef, useState } from "react";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import MenuIcon from "@mui/icons-material/Menu";
import { summariseCall, useVoiceSession, type VoiceSession } from "@hiro/niru-chat-kit";
import { AgentAvatar, CallStage, CallStrip } from "@hiro/niru-chat-kit/mui";
import type { DemoCall } from "./use-demo-call";

const AGENT = { name: "Demo agent" };

function MenuSlot({ onMinimise }: { onMinimise: () => void }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  return (
    <>
      <IconButton aria-label="Menu" onClick={(event) => setAnchor(event.currentTarget)} sx={{ color: "inherit" }}>
        <MenuIcon />
      </IconButton>
      <Menu anchorEl={anchor} open={anchor !== null} onClose={() => setAnchor(null)}>
        <MenuItem
          onClick={() => {
            setAnchor(null);
            onMinimise();
          }}
        >
          Minimise call
        </MenuItem>
        <MenuItem disabled sx={{ whiteSpace: "normal", maxWidth: 260, opacity: "1 !important" }}>
          Your camera and screen are only previewed here. Nothing leaves your device.
        </MenuItem>
      </Menu>
    </>
  );
}

/** Closes the call into a card the moment the session ends, then the layer unmounts. */
function CallEndWatcher({ session, onEnded }: { session: VoiceSession; onEnded: DemoCall["finish"] }) {
  const snapshot = useVoiceSession(session);
  const done = useRef(false);
  useEffect(() => {
    if (snapshot.phase !== "ended" || done.current) return;
    done.current = true;
    onEnded(summariseCall(snapshot));
  }, [snapshot, onEnded]);
  return null;
}

/**
 * Draws the demo's call over the chat: the full-screen `CallStage` while it is open. While minimised
 * it draws nothing: the chat shows the `CallStrip` above its composer (see `DemoCallStrip`).
 * On End it hands a summary to the chat as a card.
 */
export function DemoCallLayer({ call }: { call: DemoCall }) {
  const { session } = call;
  if (!session) return null;
  return (
    <>
      <CallEndWatcher session={session} onEnded={call.finish} />
      {call.minimised ? null : (
        <Box sx={{ position: "absolute", inset: 0, zIndex: 5 }}>
          <CallStage
            session={session}
            agent={{ ...AGENT, avatar: <AgentAvatar avatar={{ kind: "preset", preset_id: "hiro-02" }} name={AGENT.name} size={96} /> }}
            user={{ avatar: <Avatar sx={{ width: 36, height: 36, fontSize: 16 }}>V</Avatar> }}
            menu={<MenuSlot onMinimise={call.minimise} />}
            onMinimise={call.minimise}
            onClose={() => session.end()}
          />
        </Box>
      )}
    </>
  );
}

/** The minimised call, for `FullChat`'s `aboveComposer` slot. Null unless a call is running and minimised. */
export function DemoCallStrip({ call }: { call: DemoCall }) {
  if (!call.session || !call.minimised) return null;
  return <CallStrip session={call.session} agentName={AGENT.name} onExpand={call.expand} />;
}
