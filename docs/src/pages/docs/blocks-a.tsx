import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import LanguageIcon from "@mui/icons-material/Language";
import { createFakeVoiceSession, useChatStream, type SlashCommand } from "@hiro/niru-chat-kit";
import {
  CallStrip,
  ChatEmptyState,
  Composer,
  ComposerPills,
  Conversation,
  ConversationHeader,
  FullChat,
  MessageNotes,
  SuggestionPills,
  type ComposerAttachment,
  type ComposerToggle,
} from "@hiro/niru-chat-kit/mui";
import { example } from "../../components/Example";
import { C } from "../../components/Section";
import { createReplayTransport } from "../../demo/replay-transport";
import { STARTERS } from "../../demo/scenarios";
import { ALL_ACTIONS, NOOP, SETTLED_TURN, STOPPED_TURN, STREAMING_TURN, TOOL_RUNNING_TURN, UNGROUNDED_TURN, USER_TURN, WAITING_TURN } from "../../fixtures/messages";
import type { ComponentDoc } from "./types";
import raw from "./blocks-a.tsx?raw";

// #region conversation-states
function ConversationStates() {
  return (
    <Stack spacing={3}>
      <Conversation messages={[USER_TURN, STREAMING_TURN]} />
      <Conversation messages={[USER_TURN, WAITING_TURN]} onStop={() => undefined} />
      <Conversation messages={[USER_TURN, TOOL_RUNNING_TURN]} />
      <Conversation messages={[USER_TURN, SETTLED_TURN]} turnActions={ALL_ACTIONS} />
      <Conversation messages={[STOPPED_TURN, UNGROUNDED_TURN]} />
    </Stack>
  );
}
// #endregion

// #region conversation-highlight
function HighlightExample() {
  const [target, setTarget] = useState<string | undefined>();
  return (
    <Stack spacing={1.5}>
      <Stack direction="row" spacing={1}>
        <Button size="small" variant="outlined" onClick={() => setTarget(USER_TURN.id)}>Highlight the question</Button>
        <Button size="small" variant="outlined" onClick={() => setTarget(SETTLED_TURN.id)}>Highlight the reply</Button>
        <Button size="small" onClick={() => setTarget(undefined)}>Clear</Button>
      </Stack>
      <Box sx={{ height: 300, display: "flex", flexDirection: "column" }}>
        <Conversation messages={[USER_TURN, SETTLED_TURN]} highlightMessageId={target} />
      </Box>
    </Stack>
  );
}
// #endregion

// #region message-notes
function Notes() {
  return (
    <Stack spacing={1}>
      <MessageNotes message={STOPPED_TURN} />
      <MessageNotes message={UNGROUNDED_TURN} />
    </Stack>
  );
}
// #endregion

// #region full-chat
function FullChatExample() {
  const [transport] = useState(() => createReplayTransport());
  const stream = useChatStream(transport, { branching: true });
  return (
    <FullChat
      stream={stream}
      agent={{ name: "Demo agent", initial: "D" }}
      greeting="Pick a starter or type a word such as markdown, code or error."
      starters={STARTERS.slice(0, 4)}
      onAttach={() => undefined}
    />
  );
}
// #endregion

// #region full-chat-header
function FullChatHeader() {
  const [transport] = useState(() => createReplayTransport());
  const stream = useChatStream(transport);
  const [pinned, setPinned] = useState(false);
  const [saved, setSaved] = useState(false);
  return (
    <FullChat
      stream={stream}
      agent={{ name: "Demo agent", initial: "D" }}
      greeting="The bar above this chat comes from the header prop."
      starters={STARTERS.slice(0, 2)}
      header={<ConversationHeader title="Refund policy" pinned={pinned} onPinChange={setPinned} saved={saved} onSaveChange={setSaved} />}
    />
  );
}
// #endregion

// #region full-chat-call
function FullChatCall() {
  const [transport] = useState(() => createReplayTransport());
  const stream = useChatStream(transport);
  const [calling, setCalling] = useState(false);
  const session = useMemo(() => createFakeVoiceSession(), []);
  return (
    <FullChat
      stream={stream}
      agent={{ name: "Demo agent", initial: "D" }}
      greeting="The phone button sits next to Send. While a call runs, hide the button and show the call strip above the message box."
      starters={STARTERS.slice(0, 2)}
      onStartCall={calling ? undefined : () => setCalling(true)}
      aboveComposer={calling ? <CallStrip session={session} agentName="Demo agent" onExpand={() => setCalling(false)} /> : null}
    />
  );
}
// #endregion

