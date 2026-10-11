import type { ChatMessage, ChatTurnActions, Interrupt } from "@hiro/niru-chat-kit";

/** Frozen transcripts for the block pages: a state can sit on the page without a timer. */
const NOW = Date.now();

export const USER_TURN: ChatMessage = {
  id: "u1",
  role: "user",
  text: "How is the kit put together?",
  at: NOW - 12_000,
};

export const STREAMING_TURN: ChatMessage = {
  id: "a-streaming",
  role: "assistant",
  text: "The kit keeps logic in a core and drawing in",
  pending: true,
  at: NOW - 4_000,
};

export const WAITING_TURN: ChatMessage = { id: "a-waiting", role: "assistant", text: "", pending: true, at: NOW - 1_000 };

export const TOOL_RUNNING_TURN: ChatMessage = {
  id: "a-tool",
  role: "assistant",
  text: "",
  pending: true,
  at: NOW - 6_000,
  parts: [
    { kind: "reasoning", id: "r1", text: "I should look at the docs before answering." },
    {
      kind: "activity",
      id: "act1",
      steps: [{ id: "tool-1", kind: "tool", name: "web_search", title: "Searching the docs for the kit layout", status: "running", parentId: null }],
    },
  ],
};

const ANSWER = `The kit keeps **logic** in a core and **drawing** in a skin, so a second app can recolour it.

\`\`\`typescript
const { messages, send } = useChatStream(transport);
\`\`\`

| Layer | Knows about |
| --- | --- |
| core | frames, turns, transports |
| mui skin | MUI, tokens |`;

export const SETTLED_TURN: ChatMessage = {
  id: "a-settled",
  serverId: "s-a-settled",
  role: "assistant",
  text: ANSWER,
  at: NOW - 12_000,
  settledAt: NOW - 3_000,
  citations: [
    { kind: "web", label: "prompt-kit", url: "https://www.prompt-kit.com", title: "prompt-kit components" },
    { kind: "document", label: "Kit README.md" },
  ],
  files: [{ filename: "token-map.csv", format: "csv", size_bytes: 2_150 }],
  siblingIds: ["s-a-settled", "s-a-other"],
  siblingIndex: 0,
  parts: [
    { kind: "reasoning", id: "r1", text: "The question is about structure, so I will check the docs." },
    {
      kind: "activity",
      id: "act1",
      steps: [
        {
          id: "tool-1",
          kind: "tool",
          name: "web_search",
          title: "Searched the docs for the kit layout",
          status: "success",
          parentId: null,
          durationMs: 1400,
          summary: "Found 3 pages",
          details: { inputs: { query: "niru chat kit core skin layout" }, output: "3 results, best match: README" },
        },
        { id: "tool-2", kind: "tool", name: "create_file", title: "Made token-map.csv", status: "success", parentId: null, durationMs: 600 },
      ],
    },
    { kind: "text", id: "tx1", text: ANSWER },
  ],
};

export const STOPPED_TURN: ChatMessage = { id: "a-stopped", role: "assistant", text: "The kit has two layers: a core and", status: "stopped", at: NOW - 20_000 };

export const UNGROUNDED_TURN: ChatMessage = {
  id: "a-ungrounded",
  role: "assistant",
  text: "Our refund window is 90 days.",
  citationCheck: { grounded: false, required: true, kept: 0, dropped: [], renumbered: false },
  at: NOW - 30_000,
};

export const NOOP = () => undefined;

export const ALL_ACTIONS: ChatTurnActions = {
  disabled: false,
  onCopy: async () => undefined,
  onRegenerate: NOOP,
  onSwitchBranch: NOOP,
  onEdit: NOOP,
  onDelete: NOOP,
  onFeedback: () => new Promise<void>((resolve) => setTimeout(resolve, 300)),
};

export const APPROVAL: Interrupt = {
  kind: "tool_approval",
  question: "Approve a refund of 250 USD to the customer?",
  options: [],
  tool: "issue_refund",
  actions: [{ name: "issue_refund", args: { amount: 250, currency: "USD", reason: "Late delivery" } }],
  can_edit: true,
  fields: [],
};

export const QUESTION: Interrupt = { kind: "ask_user", question: "Which date should the delivery move to?", options: [] };

/** A 1x1 transparent-ish PNG, as base64, for the Image example. */
export const TINY_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAAUElEQVR4nO3PQQ0AIBDAsAP/nuEBh5JWwZLtmZnZ3d3dBwQECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIEvjgDnb4DfYvqOpIAAAAASUVORK5CYII=";
