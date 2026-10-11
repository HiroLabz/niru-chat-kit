/** The long answers the demo scripts stream. Kept apart from the scripts so each stays short. */

export const MARKDOWN_ANSWER = `## Streaming markdown

Replies arrive a few words at a time, and only the **paragraph still being written** is redrawn. You can use *emphasis*, ~~strike-through~~, \`inline code\` and [links](https://github.com/HiroLabz/niru-chat-kit).

### Lists

1. Ordered items keep their numbers
2. Nested bullets work too:
   - the core reads the reply and builds the conversation
   - the MUI part draws it

- [x] Task lists show ticked boxes
- [ ] and unticked ones

> A quote is indented and in a quieter colour, so a quoted passage looks like one.

### A table

| Part | Imports | Job |
| --- | --- | --- |
| core | no UI library | reads the reply, builds the conversation, hooks |
| MUI part | Material UI | small parts, ready-made blocks, tokens |

---

That is everything in this reply. Ask for code or maths next.`;

export const CODE_ANSWER = `Code is coloured by Shiki, a highlighting library, using a light or dark theme to match the page. Each block has a copy button.

**TypeScript** (using the kit)

\`\`\`typescript
import { useChatStream } from "@hiro/niru-chat-kit";

export function useAssistant(transport: ChatTransport) {
  const { messages, status, send, stop } = useChatStream(transport, { branching: true });
  return { messages, busy: status === "streaming", send, stop };
}
\`\`\`

**Python** (a backend that sends the reply in frames)

\`\`\`python
import json

async def stream_run(question: str):
    yield {"event": "status", "data": {"status": "started"}}
    for word in question.split():
        yield {"event": "token", "data": {"text": word + " "}}
    yield {"event": "done", "data": {}}

def to_sse(frame: dict):
    return f"event: {frame['event']}\\ndata: {json.dumps(frame['data'])}\\n\\n"
\`\`\`

**Bash**

\`\`\`bash
pnpm add github:HiroLabz/niru-chat-kit#<tag-or-commit>
pnpm add react react-dom @mui/material @mui/icons-material shiki
\`\`\`

**SQL**

\`\`\`sql
SELECT customer_id, SUM(total) AS spent
FROM orders
WHERE created_at >= date_trunc('month', now())
GROUP BY customer_id
ORDER BY spent DESC
LIMIT 10;
\`\`\`

**JSON**, **YAML** and **CSS** work too:

\`\`\`json
{ "event": "token", "data": { "text": "Hello " } }
\`\`\`

\`\`\`yaml
on:
  push:
    branches: [main]
jobs:
  docs:
    runs-on: ubuntu-latest
\`\`\`

\`\`\`css
.chat { border-radius: var(--nck-radius); color: var(--nck-text); }
\`\`\``;

export const MATH_ANSWER = `The quadratic formula solves \\(ax^2 + bx + c = 0\\):

$$ x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a} $$

The part under the square root, \\(\\Delta = b^2 - 4ac\\), is the **discriminant**. It tells you how many real solutions there are:

| Discriminant | Real solutions |
| --- | --- |
| \\(\\Delta > 0\\) | two |
| \\(\\Delta = 0\\) | one |
| \\(\\Delta < 0\\) | none |

Maths also works inside a sentence, as in \\(e^{i\\pi} + 1 = 0\\), and on its own line:

$$ \\sum_{k=1}^{n} k = \\frac{n(n+1)}{2} \\qquad \\int_0^1 x^2\\,dx = \\tfrac{1}{3} $$`;

export const TRIP_ANSWER = `A relaxed weekend works best with one anchor per day:

1. **Saturday:** take the early ferry, walk the old town, book dinner by the harbour.
2. **Sunday:** a slow breakfast, the market, and the 4 pm ferry back so Monday is easy.

The weather looks dry both days, so I kept the museum as a backup rather than a plan.`;

export const TOOLS_ANSWER = `I checked three things for you:

- The docs search found four pages on the token list.
- The orders query returned 128 rows for this month.
- The email could not be sent. This demo has no mail server, so that call failed on purpose.

I saved the order summary as a file. You can open it from the file chip above.`;

export const SOURCES_ANSWER = `Both parts use the same token names, so a second set of components could share the core and the theming without changes. The core has no UI library in it, and the MUI part draws everything with Material UI.

The component names and shapes follow prompt-kit, which is where this kit started.`;

export const ESSAY_ANSWER = `Why a chat kit has a core

A chat looks simple from the outside: a box, a list, a stream of words. Most of the work is not in drawing it. It is in deciding what the stream means. A piece of text adds to the answer. A tool message opens a card and later closes it. Thinking text belongs in a collapsed block. A pause waits for a person, and an error needs a way back.

If that logic lives inside the components, every new screen has to rewrite it. A website widget, an admin console and a desktop app all end up with their own half-working copy, and each one gets the awkward cases wrong in a different way. The awkward cases are the real product: what happens when the connection drops halfway through a tool call, or when someone presses stop while a step is still running, or when a regenerated answer arrives while the old one is still on screen.

So the kit is split in two. The core reads the reply and builds the conversation. It knows no URL and no component library. The MUI part draws that conversation with whatever design system an app already has. The line between them is small and typed, which also lets it be tested without a browser.

The result is that an app brings only two things: a transport that talks to its backend, and a theme. Everything in between is shared, including the parts nobody enjoys writing, like following the newest text without fighting the reader's scroll.

This answer streams slowly on purpose, so you have time to press Stop and see that the partial reply is kept.`;
