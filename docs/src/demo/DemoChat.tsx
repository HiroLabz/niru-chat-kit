import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Chip from "@mui/material/Chip";
import MenuItem from "@mui/material/MenuItem";
import LanguageIcon from "@mui/icons-material/Language";
import PsychologyOutlinedIcon from "@mui/icons-material/PsychologyOutlined";
import { useChatStream, type ChatMessage, type ChatTurnActions, type WorkingStep } from "@hiro/niru-chat-kit";
import {
  AgentAvatar,
  CallCard,
  FullChat,
  Image,
  Tool,
  type ChatHistorySidebarProps,
  type ComposerAttachment,
} from "@hiro/niru-chat-kit/mui";
import type { ComposerToggle } from "@hiro/niru-chat-kit/mui";
import type { DemoConversation } from "./conversations";
import type { DemoCallCard } from "./use-demo-call";
import type { DemoParams } from "./replay-transport";
import { STARTERS } from "./scenarios";

const NO_STARTERS: string[] = [];

type Props = {
  conversation: DemoConversation;
  history?: ChatHistorySidebarProps;
  starters?: string[];
  /** Called with the first question once the conversation has one, so the sidebar can list it. */
  onFirstMessage?: (id: string, question: string) => void;
  greeting?: string;
  /** Calls that ended while this conversation was open; each is shown in the chat where it ended. */
  callCards?: DemoCallCard[];
  onCallAgain?: () => void;
  /** Shows the composer's call button; the page omits it while a call runs. */
  onStartCall?: () => void;
  /** The minimised call strip, drawn directly above the composer. */
  aboveComposer?: ReactNode;
};

/** Extras the demo draws under a turn: the raw call of a tool (Tool with input and output) and an image from base64. */
function turnExtras(message: ChatMessage) {
  const steps: WorkingStep[] = (message.parts ?? []).flatMap((part) => (part.kind === "activity" ? part.steps : []));
  const raw = steps.filter((step) => step.status === "success" && step.details && ["query_database", "generate_image"].includes(step.name));
  if (raw.length === 0) return null;
  return raw.map((step) =>
    step.name === "generate_image" && step.details?.output ? (
      <Image
        key={step.id}
        base64={step.details.output}
        mediaType="image/png"
        alt="A small colour gradient"
        sx={{ my: 1, "& img": { width: 96, borderRadius: 1, imageRendering: "pixelated" } }}
      />
    ) : (
      <Tool key={step.id} step={step} input={step.details?.inputs ?? step.details?.inputsText} output={step.details?.output} sx={{ my: 1 }} />
    )
  );
}

const copyText = async (text: string) => {
  await navigator.clipboard.writeText(text);
};

/**
 * One demo conversation: `useChatStream` over the conversation's replay transport, drawn by
 * `FullChat`. Mount it with `key={conversation.id}` so switching conversations starts clean.
 */
