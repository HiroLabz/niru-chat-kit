import { useState } from "react";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { ApprovalField } from "@hiro/niru-chat-kit";
import {
  ApprovalCard,
  ApprovalFormFields,
  ChatHistorySidebar,
  FileChip,
  FileChipList,
  InterruptEditForm,
  InterruptPrompt,
  MessageEditForm,
  QuestionCard,
  SourceList,
  TurnActions,
  TurnCopyButton,
  TurnSteps,
  TurnTimeline,
  type ChatHistoryItem,
  type ChatHistoryTab,
  type SavedItem,
} from "@hiro/niru-chat-kit/mui";
import { example } from "../../components/Example";
import { C } from "../../components/Section";
import { ALL_ACTIONS, APPROVAL, NOOP, QUESTION, SETTLED_TURN, TOOL_RUNNING_TURN } from "../../fixtures/messages";
import type { ComponentDoc } from "./types";
import raw from "./blocks-b.tsx?raw";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

// #region history-sidebar
function HistoryExample() {
  const [now] = useState(() => Date.now());
  const [items, setItems] = useState<ChatHistoryItem[]>([
    { id: "1", title: "Refund policy questions", at: now - 3 * HOUR },
    { id: "2", title: "Kit layout", at: now - 26 * HOUR },
    { id: "3", preview: "How do I reset a password", at: now - 6 * DAY },
    { id: "4", title: "Quarterly orders", at: now - 20 * DAY },
    { id: "5", title: "Old pricing thread", at: now - 90 * DAY },
  ]);
  const [active, setActive] = useState<string | null>("2");
  return (
    <ChatHistorySidebar
      items={items}
      activeId={active}
      onSelect={setActive}
      onNew={() => setActive(null)}
      identity={{ name: "Demo agent", initial: "D", subtitle: "Online" }}
      searchable
      grouped
      onRename={(id, title) => setItems((all) => all.map((item) => (item.id === id ? { ...item, title } : item)))}
      onDelete={(id) => setItems((all) => all.filter((item) => item.id !== id))}
      now={now}
    />
  );
}
// #endregion

// #region history-pin-save
function PinSaveExample() {
  const [now] = useState(() => Date.now());
  const [rows, setRows] = useState<ChatHistoryItem[]>([
    { id: "1", title: "Refund policy questions", at: now - 3 * HOUR },
    { id: "2", title: "Kit layout", at: now - 26 * HOUR, pinned: true },
    { id: "3", title: "Quarterly orders", at: now - 6 * DAY },
    { id: "4", title: "Old pricing thread", at: now - 40 * DAY },
  ]);
  const [saved, setSaved] = useState<SavedItem[]>([
    { id: "s1", kind: "conversation", conversationId: "3", title: "Quarterly orders", at: now - 2 * DAY },
    { id: "s2", kind: "message", conversationId: "1", messageId: "m4", title: "Refund policy questions", text: "Refunds are paid back to the original card within five days.", at: now - 5 * HOUR },
  ]);
  const [active, setActive] = useState<string | null>("1");
  const [tab, setTab] = useState<ChatHistoryTab>("chats");
  const [highlight, setHighlight] = useState<string | undefined>();
  return (
    <ChatHistorySidebar
      items={[...rows].sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)))}
      activeId={active}
      onSelect={setActive}
      onNew={() => setActive(null)}
      grouped
      searchable
      onPin={(id, pinned) => setRows((all) => all.map((row) => (row.id === id ? { ...row, pinned } : row)))}
      saved={saved}
      tab={tab}
      onTabChange={setTab}
      onOpenSaved={(item) => {
        setActive(item.conversationId);
        if (item.kind === "conversation") {
          setTab("chats");
          setHighlight(item.conversationId);
        }
      }}
      onUnsave={(item) => setSaved((all) => all.filter((entry) => entry.id !== item.id))}
      highlightId={highlight}
      now={now}
    />
  );
}
// #endregion

