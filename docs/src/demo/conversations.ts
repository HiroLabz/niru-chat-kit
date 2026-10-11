import { createReplayTransport, type ReplayTransport } from "./replay-transport";

export type DemoConversation = { id: string; title: string; at: number; transport: ReplayTransport };

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** Past conversations for the sidebar. They span the date groups the sidebar draws. */
const SEEDS: Array<{ title: string; ago: number; question: string }> = [
  { title: "Weekend trip plan", ago: 2 * HOUR, question: "Think through a weekend trip" },
  { title: "Quarterly orders", ago: 27 * HOUR, question: "Run some tools for me" },
  { title: "Where the kit comes from", ago: 3 * DAY, question: "Answer with sources" },
  { title: "Quadratic formula", ago: 12 * DAY, question: "Explain the quadratic formula" },
  { title: "Highlighting check", ago: 45 * DAY, question: "Write code in a few languages" },
  { title: "Markdown check", ago: 120 * DAY, question: "Show me markdown and a table" },
];

export function createConversation(speed: () => number, seed?: (typeof SEEDS)[number]): DemoConversation {
  const at = Date.now() - (seed?.ago ?? 0);
  const transport = createReplayTransport({
    speed,
    seed: seed ? [{ question: seed.question, at }] : undefined,
  });
  return { id: transport.conversationId, title: seed?.title ?? "", at, transport };
}

export function seededConversations(speed: () => number): DemoConversation[] {
  return SEEDS.map((seed) => createConversation(speed, seed));
}
