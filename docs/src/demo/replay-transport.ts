import {
  appendReasoningPart,
  appendTokenPart,
  applyThinkingFrameToParts,
  applyToolFrameToParts,
  approvalAnswerLabel,
  APPROVAL_INTERRUPT_KIND,
  filesOfTurn,
  type AgentStreamEvent,
  type ChatMessage,
  type ChatTransport,
  type ChatTurn,
  type InvokeResponse,
  type TurnPart,
} from "@hiro/niru-chat-kit";
import type { RunContext, ScriptStep } from "./frames";
import { pickScenario } from "./scenarios";

/** What the demo hands to every turn through `useChatStream`'s `params`. */
export type DemoParams = { attachments?: string[] };

export type ReplayOptions = {
  /** Stream speed multiplier, read on every frame. Default 1. */
  speed?: () => number;
  /** Called with every frame the transport hands to the kit (the Core page's frame log). */
  onFrame?: (frame: AgentStreamEvent) => void;
  /** Questions answered up front, as if the conversation had happened earlier. */
  seed?: Array<{ question: string; at: number }>;
};

export type ReplayTransport = ChatTransport<DemoParams> & {
  conversationId: string;
  threadId: string;
  /** The active branch as the kit shows it; used to reopen a conversation. */
  snapshot: () => ChatMessage[];
};

type Answer = {
  id: string;
  text: string;
  parts: TurnPart[];
  citations: ChatMessage["citations"];
  status?: "stopped";
  at: number;
  settledAt: number;
};
type Question = { id: string; text: string; answers: Answer[]; ai: number; at: number };
type Exchange = { id: string; questions: Question[]; qi: number };
type Fork = { kind: "regenerate" | "edit"; index: number };

const TOKEN_DELAY_MS = 26;
const FRAME_DELAY_MS = 110;
const SEED_DURATION_MS = 6_000;

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(timer);
      resolve();
    });
  });

/** Folds one frame into the stored answer, with the same core helpers the live hook uses. */
function foldFrame(answer: Answer, frame: AgentStreamEvent): void {
  if (frame.event === "token") {
    answer.text += frame.data.text;
    answer.parts = appendTokenPart(answer.parts, answer.id, frame.data.text);
  } else if (frame.event === "reasoning") {
    answer.parts = appendReasoningPart(answer.parts, frame.data);
  } else if (frame.event === "tool") {
    answer.parts = applyToolFrameToParts(answer.parts, answer.id, frame.data);
  } else if (frame.event === "thinking") {
    answer.parts = applyThinkingFrameToParts(answer.parts, answer.id, frame.data);
  } else if (frame.event === "result") {
    answer.citations = frame.data.citations ?? null;
    if (frame.data.message) answer.text = frame.data.message;
  }
}

const isFrame = (step: ScriptStep): step is AgentStreamEvent => "event" in step;