// #region composer-call
function ComposerCall() {
  const [draft, setDraft] = useState("");
  const [calls, setCalls] = useState(0);
  return (
    <Stack spacing={1}>
      <Composer value={draft} onChange={setDraft} onSubmit={() => setDraft("")} onStartCall={() => setCalls((n) => n + 1)} />
      <Typography variant="caption">Calls started: {calls}</Typography>
    </Stack>
  );
}
// #endregion

// #region composer-basic
function ComposerBasic() {
  const [draft, setDraft] = useState("");
  const [files, setFiles] = useState<ComposerAttachment[]>([{ id: "f1", name: "pricing.pdf", kind: "pdf" }]);
  return (
    <Stack spacing={2}>
      <Composer
        value={draft}
        onChange={setDraft}
        onSubmit={() => setDraft("")}
        attachments={files}
        onAttach={(added) => setFiles((all) => [...all, ...added.map((file) => ({ id: file.name, name: file.name }))])}
        onRemoveAttachment={(id) => setFiles((all) => all.filter((file) => file.id !== id))}
        settings={<Typography variant="body2">Run settings go here.</Typography>}
        suggestions={["Show me a table", "Show me an error"]}
        placeholder="Type to see suggestions"
      />
      <Composer value="" onChange={NOOP} onSubmit={NOOP} onStop={NOOP} busy />
    </Stack>
  );
}
// #endregion

// #region composer-slash-commands
const MY_COMMANDS: SlashCommand[] = [
  { id: "summarize", name: "summarize", description: "A short version of a text", insert: "Summarize the following in three bullet points:\n\n", group: "Your commands" },
  { id: "translate", name: "translate", description: "Into another language", insert: "Translate this into French: ", keywords: ["language"], group: "Your commands" },
  { id: "clear", name: "clear", description: "Empty the box", group: "Actions" },
];

function ComposerSlashCommands() {
  const [draft, setDraft] = useState("");
  const [log, setLog] = useState("Nothing picked yet");
  return (
    <Stack spacing={1} sx={{ pt: 14 }}>
      <Composer
        value={draft}
        onChange={setDraft}
        onSubmit={() => setDraft("")}
        placeholder="Type / to see the commands"
        commands={MY_COMMANDS}
        onCommand={(command) => setLog(command.insert ? `Inserted ${command.name}` : `Ran the ${command.name} action`)}
        onManageCommands={() => setLog("Opened the command editor")}
      />
      <Typography variant="caption">{log}</Typography>
    </Stack>
  );
}
// #endregion

// #region composer-voice-toggles
function ComposerVoiceAndToggles() {
  const [draft, setDraft] = useState("");
  const [web, setWeb] = useState(true);
  const toggles: ComposerToggle[] = [
    { id: "web", label: "Search the web", icon: <LanguageIcon fontSize="inherit" />, active: web, onToggle: () => setWeb((on) => !on) },
  ];
  return (
    <Composer
      value={draft}
      onChange={setDraft}
      onSubmit={() => setDraft("")}
      voice
      voiceLang="en-US"
      toggles={toggles}
      moreActions={[<MenuItem key="clear" onClick={() => setDraft("")}>Clear the draft</MenuItem>]}
    />
  );
}
// #endregion

// #region composer-voice-record
function ComposerRecording() {
  const [draft, setDraft] = useState("");
  const [onCall, setOnCall] = useState(false);
  // Your own call to a speech-to-text service goes here. Reject with an Error whose message is plain words.
  const transcribe = async (audio: Blob, info: { mime: string; durationMs: number }) => {
    await new Promise((resolve) => setTimeout(resolve, 800));
    return `(a ${Math.round(info.durationMs / 1000)} second ${info.mime} recording, ${audio.size} bytes)`;
  };
  return (
    <Stack spacing={1}>
      <Composer
        value={draft}
        onChange={setDraft}
        onSubmit={() => setDraft("")}
        voice={{ transcribe, maxDurationMs: 60_000, disabledReason: onCall ? "The microphone is in use on a call." : null }}
      />
      <Button size="small" onClick={() => setOnCall((on) => !on)}>{onCall ? "End the pretend call" : "Pretend a call uses the microphone"}</Button>
    </Stack>
  );
}
// #endregion

