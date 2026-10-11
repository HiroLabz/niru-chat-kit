import { SCENARIOS } from "./scenarios";

/** What a visitor can try, for the demo's "What can I try?" list. */
export const SCRIPTED = SCENARIOS.map((scenario) => ({ starter: scenario.starter, shows: scenario.shows })).sort(
  (a, b) => a.starter.localeCompare(b.starter)
);

export const BUILT_IN = [
  "Ask for a new version of a reply (regenerate), then switch between versions with the arrows.",
  "Edit one of your messages with the pencil under it, then send it again.",
  "Copy a reply, rate it with the thumbs, or delete a message.",
  "Attach a file with the paperclip, paste one, or drop it on the chat, then send a message. Nothing is uploaded.",
  "Press Stop while the essay is arriving. The part already shown is kept.",
  "Use the conversation list on the left: search it, rename or delete a conversation, and see them grouped by date.",
  "Turn on dark mode or custom colours in the top bar.",
];