// #region turn-timeline
function TimelineExample() {
  const settled = SETTLED_TURN.parts?.filter((part) => part.kind !== "text") ?? [];
  const running = TOOL_RUNNING_TURN.parts ?? [];
  const steps = SETTLED_TURN.parts?.flatMap((part) => (part.kind === "activity" ? part.steps : [])) ?? [];
  return (
    <Stack spacing={3}>
      <TurnTimeline messageId="settled" parts={settled} pending={false} startedAt={Date.now() - 9_000} settledAt={Date.now() - 3_000} />
      <TurnTimeline messageId="running" parts={running} pending startedAt={Date.now() - 4_000} />
      <TurnSteps pending={false} steps={steps} />
    </Stack>
  );
}
// #endregion

// #region turn-actions
function ActionsExample() {
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  return (
    <Stack spacing={2}>
      <TurnActions
        message={SETTLED_TURN}
        actions={{ ...ALL_ACTIONS, onSave: () => setSaved((on) => !on), isSaved: () => saved }}
        onStartEdit={NOOP}
      />
      <TurnActions message={SETTLED_TURN} actions={ALL_ACTIONS} onStartEdit={() => setEditing(true)} />
      <TurnActions message={SETTLED_TURN} actions={{ ...ALL_ACTIONS, disabled: true }} onStartEdit={NOOP} />
      <TurnCopyButton message={SETTLED_TURN} onCopy={async () => undefined} />
      {editing ? <MessageEditForm initialText="How is the kit put together?" disabled={false} onSave={() => setEditing(false)} onCancel={() => setEditing(false)} /> : null}
    </Stack>
  );
}
// #endregion

// #region source-list
function SourcesExample() {
  return (
    <SourceList
      citations={[
        { kind: "web", label: "prompt-kit", url: "https://www.prompt-kit.com", title: "prompt-kit components" },
        { kind: "web", label: "Material UI", url: "https://mui.com", title: "Material UI" },
        { kind: "document", label: "Kit README.md" },
      ]}
    />
  );
}
// #endregion

// #region file-chip
function FileChips() {
  return (
    <Stack spacing={1.5} sx={{ alignItems: "flex-start" }}>
      <FileChip file={{ filename: "orders-summary.csv", format: "csv", size_bytes: 2150 }} />
      <FileChip file={{ filename: "report.pdf", format: "pdf", size_bytes: 482_000, download_path: "/files/report.pdf" }} onDownload={async () => undefined} />
      <FileChipList files={[{ filename: "a.xlsx", format: "xlsx", size_bytes: 9_000 }, { filename: "b.docx", format: "docx", size_bytes: 31_000 }]} />
    </Stack>
  );
}
// #endregion

// #region interrupts
function InterruptsExample() {
  const [answer, setAnswer] = useState("");
  return (
    <Stack spacing={2}>
      <InterruptPrompt interrupt={APPROVAL} onAnswer={(choice) => setAnswer(choice)} />
      <InterruptPrompt interrupt={QUESTION} onAnswer={(reply) => setAnswer(reply)} autoFocus={false} />
      <Typography variant="caption" color="text.secondary">{answer ? "Answered: " + answer : "Nothing answered yet."}</Typography>
    </Stack>
  );
}
// #endregion

// #region question-options
function QuestionWithOptions() {
  const [answer, setAnswer] = useState("");
  const [typing, setTyping] = useState(false);
  return answer ? (
    <QuestionCard question="Where will you be staying?" answered={answer} onChange={() => setAnswer("")} />
  ) : (
    <Stack spacing={1}>
      <QuestionCard
        question="Where will you be staying?"
        options={["Cebu City", "Mactan, near the airport", "Not decided yet"]}
        onAnswer={setAnswer}
        onOther={() => setTyping(true)}
        decideAnswer="Use your best judgement"
      />
      {typing ? <Typography variant="caption" color="text.secondary">In a chat, this is where the message box gets the cursor.</Typography> : null}
    </Stack>
  );
}
// #endregion

