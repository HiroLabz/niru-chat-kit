import { useState } from "react";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import { ConversationHeader } from "@hiro/niru-chat-kit/mui";
import { example } from "../../components/Example";
import { C } from "../../components/Section";
import type { ComponentDoc } from "./types";
import raw from "./blocks-header.tsx?raw";

// #region conversation-header
function HeaderExample() {
  const [pinned, setPinned] = useState(false);
  const [saved, setSaved] = useState(false);
  return (
    <Stack spacing={2}>
      <ConversationHeader title="Refund policy questions" pinned={pinned} onPinChange={setPinned} saved={saved} onSaveChange={setSaved} />
      <ConversationHeader title="Only a title" />
      <ConversationHeader
        title="With an action of your own"
        saved
        onSaveChange={() => undefined}
        actions={<Button size="small">Share</Button>}
      />
    </Stack>
  );
}
// #endregion

export const BLOCKS_HEADER: Record<string, ComponentDoc> = {
  "conversation-header": {
    summary: "A slim bar for the top of a chat: the conversation's title, a Pin button, a Save button and room for your own actions. Use it with the header prop of FullChat, or above a Conversation you lay out yourself.",
    imports: 'import { ConversationHeader } from "@hiro/niru-chat-kit/mui";',
    api: ["ConversationHeader"],
    examples: [example(raw, "conversation-header", <HeaderExample />, { title: "Pin and Save, a plain title and an extra action", description: "Pin and Save are toggles, so they show as pressed when on. Each one appears only when you pass its change function. The Save button is a bookmark." })],
    notes: <>The bar only reports clicks. <C>onPinChange</C> and <C>onSaveChange</C> are called with the value the person is asking for, and your app keeps the real state and passes it back as <C>pinned</C> and <C>saved</C>. Save here means the whole chat. To save a single reply, use <C>onSave</C> on <C>TurnActions</C>.</>,
  },
};
