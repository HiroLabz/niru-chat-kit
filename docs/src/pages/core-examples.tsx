import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import {
  parseSseStream,
  useChatStream,
  type AgentStreamEvent,
  type ChatTransport,
} from "@hiro/niru-chat-kit";
import { Composer, Conversation } from "@hiro/niru-chat-kit/mui";
import { example } from "../components/Example";
import { createReplayTransport, type DemoParams } from "../demo/replay-transport";
import { SITE_MONO } from "../site/theme";
import raw from "./core-examples.tsx?raw";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// #region echo-transport
/** A transport that answers by echoing your message, one word at a time. Replace the body with a fetch to your backend. */
const echoTransport: ChatTransport = {
  async send(turn, signal) {
    async function* frames(): AsyncGenerator<AgentStreamEvent> {
      yield { event: "status", data: { status: "started", conversation_id: "c1", thread_id: "t1", principal_id: "me", run_id: "run-1" } };
      for (const word of `You said: ${turn.message}`.split(" ")) {
        await sleep(120);
        if (signal.aborted) return;
        yield { event: "token", data: { text: `${word} ` } };
      }
      yield { event: "result", data: { status: "completed", message: `You said: ${turn.message}`, conversation_id: "c1", thread_id: "t1" } };
      yield { event: "done", data: {} };
    }
    return frames();
  },
  stop: async () => false,
};
// #endregion

function FrameLog({ frames }: { frames: string[] }) {
  return (
    <Box
      component="pre"
      aria-label="Frames received"
      sx={{ m: 0, p: 1.5, borderRadius: 1, border: 1, borderColor: "divider", fontFamily: SITE_MONO, fontSize: 12, height: 260, overflow: "auto", whiteSpace: "pre-wrap" }}
    >
      {frames.length ? frames.join("\n") : "Send a message to see its frames here."}
    </Box>
  );
}

function useLoggedTransport(make: (log: (frame: AgentStreamEvent) => void) => ChatTransport<DemoParams>) {
  const [frames, setFrames] = useState<string[]>([]);
  const [transport] = useState(() => make((frame) => setFrames((all) => [...all.slice(-80), `${frame.event} ${JSON.stringify(frame.data)}`])));
  return { frames, transport, clear: () => setFrames([]) };
}

function Runner({ make }: { make: (log: (frame: AgentStreamEvent) => void) => ChatTransport<DemoParams> }) {
  const { frames, transport } = useLoggedTransport(make);
  const { messages, status, send } = useChatStream(transport);
  const [draft, setDraft] = useState("");
  return (
    <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" } }}>
      <Box sx={{ minWidth: 0 }}>
        <Conversation messages={messages} typing={status === "connecting"} emptyState={<Typography color="text.secondary" sx={{ p: 2 }}>Type anything to start.</Typography>} />
        <Composer
          value={draft}
          onChange={setDraft}
          busy={status === "streaming" || status === "connecting"}
          onSubmit={() => {
            void send(draft);
            setDraft("");
          }}
        />
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="overline">Frames received (chat status: {status})</Typography>
        <FrameLog frames={frames} />
      </Box>
    </Box>
  );
}

/** Wraps the transport so every frame it yields is also logged. */
function logging(transport: ChatTransport<DemoParams>, log: (frame: AgentStreamEvent) => void): ChatTransport<DemoParams> {
  return {
    ...transport,
    send: async (turn, signal) => {
      const inner = await transport.send(turn, signal);
      return (async function* () {
        for await (const frame of inner) {
          log(frame);
          yield frame;
        }
      })();
    },
  };
}

function EchoRun() {
  return <Runner make={(log) => logging(echoTransport, log)} />;
}

// #region use-chat-stream
function ReplayRun() {
  // This transport replays recorded frames without a network. `onFrame` lets the log on the right watch them go by.
  return <Runner make={(log) => createReplayTransport({ onFrame: log })} />;
}
// #endregion

const SAMPLE_SSE = `event: status
data: {"status":"started","conversation_id":"c1","thread_id":"t1","principal_id":"me"}

event: token
data: {"text":"Hello "}

event: token
data: {"text":"world"}

event: result
data: {"status":"completed","message":"Hello world"}

event: done
data: {}

`;

// #region parse-sse
/** Turns a response body (here a string standing in for one) into frames. */
async function parse(text: string): Promise<AgentStreamEvent[]> {
  const body = new Blob([text]).stream();
  const out: AgentStreamEvent[] = [];
  for await (const frame of parseSseStream(body)) out.push(frame);
  return out;
}
// #endregion

function SseParser() {
  const [text, setText] = useState(SAMPLE_SSE);
  const [frames, setFrames] = useState<AgentStreamEvent[]>([]);
  return (
    <Stack spacing={1.5}>
      <TextField multiline minRows={8} label="text/event-stream body" value={text} onChange={(e) => setText(e.target.value)} slotProps={{ htmlInput: { style: { fontFamily: SITE_MONO, fontSize: 12 } } }} />
      <Box>
        <Button variant="contained" size="small" onClick={() => void parse(text).then(setFrames)}>
          Parse
        </Button>
      </Box>
      <FrameLog frames={frames.map((frame) => `${frame.event} ${JSON.stringify(frame.data)}`)} />
    </Stack>
  );
}

export const CORE_EXAMPLES = {
  echo: example(raw, "echo-transport", <EchoRun />, {
    title: "A transport short enough to read in one go",
    description: "Send a message. The right-hand pane lists the frames this transport sent, and the left side shows the conversation that useChatStream built from them.",
  }),
  replay: example(raw, "use-chat-stream", <ReplayRun />, {
    title: "The same hook with the demo transport",
    description: "This is the transport the live demo uses: recorded frames, no network. Try typing markdown, code, tools or sources to see more kinds of frames.",
  }),
  sse: example(raw, "parse-sse", <SseParser />, {
    title: "Reading a text/event-stream body",
    description: "If your backend sends server-sent events, parseSseStream turns the response body into frames. Edit the text and press Parse.",
  }),
};