// #region question-open
function QuestionWithoutOptions() {
  return <QuestionCard question="What dates are you travelling?" decideAnswer="Use your best judgement" onAnswer={NOOP} />;
}
// #endregion

// #region question-answered
function QuestionAnswered() {
  return (
    <Stack spacing={1.5}>
      <QuestionCard question="Where will you be staying?" answered="Mactan" />
      <QuestionCard question="Where will you be staying?" answered="Mactan" onChange={NOOP} />
    </Stack>
  );
}
// #endregion

// #region interrupt-forms
function InterruptForms() {
  const fields: ApprovalField[] = [
    { name: "reason", type: "string", description: "Why is this refund approved?", required: true, repeated: false, enum_values: [] },
    { name: "priority", type: "enum", description: "Priority", required: false, repeated: false, enum_values: ["low", "high"] },
  ];
  const [values, setValues] = useState<Record<string, string>>({});
  return (
    <Stack spacing={2}>
      <ApprovalFormFields fields={fields} values={values} errors={{}} onChange={(name, value) => setValues((all) => ({ ...all, [name]: value }))} />
      <InterruptEditForm action={{ name: "issue_refund", args: { amount: 250, currency: "USD" } }} onSave={NOOP} onCancel={NOOP} />
      <ApprovalCard interrupt={{ ...APPROVAL, can_edit: false }} onAnswer={NOOP} disabledAnswers={{ approve: "Only a manager can approve" }} />
    </Stack>
  );
}
// #endregion

const IMPORT = (names: string) => `import { ${names} } from "@hiro/niru-chat-kit/mui";`;

