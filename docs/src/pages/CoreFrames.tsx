import Box from "@mui/material/Box";
import { Code } from "../components/Code";
import { Example } from "../components/Example";
import { C, P, PageHeader, Section } from "../components/Section";
import { usePageTitle } from "../site/use-page-title";
import { CORE_EXAMPLES } from "./core-examples";

const FRAMES: Array<[string, string, string]> = [
  ["status", `{ "status": "started", "conversation_id": "c1", "thread_id": "t1", "principal_id": "me", "run_id": "run-1" }`, "Opens the reply and carries the ids. run_id is the value your transport's stop() receives."],
  ["token", `{ "text": "Hello " }`, "The next few words of the answer. Only the paragraph still being written is redrawn."],
  ["reasoning", `{ "id": "r1", "text": "I should check the docs first. " }`, "A piece of the model's thinking-out-loud text. It shows in a collapsed block and is left out of copying and history."],
  ["thinking", `{ "id": "t1", "label": "Weighed the options", "duration_ms": 2100, "parent_id": null }`, "A finished thinking step, with a short label and how long it took. It appears in the timeline."],
  ["tool", `{ "id": "tool-1", "name": "web_search", "title": "Searching the docs", "phase": "start", "status": null, "parent_id": null }`, "A tool the assistant is using. One frame with phase start when it begins and one with phase end when it finishes. The end frame carries a status (success, error or interrupted), a summary, details and, if the tool made one, a file."],
  ["suggestions", `{ "items": ["Show it as a table"] }`, "Follow-up questions shown as buttons under the answer."],
  ["needs_input", `{ "question": "Approve the refund?", "interrupt": { "kind": "tool_approval", "question": "...", "tool": "issue_refund" } }`, "The reply pauses to ask the person something: a question (kind ask_user) or an approval (kind tool_approval). You send the answer back with resume()."],
  ["result", `{ "status": "completed", "message": "Full answer", "citations": [{ "kind": "web", "label": "Docs", "url": "https://..." }] }`, "The final answer. status is completed or stopped. Sources (citations), files and any structured output come in this frame."],
  ["error", `{ "code": "upstream_failed", "message": "The model timed out." }`, "The reply failed. The chat shows the message next to a Retry button."],
  ["done", `{}`, "The stream is over. This is always the last frame."],
];

export default function CoreFrames() {
  usePageTitle("Frames");
  return (
    <>
      <PageHeader
        title="Frames"
        lead="Every kind of frame the chat understands. Use this page when you make your backend send replies in the right shape."
      />
      <P>
        A frame is one small labelled piece of a streamed reply. Your backend does not send the whole answer in one go. It sends a series of frames: some carry
        words, some say a tool started, and one marks the end. Your transport hands them to the chat in order, and the chat builds a turn (one question and its
        reply) from them.
      </P>
      <Section title="The frames">
        <P>
          Each frame is an object with an <C>event</C> name and a <C>data</C> payload, like <C>{`{ event, data }`}</C>. In TypeScript the type is{" "}
          <C>AgentStreamEvent</C>. These are all of them.
        </P>
        {FRAMES.map(([name, data, meaning]) => (
          <Box key={name} sx={{ mb: 2.5 }}>
            <P><strong>{name}</strong>: {meaning}</P>
            <Code language="json" code={`{ "event": "${name}", "data": ${data} }`} />
          </Box>
        ))}
      </Section>
      <Section title="The usual order">
        <P>A typical reply sends its frames in this order. Lines marked optional can be left out or repeated.</P>
        <Code language="text" code={`status
reasoning ...        (optional, any number)
tool start / end     (optional, any number, may overlap)
token ...            (the answer)
suggestions          (optional)
result               (or needs_input, or error)
done`} />
      </Section>
      <Section title="Reading a text/event-stream response">
        <P>
          Most backends send frames as server-sent events (SSE). That is a normal HTTP response that stays open while the server writes lines starting with{" "}
          <C>event:</C> and <C>data:</C>, with a blank line between frames. If your backend does this, pass the response body to <C>parseSseStream</C> and it
          gives you frames. If the connection goes quiet for too long it throws <C>SseStallError</C>. Edit the text below and press Parse to see it work.
        </P>
        <Example def={CORE_EXAMPLES.sse} />
      </Section>
    </>
  );
}
