import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import { ChatKitProvider } from "@hiro/niru-chat-kit/mui";
import { Link as RouterLink } from "react-router-dom";
import { Code } from "../components/Code";
import { Stage } from "../components/Example";
import { C, Callout, P, PageHeader, Section } from "../components/Section";
import { createConversation } from "../demo/conversations";
import { DemoChat } from "../demo/DemoChat";
import { STARTERS } from "../demo/scenarios";
import { usePageTitle } from "../site/use-page-title";

const QUICK_START = `import { useChatStream, type ChatTransport } from "@hiro/niru-chat-kit";
import { ChatKitProvider, FullChat } from "@hiro/niru-chat-kit/mui";

// The transport is the one piece you write. It sends messages to your backend
// and hands back the reply as it arrives. The Core pages show how to write one.
declare const transport: ChatTransport;

export function Chat() {
  const stream = useChatStream(transport, { branching: true });
  return (
    <ChatKitProvider>
      <FullChat stream={stream} agent={{ name: "Assistant", initial: "A" }} />
    </ChatKitProvider>
  );
}`;

export default function Introduction() {
  usePageTitle("Introduction");
  const [conversation] = useState(() => createConversation(() => 1));
  return (
    <>
      <PageHeader
        title="niru-chat-kit"
        lead="niru-chat-kit is a ready-made AI chat for React: the message list, the box people type in, streaming replies, tool steps, sources and more."
      />
      <Stack direction="row" spacing={1.5} sx={{ mb: 3 }}>
        <Button component={RouterLink} to="/installation" variant="contained">
          Install
        </Button>
        <Button component={RouterLink} to="/demo" variant="outlined">
          Full-screen demo
        </Button>
      </Stack>
      <Box aria-label="Live chat">
        <ChatKitProvider>
          <Stage height={560}>
            <DemoChat key={conversation.id} conversation={conversation} starters={STARTERS.slice(0, 5)} greeting="This chat is live. Pick a suggestion below. The replies are scripted, so no AI model and no network is involved." />
          </Stage>
        </ChatKitProvider>
      </Box>
      <Section title="Two parts">
        <P>
          The kit comes as two packages in one. <C>@hiro/niru-chat-kit</C> is the core. It handles the conversation: sending a message, reading the reply as it
          arrives, keeping follow-up questions, branches and approvals, all through a hook called <C>useChatStream</C>. It does not import a UI library and does
          not know any URL. Your app tells it how to reach your backend by giving it a <C>ChatTransport</C>, a small object that sends a message to your backend
          and hands back the reply as it streams in.
        </P>
        <P>
          <C>@hiro/niru-chat-kit/mui</C> draws it with Material UI. It has small building blocks (<C>Message</C>, <C>Reasoning</C>, <C>Tool</C>, <C>Source</C> and
          others), bigger ready-made pieces (<C>Conversation</C>, <C>Composer</C>, <C>FullChat</C>), <C>JSXPreview</C> and <C>ChatKitProvider</C>, which holds your
          colours and sizes.
        </P>
        <P>
          If you are unsure where to start, use <C>FullChat</C>. It puts the message list, the message box and the history sidebar together in one component.
        </P>
        <Callout title="Why two parts">
          The core never imports Material UI, and a test in the repo fails the build if it ever does. That keeps the door open for a second set of components (a
          shadcn one is planned) that would reuse the same core and the same colour names.
        </Callout>
      </Section>
      <Section title="The shortest chat">
        <P>
          This is a whole chat. Replace <C>transport</C> with your own and you are done. Installation walks through it from an empty app, with a working
          transport you can copy.
        </P>
        <Code code={QUICK_START} />
        <P>
          Colours and corner sizes come from tokens, which are named values such as <C>accent</C>. Change a token once on <C>ChatKitProvider</C> and the whole
          chat follows. You can try it on the <RouterLink to="/theming">Theming</RouterLink> page.
        </P>
      </Section>
      <Section title="Where to go next">
        <P>
          To add the kit to an app, follow <RouterLink to="/installation">Installation</RouterLink>. To connect it to your backend, read{" "}
          <RouterLink to="/core">Core</RouterLink>. To see everything in action, open the <RouterLink to="/demo">live demo</RouterLink>, where you can
          regenerate a reply, edit a message, approve an action and trigger an error.
        </P>
      </Section>
    </>
  );
}
