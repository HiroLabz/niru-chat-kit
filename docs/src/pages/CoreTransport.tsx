import Box from "@mui/material/Box";
import { Code } from "../components/Code";
import { Example } from "../components/Example";
import { C, Callout, P, PageHeader, Section } from "../components/Section";
import { usePageTitle } from "../site/use-page-title";
import { CORE_EXAMPLES } from "./core-examples";

const FETCH = `import { ChatTransportError, parseSseStream, type ChatTransport } from "@hiro/niru-chat-kit";

const transport: ChatTransport = {
  async send(turn, signal) {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: turn.message, conversationId: turn.conversationId }),
      signal,
    });
    if (!response.ok || !response.body) throw new ChatTransportError("The chat service is unavailable.", null, response.status);
    return parseSseStream(response.body, signal);
  },
  async stop(runId) {
    const response = await fetch(\`/api/chat/\${runId}/stop\`, { method: "POST" });
    return response.ok;
  },
};`;

export default function CoreTransport() {
  usePageTitle("Writing a transport");
  return (
    <>
      <PageHeader
        title="Writing a transport"
        lead="Here you write the transport that connects the chat to your own backend. Once it sends messages, adding stop, approvals and regenerate takes a few more lines."
      />
      <P>
        A transport is the small object that sends a message to your backend and hands back the reply as it streams in. It needs two methods. Everything else
        is optional, and each extra method turns on a feature.
      </P>
      <Section title="The smallest transport">
        <P>
          <C>send</C> receives what the person typed and returns the reply as a stream of frames (a frame is one small piece of the reply, see the Frames
          page). <C>stop</C> tells your backend to stop and returns <C>true</C> if it did. The example below needs no backend. It answers by echoing your
          message back one word at a time, and the pane on the right shows each frame as it goes by.
        </P>
        <Example def={CORE_EXAMPLES.echo} />
      </Section>
      <Section title="Connecting a real backend">
        <P>If your backend streams its reply as server-sent events, <C>send</C> is a <C>fetch</C> call whose response body you pass to <C>parseSseStream</C>.</P>
        <ol>
          <li><P>Make your backend accept a POST with the message and answer with <C>text/event-stream</C>, one frame per event.</P></li>
          <li><P>Write <C>send</C> as below. It posts the message, throws a <C>ChatTransportError</C> if the response is not usable, and otherwise returns the parsed frames.</P></li>
          <li><P>Write <C>stop</C> to call whatever your backend uses to cancel a reply. It receives the <C>run_id</C> from the first <C>status</C> frame.</P></li>
          <li><P>Pass the transport to <C>useChatStream</C>. Send a message and check that words appear as they stream in.</P></li>
        </ol>
        <Code code={FETCH} />
      </Section>
      <Section title="Turning on more features">
        <P>Each row says what you add to the transport to get a feature.</P>
        <Box component="table" sx={{ borderCollapse: "collapse", width: "100%", mb: 2, "& th, & td": { textAlign: "left", p: 1, borderBottom: 1, borderColor: "divider", verticalAlign: "top" } }}>
          <thead>
            <tr><th scope="col">You want</th><th scope="col">What to add</th></tr>
          </thead>
          <tbody>
            <tr><td>Stop that keeps the partial answer</td><td>Make <C>stop</C> return <C>true</C> and end the stream with a <C>result</C> frame whose status is <C>stopped</C>. If <C>stop</C> returns <C>false</C>, the kit drops the connection and the partial answer is lost.</td></tr>
            <tr><td>Approvals and questions</td><td>Send a <C>needs_input</C> frame, then implement <C>resume</C> to receive the person&apos;s answer.</td></tr>
            <tr><td>Regenerate, edit and versions</td><td>Add <C>branches</C> (with <C>load</C>, <C>switchTo</C> and <C>fork</C>) and call <C>useChatStream</C> with <C>branching: true</C>.</td></tr>
            <tr><td>Settings that change per message</td><td>Pass them as <C>params</C> to <C>useChatStream</C>. They arrive unchanged in <C>turn.params</C>. The demo uses this to tell its script which files were attached.</td></tr>
          </tbody>
        </Box>
        <Callout title="The demo uses a transport too">
          The live demo has no server. Its transport lives in the browser tab and replays scripted frames, including <C>branches</C> and <C>resume</C>. Its
          code is in <C>docs/src/demo/replay-transport.ts</C> in the repository, if you want a larger example to read.
        </Callout>
      </Section>
    </>
  );
}