export const BLOCKS_B: Record<string, ComponentDoc> = {
  "chat-history-sidebar": {
    summary: "The list of past conversations, with a New chat button. It shows the conversations in the order you give them. On a narrow screen it folds behind a button. It can search, group by date, and rename or delete a conversation.",
    imports: IMPORT("ChatHistorySidebar"),
    api: ["ChatHistorySidebar"],
    examples: [
      example(raw, "history-sidebar", <HistoryExample />, { title: "Search, groups, rename and delete", description: "Type in the search box. Open a row's menu to rename or delete it. Delete asks you to confirm.", maxWidth: 320 }),
      example(raw, "history-pin-save", <PinSaveExample />, { title: "Pin, and a Saved tab", description: "Open a row's menu and pick Pin. Pinned chats move to a Pinned group at the top. Switch to the Saved tab, pick a saved chat to see its row flash in the list, or open a row's menu to remove it from saved.", maxWidth: 320 }),
    ],
    notes: <>The list only draws and reports. Your app keeps which chats are pinned (set <C>pinned</C> on the item and handle <C>onPin</C>) and which things are saved (the <C>saved</C> list, handled by <C>onOpenSaved</C> and <C>onUnsave</C>). Pinned chats keep the order you list them in. The Saved tab always shows the newest first. A saved item is either a whole chat or one message, and a message needs its chat&apos;s id and its own id so you can find it again. If you build your own list, the core has the logic as <C>filterConversations</C>, <C>groupConversationsByAge</C>, <C>splitPinned</C>, <C>filterSaved</C> and <C>sortSavedNewestFirst</C>. Pass <C>now</C> to fix the clock in tests.</>,
  },
  "turn-timeline": {
    summary: "The working steps of one reply, in the order they happened: reasoning, model steps and tool cards, under a header such as Worked for 5s. TurnSteps is a shorter list of the same steps.",
    imports: IMPORT("TurnTimeline, TurnSteps"),
    api: ["TurnTimeline", "TurnSteps"],
    examples: [example(raw, "turn-timeline", <TimelineExample />, { title: "A finished reply, a running reply and the short list" })],
  },
  "turn-actions": {
    summary: "The buttons under a finished reply: copy, regenerate, rate, edit a question, delete, and move between versions of an answer. A button shows only when you pass the function for it.",
    imports: IMPORT("TurnActions, TurnCopyButton, MessageEditForm"),
    api: ["TurnActions", "TurnCopyButton", "MessageEditForm"],
    examples: [example(raw, "turn-actions", <ActionsExample />, { title: "Every button, the disabled state and the edit form", description: "In a real chat, click the pencil on a user message to open the edit form." })],
    notes: <><C>onSave</C> and <C>isSaved</C> also belong to <C>ChatTurnActions</C>. With <C>onSave</C> a bookmark button appears after Copy on replies, and it shows as pressed when <C>isSaved</C> says the reply is saved. Pressing it calls <C>onSave</C> either way, so your function decides whether to save or remove. User messages do not get a bookmark. Replies redraw only when their props change, so pass a new <C>actions</C> object when the saved state changes. <C>onDelete</C> belongs to <C>ChatTurnActions</C>. When you pass it, the kit asks the person to confirm before calling it. useChatStream keeps the messages, so your function decides what deleting means. The demo hides the message.</>,
  },
  "source-list": {
    summary: "The Sources row under an answer. Web sources are links with a hover card. Document sources are plain chips, because a document has no address to open. Duplicates are dropped.",
    imports: IMPORT("SourceList"),
    api: ["SourceList"],
    examples: [example(raw, "source-list", <SourcesExample />, { title: "Web and document sources" })],
    notes: <>The web chips use <C>Source.Trigger</C>, which fetches each site&apos;s icon by default. The Source page explains how to turn that off.</>,
  },
  "file-chip": {
    summary: "A chip for a file the agent made, with its name, type and size. It has a Download button when the file has a download path and you supply a way to download.",
    imports: IMPORT("FileChip, FileChipList"),
    api: ["FileChip", "FileChipList"],
    examples: [example(raw, "file-chip", <FileChips />, { title: "With and without a download button" })],
  },
  interrupts: {
    summary: "What shows when a run pauses and waits for the person. A question from the agent is a QuestionCard in the thread: tap a suggested answer, or type in the normal message box. An approval is a card with Approve, Edit and Deny. FullChat uses both by default. InterruptPrompt is the older bottom panel, still here for apps that draw the pause themselves.",
    imports: IMPORT("InterruptPrompt, ApprovalCard, QuestionCard"),
    api: ["QuestionCard", "InterruptPrompt", "ApprovalCard", "InterruptEditForm", "ApprovalFormFields"],
    examples: [
      example(raw, "question-options", <QuestionWithOptions />, { title: "A question with suggested answers", description: "Tap a row, or press 1 to 3 when the cursor is not in a text box. Once you answer, the card folds into one line. Change brings it back." }),
      example(raw, "question-open", <QuestionWithoutOptions />, { title: "A question with no suggested answers", description: "The card points at the message box. In FullChat the box already has the cursor and shows what it is answering." }),
      example(raw, "question-answered", <QuestionAnswered />, { title: "The answered line", description: "The first line is final. The second shows Change, which you add only while the agent has not used the answer." }),
      example(raw, "interrupts", <InterruptsExample />, { title: "The bottom panel: an approval and a question" }),
      example(raw, "interrupt-forms", <InterruptForms />, { title: "Form fields, the edit form and a blocked answer", description: "When someone may not give an answer, the button is off and a tooltip says why." }),
    ],
    notes: <>In a chat, answer with <C>resume(answer, values)</C> from <C>useChatStream</C>. The answers for an approval are <C>approve</C>, <C>edit</C> and <C>deny</C>. To use the question card in your own layout, pass <C>question</C> and <C>foldAnswers</C> to <C>Conversation</C> and give the <C>Composer</C> an <C>answering</C> prop; <C>useChatStream</C> keeps the question with the answer turn (<C>answersQuestion</C>) so the folded line stays until the conversation is loaded again from history.</>,
  },
};
