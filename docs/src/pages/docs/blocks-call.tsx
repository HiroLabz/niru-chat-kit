import { useEffect, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import {
  createFakeVoiceSession,
  summariseCall,
  useLocalMedia,
  useVoiceSession,
  type FakeVoiceSession,
} from "@hiro/niru-chat-kit";
import { CallCard, CallStage, CallStrip, type CallVisual } from "@hiro/niru-chat-kit/mui";
import { example } from "../../components/Example";
import { C } from "../../components/Section";
import type { ComponentDoc } from "./types";
import raw from "./blocks-call.tsx?raw";

// #region call-stage
function StageExample() {
  const [visual, setVisual] = useState<CallVisual>("pill");
  const session = useMemo(
    () =>
      createFakeVoiceSession({
        phase: "listening",
        capabilities: { camera: true, screenShare: true, hold: true },
        transcript: [{ id: "a", speaker: "agent", text: "Good morning. What are we working on?", final: true, at: Date.now() }],
      }),
    []
  );
  useEffect(() => {
    session.script.simulateLevels(true);
    return () => session.script.stop();
  }, [session]);
  const snapshot = useVoiceSession(session);
  const script = session.script;
  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap", p: 1.5 }}>
        <Button size="small" onClick={() => script.setPhase("connecting", "microphone")}>Connecting</Button>
        <Button size="small" onClick={() => script.setPhase("listening")}>Listening</Button>
        <Button size="small" onClick={() => script.setPhase("thinking")}>Thinking</Button>
        <Button size="small" onClick={() => script.setPhase("speaking")}>Speaking</Button>
        <Button size="small" onClick={() => script.say("agent", "Here is a caption line.")}>Add caption</Button>
        <Button size="small" onClick={() => script.fail("audio-blocked")}>Audio blocked</Button>
        <Button size="small" onClick={() => script.fail("microphone-blocked")}>Mic blocked</Button>
        <Button size="small" onClick={() => script.fail("connection-lost")}>Connection lost</Button>
        <ToggleButtonGroup size="small" exclusive value={visual} onChange={(_event, next: CallVisual | null) => next && setVisual(next)} aria-label="Visual">
          <ToggleButton value="pill">Pill</ToggleButton>
          <ToggleButton value="orb">Orb</ToggleButton>
        </ToggleButtonGroup>
        <Typography variant="caption" sx={{ alignSelf: "center" }}>phase: {snapshot.phase}</Typography>
      </Stack>
      <Box sx={{ flex: 1, minHeight: 0 }}>
        <CallStage session={session} user={{ name: "Kio" }} agent={{ name: "Niru" }} visual={visual} autoFocus={false} onMinimise={() => undefined} />
      </Box>
    </Box>
  );
}
// #endregion

// #region call-strip-card
function StripAndCard() {
  const session = useMemo(() => {
    const fake = createFakeVoiceSession({ now: () => Date.now() - 247_000 });
    fake.script.say("user", "What is on my calendar today?");
    fake.script.say("agent", "You have two meetings: planning at 10 and a review at 3.");
    return fake;
  }, []);
  return (
    <Stack spacing={2}>
      <CallStrip session={session} agentName="Niru" userName="Kio" onExpand={() => undefined} />
      <CallCard summary={{ ...summariseCall(session.getSnapshot()), durationMs: 247_000 }} agentName="Niru" onCallAgain={() => undefined} />
    </Stack>
  );
}
// #endregion

// #region call-local-media
function LocalPreview() {
  const media = useLocalMedia();
  const session = useMemo<FakeVoiceSession>(
    () => createFakeVoiceSession({ capabilities: { camera: true, screenShare: true }, media: media.controller }),
    [media.controller]
  );
  return (
    <Box sx={{ height: "100%" }}>
      <CallStage session={session} agent={{ name: "Niru" }} autoFocus={false} />
    </Box>
  );
}
// #endregion

const IMPORT = `import { createFakeVoiceSession, useVoiceSession, useLocalMedia } from "@hiro/niru-chat-kit";\nimport { CallStage, CallStrip, CallCard } from "@hiro/niru-chat-kit/mui";`;

export const BLOCKS_CALL: Record<string, ComponentDoc> = {
  "call-mode": {
    summary: "A voice call screen in the style of Gemini Live: a dark stage with a glow rising from the bottom, a status line that follows the call, and a row of round buttons with a pill that moves with the voice. The kit has no voice service of its own. You connect yours by writing an object that follows the VoiceSession contract.",
    imports: IMPORT,
    api: [
      "CallStage",
      ["CallStageHeader", "CallStage.Header"],
      ["CallStageStatus", "CallStage.Status"],
      ["CallStageCaptions", "CallStage.Captions"],
      ["CallStageControls", "CallStage.Controls"],
      "VoiceLevelPill",
      "CallOrb",
      "CallControlButton",
      "CallStrip",
      "CallCard",
      "CallProblemScreen",
      "createFakeVoiceSession",
    ],
    examples: [
      example(raw, "call-stage", <StageExample />, {
        title: "The call screen on a pretend call",
        description: "Use the buttons to move the call through its states. The pill and the orb move with a simulated voice. Camera, share and hold show up because this pretend call says it supports them.",
        height: 640,
      }),
      example(raw, "call-strip-card", <StripAndCard />, {
        title: "The small bar and the card left in the chat",
        description: "While a call is minimised, the bar sits directly above the message box. Pass it to FullChat as aboveComposer. When the call ends, a card with the transcript goes into the conversation.",
        maxWidth: 520,
      }),
      example(raw, "call-local-media", <LocalPreview />, {
        title: "Camera and screen share, on this device only",
        description: "The buttons ask your browser for the camera or a screen. The preview stays on this page. Nothing is recorded or sent.",
        height: 520,
      }),
    ],
    notes: (
      <>
        <p>
          <C>VoiceSession</C> is the set of things your voice service must provide: <C>getSnapshot</C>, <C>subscribe</C>, <C>levels</C>, <C>setMuted</C>, <C>setCaptions</C>, <C>setCamera</C>, <C>setScreenShare</C>, <C>hold</C>, <C>resume</C>, <C>startAudio</C>, <C>end</C> and <C>retry</C>. The call screen draws a control only when the session&apos;s <C>capabilities</C> say it is supported. When a call is held, ended or fails, your code must switch the camera and screen share off. <C>useVoiceSession</C> asks again as a safety check.
        </p>
        <p>
          The call lives at the bottom of the chat, directly above the message box. <C>FullChat</C> and <C>Composer</C> take <C>onStartCall</C> for a round phone button next to Send. Leave it out while a call runs. <C>FullChat</C> also takes <C>aboveComposer</C> for the minimised <C>CallStrip</C>, which is as wide as the message box.
        </p>
        <p>
          Keyboard: Space mutes or unmutes unless a button has focus. Escape minimises when you pass <C>onMinimise</C>. End needs no confirmation. The status line is the one place a screen reader announces changes, so each change is read out once. Captions are not announced. With reduced motion switched on, the pill and the orb stay still.
        </p>
        <p>
          Camera and screen sharing use the browser&apos;s <C>getUserMedia</C> and <C>getDisplayMedia</C> through the <C>useLocalMedia</C> hook. They only appear in browsers that have them. A preview shown in a <C>video</C> element needs no change to your page&apos;s Content-Security-Policy. If your server sends a <C>Permissions-Policy</C> header, it must allow <C>camera</C> and <C>display-capture</C> for your own address.
        </p>
      </>
    ),
  },
};