export function createReplayTransport(options: ReplayOptions = {}): ReplayTransport {
  const id = Math.random().toString(36).slice(2, 8);
  const conversationId = `demo-${id}`;
  const threadId = `thread-${id}`;
  const exchanges: Exchange[] = [];
  const attempts = new Map<string, number>();
  let counter = 0;
  let fork: Fork | null = null;
  let active: { runId: string; stop: boolean } | null = null;
  const nextId = (prefix: string) => `${prefix}-${id}-${(counter += 1)}`;

  const emptyAnswer = (at: number): Answer => ({
    id: nextId("a"),
    text: "",
    parts: [],
    citations: null,
    at,
    settledAt: at,
  });

  /** The active branch. `hideAnswerOf` leaves one exchange without its answer, for a regenerate. */
  function branch(hideAnswerOf = -1): ChatMessage[] {
    return exchanges.flatMap((exchange, index): ChatMessage[] => {
      const question = exchange.questions[exchange.qi];
      const out: ChatMessage[] = [
        {
          id: question.id,
          serverId: question.id,
          role: "user",
          text: question.text,
          at: question.at,
          siblingIds: exchange.questions.map((item) => item.id),
          siblingIndex: exchange.qi,
        },
      ];
      const answer = question.answers[question.ai];
      if (answer && index !== hideAnswerOf) {
        out.push({
          id: answer.id,
          serverId: answer.id,
          role: "assistant",
          text: answer.text,
          parts: answer.parts,
          citations: answer.citations,
          status: answer.status,
          at: answer.at,
          settledAt: answer.settledAt,
          files: filesOfTurn({ parts: answer.parts }),
          siblingIds: question.answers.map((item) => item.id),
          siblingIndex: question.ai,
        });
      }
      return out;
    });
  }

  function place(question: string, answer: Answer): void {
    const now = Date.now();
    if (fork?.kind === "regenerate") {
      const q = exchanges[fork.index].questions[exchanges[fork.index].qi];
      q.answers.push(answer);
      q.ai = q.answers.length - 1;
    } else if (fork?.kind === "edit") {
      const q = exchanges[fork.index].questions[exchanges[fork.index].qi];
      q.answers = [answer];
      q.ai = 0;
    } else {
      const q: Question = { id: nextId("q"), text: question, answers: [answer], ai: 0, at: now };
      exchanges.push({ id: nextId("x"), questions: [q], qi: 0 });
    }
    fork = null;
  }

  function context(turn: ChatTurn<DemoParams>): RunContext {
    const key = turn.message.toLowerCase();
    const attempt = attempts.get(key) ?? 0;
    attempts.set(key, attempt + 1);
    let variant = 0;
    if (fork?.kind === "regenerate") {
      const q = exchanges[fork.index].questions[exchanges[fork.index].qi];
      variant = q.answers.length;
    }
    return { question: turn.message, variant, attempt, attachments: turn.params?.attachments ?? [] };
  }

  async function* play(steps: ScriptStep[], answer: Answer | null, run: { runId: string; stop: boolean }) {
    const speed = () => Math.max(0.1, options.speed?.() ?? 1);
    const out = new AbortController();
    const emit = (frame: AgentStreamEvent) => {
      options.onFrame?.(frame);
      return frame;
    };
    yield emit({
      event: "status",
      data: { status: "started", conversation_id: conversationId, thread_id: threadId, principal_id: "demo-visitor", run_id: run.runId },
    });
    for (const step of steps) {
      if (!isFrame(step)) {
        await sleep(step.wait / speed(), out.signal);
      } else {
        await sleep((step.event === "token" ? TOKEN_DELAY_MS : FRAME_DELAY_MS) / speed(), out.signal);
      }
      if (run.stop) {
        if (answer) {
          answer.status = "stopped";
          answer.settledAt = Date.now();
        }
        yield emit({ event: "result", data: { status: "stopped", message: answer?.text ?? "", conversation_id: conversationId, thread_id: threadId } });
        yield emit({ event: "done", data: {} });
        return;
      }
      if (!isFrame(step)) continue;
      const frame: AgentStreamEvent =
        step.event === "result" ? { event: "result", data: { conversation_id: conversationId, thread_id: threadId, ...step.data } } : step;
      if (answer) foldFrame(answer, frame);
      yield emit(frame);
    }
    if (answer) answer.settledAt = Date.now();
    yield emit({ event: "done", data: {} });
  }

  function start(turn: ChatTurn<DemoParams>, signal: AbortSignal): Promise<AsyncIterable<AgentStreamEvent>> {
    const ctx = context(turn);
    const steps = pickScenario(turn.message, ctx.attachments).steps(ctx);
    const failed = steps.some((step) => isFrame(step) && step.event === "error");
    const answer = failed ? null : emptyAnswer(Date.now());
    if (answer) place(turn.message, answer);
    const run = { runId: nextId("run"), stop: false };
    active = run;
    signal.addEventListener("abort", () => {
      if (active === run) active = null;
    });
    return Promise.resolve(play(steps, answer, run));
  }

  /** Records a finished exchange without streaming it, for a conversation that "already happened". */
  function seedExchange(question: string, at: number): void {
    const ctx: RunContext = { question, variant: 0, attempt: 1, attachments: [] };
    const answer = emptyAnswer(at + 1_500);
    for (const step of pickScenario(question, []).steps(ctx)) {
      if (isFrame(step) && step.event !== "error") foldFrame(answer, step);
    }
    answer.settledAt = answer.at + SEED_DURATION_MS;
    const q: Question = { id: nextId("q"), text: question, answers: [answer], ai: 0, at };
    exchanges.push({ id: nextId("x"), questions: [q], qi: 0 });
  }
  for (const item of options.seed ?? []) seedExchange(item.question, item.at);

  const findExchange = (messageId: string) =>
    exchanges.findIndex((x) =>
      x.questions.some((q) => q.id === messageId || q.answers.some((a) => a.id === messageId))
    );

  return {
    conversationId,
    threadId,
    snapshot: () => branch(),
    send: (turn, signal) => start(turn, signal),
    regenerate: (turn, signal) => start(turn, signal),
    resume: async (turn): Promise<InvokeResponse> => {
      await new Promise((resolve) => setTimeout(resolve, 600));
      let message = `Done. I moved the delivery to ${turn.answer}.`;
      if (turn.interruptKind === APPROVAL_INTERRUPT_KIND) {
        const edited = (turn.values?.edited_action as { args?: { amount?: number } } | undefined)?.args?.amount;
        message =
          turn.answer === "deny"
            ? "Understood. I did not issue the refund."
            : `Done. The refund of ${edited ?? 250} USD was ${turn.answer === "edit" ? "approved with your change" : "approved"}.`;
      }
      const at = Date.now();
      const answer = { ...emptyAnswer(at), text: message, parts: [{ kind: "text" as const, id: nextId("p"), text: message }] };
      const label = turn.interruptKind === APPROVAL_INTERRUPT_KIND ? approvalAnswerLabel(turn.answer) : turn.answer;
      const q: Question = { id: nextId("q"), text: label, answers: [answer], ai: 0, at };
      exchanges.push({ id: nextId("x"), questions: [q], qi: 0 });
      return { status: "completed", message, conversation_id: conversationId, thread_id: threadId };
    },
    stop: async (runId) => {
      if (active?.runId !== runId) return false;
      active.stop = true;
      return true;
    },
    branches: {
      load: async () => branch(),
      switchTo: async (_conversation, messageId) => {
        const index = findExchange(messageId);
        if (index >= 0) {
          const exchange = exchanges[index];
          const qi = exchange.questions.findIndex((q) => q.id === messageId);
          if (qi >= 0) exchange.qi = qi;
          else {
            const q = exchange.questions[exchange.qi];
            q.ai = Math.max(0, q.answers.findIndex((a) => a.id === messageId));
          }
        }
        return branch();
      },
      fork: async (kind, _conversation, messageId, content) => {
        const index = findExchange(messageId);
        if (index < 0) throw new Error("That message is not in this conversation.");
        const exchange = exchanges[index];
        if (kind === "edit") {
          const q: Question = { id: nextId("q"), text: content ?? "", answers: [], ai: 0, at: Date.now() };
          exchange.questions.push(q);
          exchange.qi = exchange.questions.length - 1;
          exchanges.length = index + 1;
          fork = { kind, index };
          return { conversationId, messages: branch(), message: q.text };
        }
        fork = { kind, index };
        return { conversationId, messages: branch(index), message: exchange.questions[exchange.qi].text };
      },
      canEdit: true,
    },
  };
}