export function DemoChat({ conversation, history, starters = STARTERS, onFirstMessage, greeting, callCards, onCallAgain, onStartCall, aboveComposer }: Props) {
  const { transport } = conversation;
  const reopened = useMemo(() => transport.snapshot(), [transport]);
  const [files, setFiles] = useState<ComposerAttachment[]>([]);
  const sentFiles = useRef<Map<number, string[]>>(new Map());
  const [web, setWeb] = useState(true);
  const [deep, setDeep] = useState(false);
  const [deleted, setDeleted] = useState<Set<string>>(() => new Set());

  const stream = useChatStream<DemoParams>(transport, {
    branching: true,
    params: { attachments: files.map((file) => file.name) },
    initialMessages: reopened,
    initialConversationId: reopened.length > 0 ? transport.conversationId : null,
    initialThreadId: reopened.length > 0 ? transport.threadId : null,
  });

  const visible = useMemo(() => stream.messages.filter((message) => !deleted.has(message.id)), [stream.messages, deleted]);

  // A finished call sits in the chat where it ended: its place is the number of turns there were then.
  const cardPlaces = useRef<Map<string, number>>(new Map());
  const shown = useMemo(() => {
    const cards = callCards ?? [];
    cards.forEach((card) => {
      if (!cardPlaces.current.has(card.id)) cardPlaces.current.set(card.id, visible.length);
    });
    if (cards.length === 0) return visible;
    const out = [...visible];
    let added = 0;
    for (const card of cards) {
      const message: ChatMessage = { id: card.id, role: "assistant", text: "That was a call. Here is what was said.", at: card.summary.endedAt ?? Date.now() };
      out.splice((cardPlaces.current.get(card.id) ?? visible.length) + added, 0, message);
      added += 1;
    }
    return out;
  }, [callCards, visible]);

  useEffect(() => {
    const first = stream.messages.find((message) => message.role === "user");
    if (first) onFirstMessage?.(conversation.id, first.text);
  }, [conversation.id, onFirstMessage, stream.messages]);

  useEffect(() => () => files.forEach((file) => file.previewUrl && URL.revokeObjectURL(file.previewUrl)), [files]);

  const onAttach = useCallback((added: File[]) => {
    setFiles((current) => [
      ...current,
      ...added.map((file, index) => ({
        id: `${file.name}-${Date.now()}-${index}`,
        name: file.name,
        kind: file.type.startsWith("image/") ? ("image" as const) : file.type === "application/pdf" ? ("pdf" as const) : ("file" as const),
        previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
      })),
    ]);
  }, []);

  const send = useCallback(
    (text: string) => {
      const ordinal = stream.messages.filter((message) => message.role === "user").length;
      if (files.length > 0) sentFiles.current.set(ordinal, files.map((file) => file.name));
      setFiles([]);
      return stream.send(text);
    },
    [files, stream]
  );

  const toggles: ComposerToggle[] = [
    { id: "web", label: "Search the web", icon: <LanguageIcon fontSize="inherit" />, active: web, onToggle: () => setWeb((on) => !on) },
    { id: "deep", label: "Think longer", icon: <PsychologyOutlinedIcon fontSize="inherit" />, active: deep, onToggle: () => setDeep((on) => !on) },
  ];

  const turnActions: ChatTurnActions | null = stream.turnActions
    ? {
        ...stream.turnActions,
        onCopy: copyText,
        onFeedback: () => new Promise<void>((resolve) => setTimeout(resolve, 250)),
        onDelete: (message: ChatMessage) => setDeleted((current) => new Set(current).add(message.id)),
      }
    : null;

  return (
    <FullChat
      stream={{ ...stream, messages: shown, send, turnActions }}
      agent={{ name: "Demo agent", initial: "D" }}
      renderAvatar={(size) => <AgentAvatar avatar={{ kind: "preset", preset_id: "hiro-02" }} name="Demo agent" size={size} />}
      greeting={greeting ?? "Hi, I am a scripted demo agent. Pick a suggestion below and watch what the kit does."}
      starters={starters.length ? starters : NO_STARTERS}
      history={history}
      attachments={files}
      onAttach={onAttach}
      onRemoveAttachment={(id) => setFiles((current) => current.filter((file) => file.id !== id))}
      renderUserExtras={(message) => {
        const ordinal = visible.filter((item) => item.role === "user").findIndex((item) => item.id === message.id);
        const names = sentFiles.current.get(ordinal);
        return names ? names.map((name) => <Chip key={name} size="small" variant="outlined" label={name} sx={{ mr: 0.5, mb: 0.5 }} />) : null;
      }}
      renderExtras={(message) => {
        const card = callCards?.find((item) => item.id === message.id);
        if (card) return <CallCard summary={card.summary} agentName="Demo agent" onCallAgain={onCallAgain} sx={{ mt: 1 }} />;
        return turnExtras(message);
      }}
      voice
      toggles={toggles}
      moreActions={[
        <MenuItem key="clear" onClick={() => setFiles([])}>
          Clear attachments
        </MenuItem>,
      ]}
      onStartCall={onStartCall}
      aboveComposer={aboveComposer}
      columnMaxWidth={820}
    />
  );
}
