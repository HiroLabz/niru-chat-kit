import type { SavedItem } from "@hiro/niru-chat-kit/mui";
import { createReplayTransport, type ReplayTransport } from "./replay-transport";

export type DemoConversation = { id: string; title: string; at: number; transport: ReplayTransport };

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** Past conversations for the sidebar. They span the date groups the sidebar draws. */
const SEEDS: Array<{ key: string; title: string; ago: number; question: string }> = [
  { key: "trip", title: "Weekend trip plan", ago: 2 * HOUR, question: "Think through a weekend trip" },
  { key: "orders", title: "Quarterly orders", ago: 27 * HOUR, question: "Run some tools for me" },
  { key: "sources", title: "Where the kit comes from", ago: 3 * DAY, question: "Answer with sources" },
  { key: "quadratic", title: "Quadratic formula", ago: 12 * DAY, question: "Explain the quadratic formula" },
  { key: "highlighting", title: "Highlighting check", ago: 45 * DAY, question: "Write code in a few languages" },
  { key: "markdown", title: "Markdown check", ago: 120 * DAY, question: "Show me markdown and a table" },
];

export function createConversation(speed: () => number, seed?: (typeof SEEDS)[number]): DemoConversation {
  const at = Date.now() - (seed?.ago ?? 0);
  const transport = createReplayTransport({
    speed,
    seed: seed ? [{ question: seed.question, at }] : undefined,
    id: seed?.key,
  });
  return { id: transport.conversationId, title: seed?.title ?? "", at, transport };
}

export function seededConversations(speed: () => number): DemoConversation[] {
  return SEEDS.map((seed) => createConversation(speed, seed));
}

/** What the demo starts with: two pinned chats and a few saved items, taken from the seeded chats. */
export type DemoLibrary = { pinned: string[]; saved: SavedItem[] };

function firstLine(text: string): string {
  const line = text.split("\n").find((part) => part.trim()) ?? "";
  const plain = line.replace(/[#*`>_]/g, "").trim();
  return plain.length > 110 ? `${plain.slice(0, 110)}...` : plain;
}

export function seededLibrary(seeded: DemoConversation[]): DemoLibrary {
  const byKey = (key: string) => seeded.find((conv) => conv.id === `demo-${key}`);
  const saved: SavedItem[] = [];
  const chat = byKey("trip");
  if (chat) saved.push({ id: "seed-chat-trip", kind: "conversation", conversationId: chat.id, title: chat.title, at: Date.now() - 5 * HOUR });
  for (const [key, ago] of [["sources", 26 * HOUR], ["quadratic", 4 * DAY]] as const) {
    const conv = byKey(key);
    const reply = conv?.transport.snapshot().find((message) => message.role === "assistant");
    if (conv && reply) {
      saved.push({
        id: `seed-message-${key}`,
        kind: "message",
        conversationId: conv.id,
        messageId: reply.id,
        title: conv.title,
        text: firstLine(reply.text),
        at: Date.now() - ago,
      });
    }
  }
  return { pinned: ["demo-orders", "demo-sources"].filter((id) => byKey(id.slice(5))), saved };
}