// #region composer-pills
function Pills() {
  const [last, setLast] = useState("");
  return (
    <Stack spacing={2}>
      <ComposerPills followUps={[]} starters={["Show me a table", "Write some code"]} hasMessages={false} onSend={setLast} onFill={setLast} />
      <ComposerPills followUps={["Explain the tokens"]} starters={[]} hasMessages onSend={setLast} onFill={setLast} />
      <SuggestionPills suggestions={["Shorter", "Longer", "Add an example"]} onSelect={setLast} label="Rewrite" />
      <Typography variant="caption" color="text.secondary">{last ? "Picked: " + last : "Starters fill the box. Follow-ups send straight away."}</Typography>
    </Stack>
  );
}
// #endregion

// #region chat-empty-state
function EmptyState() {
  return <ChatEmptyState greeting="Hi, I am the demo agent." agentInitial="D" suggestions={["Show me a table", "Show me an error"]} onSuggestion={() => undefined} />;
}
// #endregion

const IMPORT = (names: string) => `import { ${names} } from "@hiro/niru-chat-kit/mui";`;

export const BLOCKS_A: Record<string, ComponentDoc> = {
  conversation: {
    summary: "The scrolling list of messages. It follows new text as it arrives. Each reply shows its working steps, then the answer, then sources, files, notes and buttons. Use it when you build your own layout; FullChat already includes one.",
    imports: IMPORT("Conversation, MessageNotes"),
    api: ["Conversation", "ConversationTurn", "MessageNotes"],
    examples: [
      example(raw, "conversation-states", <ConversationStates />, { title: "The states a reply goes through", description: "In order: streaming, waiting for the first word, a tool running, finished with every button, then stopped and not backed by sources." }),
      example(raw, "conversation-highlight", <HighlightExample />, { title: "Scroll to a message and highlight it", description: "Press a button. The list scrolls to that message and tints it for about two and a half seconds. To highlight the same message again, press Clear first, because the highlight runs when the value changes." }),
      example(raw, "message-notes", <Notes />, { title: "Notes under an answer", description: "How a finished answer ended: cut short by Stop, or not backed by the sources it had." }),
    ],
    notes: <>To get the regenerate, edit and version buttons, pass <C>turnActions</C> from <C>useChatStream</C>. See <C>TurnActions</C> for what each button does. To bring a message into view, for example when someone opens a saved reply, pass its id as <C>highlightMessageId</C>. The list scrolls inside its own scroll area and never moves the page. With reduced motion turned on in the system, the message gets a still outline instead of a fade. Each message sits in an element with a <C>data-message-id</C> attribute.</>,
  },
  "full-chat": {
    summary: "A whole chat in one component: the message list, a greeting, an error banner with Retry, question cards when the agent waits for an answer, suggestion pills and the message box. Give it the result of useChatStream. We recommend starting here and swapping in smaller parts only when you need to.",
    imports: `import { useChatStream } from "@hiro/niru-chat-kit";\n${IMPORT("FullChat")}`,
    api: ["FullChat"],
    examples: [
      example(raw, "full-chat", <FullChatExample />, { title: "A live chat on made-up replies", description: "This is a real useChatStream run. Try a starter, regenerate a reply, type refund to get an approval card, or type error to get a failed run.", height: 560 }),
      example(raw, "full-chat-header", <FullChatHeader />, { title: "A header above the chat", description: "Pass a ConversationHeader, or any node, as header. It sits above the message list. Pin and Save only report the click; this example keeps the two values in state.", height: 520 }),
      example(raw, "full-chat-call", <FullChatCall />, { title: "A call button and the call strip", description: "onStartCall adds a round phone button next to Send. While a call is minimised, pass the CallStrip as aboveComposer. Click the strip here to dismiss it.", height: 560 }),
    ],
    notes: <>To scroll to one message and highlight it, pass its id as <C>highlightMessageId</C>; it works as on <C>Conversation</C>. For the phone button, pass <C>onStartCall</C>, and optionally <C>callLabel</C> and <C>callDisabled</C>. To put something such as a <C>CallStrip</C> directly above the message box or the question card, pass it as <C>aboveComposer</C>. To show a conversation list beside the chat, pass <C>{`sidebar={<ChatHistorySidebar {...props} />}`}</C>; <C>FullChat</C> does not import the sidebar, so an app that never passes one does not bundle it. Dropped files are caught on the whole page by default. Pass <C>dropScope=&quot;zone&quot;</C> to catch them on the chat only (the message list and the message box, which show a dashed outline and <C>dropLabel</C> while a file is dragged over), which is what a chat embedded in someone else&apos;s page wants. The <C>/demo</C> page adds a history sidebar, voice, toggles, attachments and delete on top of this.</>,
  },
  composer: {
    summary: "The message box at the bottom of the chat, with its buttons: attach, send and stop. Attachments and settings sit inside the same box, suggestions appear above it, and you can add voice, toggles and a More menu. Use it when you build your own layout; FullChat already includes one.",
    imports: IMPORT("Composer"),
    api: ["Composer", "ComposerSuggestionsList"],
    examples: [
      example(raw, "composer-basic", <ComposerBasic />, { title: "Attachments, settings, suggestions and a busy box", description: "Type to see suggestions. The second box shows the Stop button, which appears while a reply is running." }),
      example(raw, "composer-slash-commands", <ComposerSlashCommands />, { title: "Slash commands", description: "Type / to open the list, keep typing to filter, then pick with the arrow keys and Enter or Tab, or with the mouse. Summarize and Translate fill the box; Clear is an action your onCommand runs. The last row calls onManageCommands.", height: 360 }),
      example(raw, "composer-voice-toggles", <ComposerVoiceAndToggles />, { title: "Voice, toggles and the More menu", description: "The microphone shows only in browsers that support speech recognition. Toggles are on/off chips, and the More button holds extra menu items." }),
      example(raw, "composer-voice-record", <ComposerRecording />, { title: "Voice input that records", description: "Pass voice as an object with transcribe. The mic records, shows the time and a level, and hands the audio to your function. Escape or the mic stops and transcribes; Cancel discards. The button below sets disabledReason." }),
      example(raw, "composer-call", <ComposerCall />, { title: "A call button", description: "onStartCall adds a round phone button right before Send. Leave the prop out while a call is running." }),
    ],
    notes: <>Voice has two forms. With <C>voice</C> set to <C>true</C> it uses the browser&apos;s own speech recognition (below). With <C>voice</C> as an object that has <C>transcribe</C> it records instead, so it also works where the browser has no speech recognition (an Electron or Chromium shell, for example). <C>transcribe(audio, {`{ mime, durationMs }`})</C> is yours: send the audio to your speech-to-text service and resolve with the text, which is added to the box with one space between. Reject with an Error whose message is plain words and it is shown as the reason. An empty result shows &quot;Nothing was heard&quot; and adds nothing. What the person typed is never changed on a failure, and the mic can be pressed again. The mic shows wherever <C>getUserMedia</C> and <C>MediaRecorder</C> exist. Also in the object: <C>microphoneId</C>, <C>maxDurationMs</C> (default 120000; recording stops and is transcribed), <C>disabledReason</C> (the mic is shown disabled with that sentence as tooltip and description, for example while a call has the microphone; a recording in progress is discarded) and <C>labels</C> (<C>start</C>, <C>stop</C>, <C>cancel</C>, <C>asking</C>, <C>recording</C>, <C>transcribing</C>, <C>permissionDenied</C>, <C>noMicrophone</C>, <C>microphoneBusy</C>, <C>recordingFailed</C>, <C>transcriptionFailed</C>, <C>nothingHeard</C>). The state words sit in one polite live region; the timer is not read out. Sending the message discards a recording in progress. Every microphone track is stopped on stop, cancel, failure and unmount, and the kit keeps no audio after <C>transcribe</C> settles. <br /><br />The browser form uses the browser&apos;s own speech recognition (the <C>useSpeechInput</C> hook in the core), so there is no paid service. Some browsers send the audio to their own speech service. The kit never sees it. Firefox has no speech recognition, so the microphone does not show there.</>,
  },
  "composer-pills": {
    summary: "The pills above the message box. Before the first message they are starter prompts, and picking one fills the box. After a reply that came with follow-up questions they are those follow-ups, and picking one sends it.",
    imports: IMPORT("ComposerPills, SuggestionPills"),
    api: ["ComposerPills", "SuggestionPills", "useComposerSuggestions"],
    examples: [example(raw, "composer-pills", <Pills />, { title: "Starters, follow-ups and a free-standing row", description: "SuggestionPills is the plain row. Use it for anything that is not a starter or a follow-up." })],
  },
  "chat-empty-state": {
    summary: "What people see when a chat is empty: the agent's face, a greeting and prompt chips they can tap.",
    imports: IMPORT("ChatEmptyState"),
    api: ["ChatEmptyState"],
    examples: [example(raw, "chat-empty-state", <EmptyState />, { title: "A greeting with chips" })],
  },
};
