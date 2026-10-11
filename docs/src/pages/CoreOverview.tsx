import Box from "@mui/material/Box";
import { Code } from "../components/Code";
import { Example } from "../components/Example";
import { C, P, PageHeader, Section } from "../components/Section";
import { usePageTitle } from "../site/use-page-title";
import { CORE_EXAMPLES } from "./core-examples";

const TRANSPORT = `type ChatTransport<TParams = unknown> = {
  send: (turn: ChatTurn<TParams>, signal: AbortSignal) => Promise<AsyncIterable<AgentStreamEvent>>;
  regenerate?: (turn: ChatTurn<TParams> & { regenerate: { messageId: string } }, signal: AbortSignal) => Promise<AsyncIterable<AgentStreamEvent>>;
  resume?: (turn: ChatResumeTurn, signal: AbortSignal) => Promise<InvokeResponse>;
  stop: (runId: string) => Promise<boolean>;
  branches?: ChatBranches<TParams>;
};`;

export default function CoreOverview() {
  usePageTitle("Core");
  return (
    <>
      <PageHeader
        title="Core"
        lead="How a message gets from the chat to your backend and back, and the one hook that makes the chat work."
      />
      <Section title="How a message travels">
        <P>The core does everything except drawing. It has no UI library and no URLs built in. This is the whole trip of one message:</P>
        <Code language="text" code={`1. You type a message and press Enter.
2. The transport sends it to your backend.
3. The reply streams back in pieces, called frames.
4. The chat draws each frame as it arrives.`} />
        <P>
          Four words in that picture are worth pinning down, because the rest of these pages use them. The <strong>transport</strong> is a small object you
          write once. It sends a message to your backend and hands back the reply as it streams in. To <strong>stream</strong> means the reply arrives in small
          pieces over time instead of all at once, so the first words show up quickly. Each piece is a <strong>frame</strong>: a tiny labelled message such as
          &quot;here are the next words&quot; or &quot;a tool has started&quot;. A <strong>turn</strong> is one round of the conversation, meaning what the
          person asked and the reply being built from the frames. The Frames page lists every kind of frame.
        </P>
      </Section>
      <Section title="ChatTransport">
        <P>
          The transport is the only connection between the kit and your backend. You write it once and every chat in your app uses it. It is an object with
          these methods. Only the first two are required.
        </P>
        <Code code={TRANSPORT} />
        <Box component="table" sx={{ borderCollapse: "collapse", width: "100%", mb: 2, "& th, & td": { textAlign: "left", p: 1, borderBottom: 1, borderColor: "divider", verticalAlign: "top" } }}>
          <thead>
            <tr><th scope="col">Method</th><th scope="col">What it does</th></tr>
          </thead>
          <tbody>
            <tr><td><C>send</C></td><td>Starts a reply. It resolves with the frames in order, as soon as the response opens. Reading ends when the reply finishes or when <C>signal</C> is aborted (the person pressed Stop).</td></tr>
            <tr><td><C>stop</C></td><td>Asks your backend to stop a reply. Return <C>true</C> if it accepted. The stream should then end with a <C>result</C> frame whose status is <C>stopped</C>, and the chat keeps the part of the answer already shown.</td></tr>
            <tr><td><C>regenerate</C></td><td>Optional. Asks for a new answer to a message that already has one. If you leave it out, the kit calls <C>send</C> with <C>turn.regenerate</C> set.</td></tr>
            <tr><td><C>resume</C></td><td>Optional. Sends the person&apos;s answer to a reply that paused to ask something, such as an approval, and resolves with the result.</td></tr>
            <tr><td><C>branches</C></td><td>Optional. Turns on regenerate, edit and switching between versions of an answer. Your server keeps the conversation tree and the kit draws what <C>load</C>, <C>switchTo</C> and <C>fork</C> return.</td></tr>
          </tbody>
        </Box>
        <P>When something goes wrong, throw a <C>ChatTransportError</C> (any <C>Error</C> works too). Its <C>message</C> is the text the chat shows next to the Retry button.</P>
      </Section>
      <Section title="useChatStream">
        <P>
          This is the hook that runs a chat. Give it your transport and it returns the messages to draw, what state the chat is in, and the functions to send,
          stop and retry.
        </P>
        <Code code={`const {
  messages, status, error, interrupt, followUps, // what to draw
  send, resume, retry, stop, abort,              // what to do
  turnActions,                                   // regenerate, edit, switch version
  conversationId, threadId, latencyMs, result,
} = useChatStream(transport, { params, branching: true, initialMessages });`} />
        <P>
          <C>status</C> is one of <C>idle</C>, <C>connecting</C>, <C>streaming</C>, <C>needs_input</C>, <C>done</C> and <C>error</C>. We recommend passing the
          whole result to <C>FullChat</C>. If you build your own layout, take only the fields you need.
        </P>
        <P>
          The options: <C>params</C> is passed to your transport on every turn, and values you give to a single <C>send</C> call win over it.{" "}
          <C>initialMessages</C>, <C>initialConversationId</C> and <C>initialThreadId</C> are read once, when the chat first appears, so you can reopen a chat
          with its old messages. <C>branching</C> turns on version switching and needs <C>transport.branches</C>.
        </P>
        <Example def={CORE_EXAMPLES.replay} />
      </Section>
      <Section title="Other things the core exports">
        <P>You will not need these on day one. They are here so you know they exist.</P>
        <ul>
          <li><P><C>parseSseStream</C> and <C>SseStallError</C> read a server-sent events response (explained on the frames page) and give up if it goes quiet for too long.</P></li>
          <li><P><C>applyToolFrame</C>, <C>applyThinkingFrame</C> and the turn-part helpers (<C>appendTokenPart</C>, <C>splitTurnParts</C> and others) turn frames into the timeline of a turn.</P></li>
          <li><P><C>useSpeechInput</C> adds dictation from the browser&apos;s own speech recognition, when the browser has it.</P></li>
          <li><P><C>filterConversations</C> and <C>groupConversationsByAge</C> do the search and the Today, Yesterday and Older grouping in the history sidebar.</P></li>
          <li><P><C>toChatMessages</C> and <C>annotateFromHistory</C> convert stored messages into turns, so you can load an old conversation.</P></li>
          <li><P>The token types and <C>applyChatKitOverrides</C>, for working with theme values.</P></li>
        </ul>
      </Section>
    </>
  );
}
