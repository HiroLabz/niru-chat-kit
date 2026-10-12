import { ESSAY_ANSWER } from "./answers";
import { fail, finish, followUps, pause, say, type Scenario } from "./frames";

export const refund: Scenario = {
  id: "approval",
  starter: "Issue a 250 refund",
  keywords: ["refund", "approve", "approval"],
  shows: "The reply pauses and asks you to Approve, Edit or Deny an action",
  steps: () => [
    ...say("I need a person to approve this before I move any money."),
    pause({
      kind: "tool_approval",
      question: "Approve a refund of 250 USD to the customer?",
      options: [],
      tool: "issue_refund",
      actions: [{ name: "issue_refund", args: { amount: 250, currency: "USD", reason: "Late delivery" } }],
      can_edit: true,
      fields: [],
    }),
  ],
};

export const delivery: Scenario = {
  id: "question",
  starter: "Move my delivery date",
  keywords: ["delivery", "deliver", "reschedule", "move my"],
  shows: "The reply pauses and asks an open question, which you answer in the message box",
  steps: () => [
    ...say("I can move it. I need one detail first."),
    pause({ kind: "ask_user", question: "Which date should the delivery move to?", options: [] }),
  ],
};

export const stay: Scenario = {
  id: "stay",
  starter: "Tailor my Cebu plan to 3 days",
  keywords: ["cebu", "tailor"],
  shows: "The reply pauses with a question and tappable answers; tap one, press its number or type your own",
  afterAnswer: (answer) => `Got it, ${answer}. Here is a 3-day plan that keeps the travel short from there.`,
  steps: () => [
    ...say("I can tailor it to 3 days. "),
    pause({
      kind: "clarify",
      question: "Where will you be staying?",
      options: ["Cebu City", "Mactan, near the airport", "Not decided yet"],
    }),
  ],
};

export const error: Scenario = {
  id: "error",
  starter: "Show me an error",
  keywords: ["error", "fail", "broken"],
  shows: "A reply that fails, and a Retry button (the second try works)",
  steps: ({ attempt }) => {
    if (attempt === 0) {
      return [
        ...say("Let me check that for you. "),
        { wait: 500 },
        fail("demo_failure", "This reply failed on purpose. Press Retry."),
      ];
    }
    const text = "The second try worked. When a reply fails, what had already arrived stays on screen, and Retry asks for the whole reply again.";
    return [...say(text), followUps("Run some tools for me"), finish(text)];
  },
};

export const essay: Scenario = {
  id: "stop",
  starter: "Write a long essay, slowly",
  keywords: ["essay", "long", "slowly", "stop"],
  shows: "A slow reply you can stop; the part already shown is kept",
  steps: () => [...say(ESSAY_ANSWER).flatMap((frame) => [frame, { wait: 90 }]), finish(ESSAY_ANSWER)],
};

export const files: Scenario = {
  id: "files",
  starter: "What can you do with my files?",
  keywords: ["file", "attach", "upload", "document"],
  shows: "Files attached to a message (nothing is uploaded)",
  steps: ({ attachments }) => {
    const text = attachments.length
      ? `I can see ${attachments.length === 1 ? "one file" : `${attachments.length} files`}: ${attachments.join(", ")}. Nothing is uploaded in this demo. The files stay in your browser tab and only their names reach the script.`
      : "No files came with that message. Click the paperclip, paste a file, or drop one anywhere on the chat, then send. Nothing is uploaded. Only the file names reach the script.";
    return [...say(text), followUps("Show me markdown and a table"), finish(text)];
  },
};

export const FALLBACK_ANSWER =
  "I am a scripted demo, so I can only answer a short list of things. Pick a suggestion, or type a word such as **markdown**, **code**, **maths**, **think**, **tools**, **sources**, **refund**, **delivery**, **cebu**, **error**, **essay** or **files**.";

export const fallback: Scenario = {
  id: "fallback",
  starter: "",
  keywords: [],
  shows: "Anything else gets a list of what you can ask",
  steps: () => [...say(FALLBACK_ANSWER), finish(FALLBACK_ANSWER)],
};
