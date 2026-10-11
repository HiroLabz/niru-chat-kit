import { useMemo, useState } from "react";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import LanguageIcon from "@mui/icons-material/Language";
import { createFakeVoiceSession, useChatStream } from "@hiro/niru-chat-kit";
import {
  CallStrip,
  ChatEmptyState,
  Composer,
  ComposerPills,
  Conversation,
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
      example(raw, "message-notes", <Notes />, { title: "Notes under an answer", description: "How a finished answer ended: cut short by Stop, or not backed by the sources it had." }),
    ],
    notes: <>To get the regenerate, edit and version buttons, pass <C>turnActions</C> from <C>useChatStream</C>. See <C>TurnActions</C> for what each button does.</>,
  },
  "full-chat": {
    summary: "A whole chat in one component: the message list, a greeting, an error banner with Retry, question cards when the agent waits for an answer, suggestion pills and the message box. Give it the result of useChatStream. We recommend starting here and swapping in smaller parts only when you need to.",
    imports: `import { useChatStream } from "@hiro/niru-chat-kit";\n${IMPORT("FullChat")}`,
    api: ["FullChat"],
    examples: [
      example(raw, "full-chat", <FullChatExample />, { title: "A live chat on made-up replies", description: "This is a real useChatStream run. Try a starter, regenerate a reply, type refund to get an approval card, or type error to get a failed run.", height: 560 }),
      example(raw, "full-chat-call", <FullChatCall />, { title: "A call button and the call strip", description: "onStartCall adds a round phone button next to Send. While a call is minimised, pass the CallStrip as aboveComposer. Click the strip here to dismiss it.", height: 560 }),
    ],
    notes: <>For the phone button, pass <C>onStartCall</C>, and optionally <C>callLabel</C> and <C>callDisabled</C>. To put something such as a <C>CallStrip</C> directly above the message box or the question card, pass it as <C>aboveComposer</C>. The <C>/demo</C> page adds a history sidebar, voice, toggles, attachments and delete on top of this.</>,
  },
  composer: {
    summary: "The message box at the bottom of the chat, with its buttons: attach, send and stop. Attachments and settings sit inside the same box, suggestions appear above it, and you can add voice, toggles and a More menu. Use it when you build your own layout; FullChat already includes one.",
    imports: IMPORT("Composer"),
    api: ["Composer", "ComposerSuggestionsList"],
    examples: [
      example(raw, "composer-basic", <ComposerBasic />, { title: "Attachments, settings, suggestions and a busy box", description: "Type to see suggestions. The second box shows the Stop button, which appears while a reply is running." }),
      example(raw, "composer-voice-toggles", <ComposerVoiceAndToggles />, { title: "Voice, toggles and the More menu", description: "The microphone shows only in browsers that support speech recognition. Toggles are on/off chips, and the More button holds extra menu items." }),
      example(raw, "composer-call", <ComposerCall />, { title: "A call button", description: "onStartCall adds a round phone button right before Send. Leave the prop out while a call is running." }),
    ],
    notes: <>Voice uses the browser&apos;s own speech recognition (the <C>useSpeechInput</C> hook in the core), so there is no paid service. Some browsers send the audio to their own speech service. The kit never sees it. Firefox has no speech recognition, so the microphone does not show there.</>,
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
