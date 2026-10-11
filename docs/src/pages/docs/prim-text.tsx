import { useEffect, useState } from "react";
import Stack from "@mui/material/Stack";
import ReplayIcon from "@mui/icons-material/Replay";
import ThumbUpOffAltIcon from "@mui/icons-material/ThumbUpOffAlt";
import {
  CodeBlock,
  Loader,
  Markdown,
  Message,
  ResponseStream,
  TextShimmer,
  ThinkingBar,
  type LoaderVariant,
} from "@hiro/niru-chat-kit/mui";
import { example } from "../../components/Example";
import { C } from "../../components/Section";
import type { ComponentDoc } from "./types";
import raw from "./prim-text.tsx?raw";

// #region message-basic
function MessageBasic() {
  return (
    <Stack spacing={2}>
      <Message from="user">
        <Message.Content>How do I change the colours?</Message.Content>
      </Message>
      <Message>
        <Message.Avatar initial="N" />
        <Message.Content markdown>Pass **tokens** to `ChatKitProvider`. Every part of the chat uses them.</Message.Content>
      </Message>
    </Stack>
  );
}
// #endregion

// #region message-actions
function MessageWithActions() {
  return (
    <Message>
      <Message.Avatar initial="N" />
      <Stack>
        <Message.Content>Hover over an icon to see its tooltip.</Message.Content>
        <Message.Actions>
          <Message.Action tooltip="Regenerate">
            <ReplayIcon fontSize="small" />
          </Message.Action>
          <Message.Action tooltip="Good answer">
            <ThumbUpOffAltIcon fontSize="small" />
          </Message.Action>
        </Message.Actions>
      </Stack>
    </Message>
  );
}
// #endregion

// #region markdown-basic
const MD = `# Heading

Text with **bold**, *italic*, \`code\` and a [link](https://example.com).

- [x] Task lists
- Tables:

| Name | Role |
| --- | --- |
| core | logic |
| mui | drawing |

Maths: \\(a^2 + b^2 = c^2\\)

$$ \\int_0^1 x\\,dx = \\tfrac12 $$`;

function MarkdownBasic() {
  return <Markdown>{MD}</Markdown>;
}
// #endregion

// #region markdown-streaming
const SAMPLE = "Only the **part that is still growing** is redrawn, so a long reply stays smooth. ";

function MarkdownStreaming() {
  const [text, setText] = useState("");
  useEffect(() => {
    const timer = setInterval(() => setText((current) => (current.length >= SAMPLE.length ? "" : SAMPLE.slice(0, current.length + 3))), 80);
    return () => clearInterval(timer);
  }, []);
  return <Markdown>{text}</Markdown>;
}
// #endregion

// #region code-block-ready
function CodeBlockReady() {
  return <CodeBlock code={`const total = prices.reduce((sum, price) => sum + price, 0);`} language="typescript" />;
}
// #endregion

// #region code-block-compound
function CodeBlockCompound() {
  const code = `SELECT id, title\nFROM conversations\nORDER BY updated_at DESC;`;
  return (
    <CodeBlock>
      <CodeBlock.Group>
        <span>query.sql</span>
        <CodeBlock.CopyButton code={code} />
      </CodeBlock.Group>
      <CodeBlock.Code code={code} language="sql" />
    </CodeBlock>
  );
}
// #endregion

// #region loader-variants
const VARIANTS: LoaderVariant[] = ["circular", "classic", "pulse", "pulse-dot", "dots", "typing", "wave", "bars", "terminal", "text-blink", "shimmer", "text-shimmer", "loading-dots"];

function LoaderVariants() {
  return (
    <Stack direction="row" sx={{ flexWrap: "wrap", gap: 3 }}>
      {VARIANTS.map((variant) => (
        <Stack key={variant} spacing={1} sx={{ alignItems: "center", minWidth: 96 }}>
          <Loader variant={variant} text={variant.includes("text") || variant === "terminal" || variant === "shimmer" || variant === "loading-dots" ? "Thinking" : undefined} />
          <code>{variant}</code>
        </Stack>
      ))}
    </Stack>
  );
}
// #endregion

// #region text-shimmer
function ShimmerExample() {
  return <TextShimmer>Searching the docs for the answer</TextShimmer>;
}
// #endregion

// #region response-stream
function ResponseStreamExample() {
  const full = "Each new word fades in, which hides the jump when a new chunk of text arrives.";
  const [length, setLength] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setLength((n) => (n >= full.length + 20 ? 0 : n + 4)), 90);
    return () => clearInterval(timer);
  }, []);
  return <ResponseStream text={full.slice(0, length)} mode="fade" />;
}
// #endregion

// #region thinking-bar
function ThinkingBarExample() {
  return <ThinkingBar text="Thinking" onStop={() => undefined} />;
}
// #endregion

const IMPORT = (names: string) => `import { ${names} } from "@hiro/niru-chat-kit/mui";`;

export const PRIM_TEXT: Record<string, ComponentDoc> = {
  message: {
    summary: "One chat message shown as a row: an avatar, the text and a few small buttons. User messages sit on the right and assistant messages on the left. Use it to lay out messages yourself; Conversation already does this for you.",
    imports: IMPORT("Message"),
    api: ["Message", ["MessageAvatar", "Message.Avatar"], ["MessageContent", "Message.Content"], ["MessageActions", "Message.Actions"], ["MessageAction", "Message.Action"]],
    examples: [
      example(raw, "message-basic", <MessageBasic />, { title: "A user message and an assistant reply", description: <>Add <C>markdown</C> to <C>Message.Content</C> and the assistant text is drawn as markdown.</> }),
      example(raw, "message-actions", <MessageWithActions />, { title: "Buttons under a message", description: "Each button shows a tooltip when you hover over it." }),
    ],
  },
  markdown: {
    summary: "Draws markdown text: headings, lists, tables, links, code and maths. Use it for assistant replies. Raw HTML in the text is not drawn.",
    imports: IMPORT("Markdown"),
    api: ["Markdown"],
    examples: [
      example(raw, "markdown-basic", <MarkdownBasic />, { title: "Everything it can draw" }),
      example(raw, "markdown-streaming", <MarkdownStreaming />, { title: "While text is arriving", description: "The text grows three characters at a time, then starts over. Only the part still growing is redrawn, so a long reply stays smooth." }),
    ],
    notes: <>Code is coloured only when <C>shiki</C> is installed. Maths is drawn only when <C>katex</C>, <C>remark-math</C> and <C>rehype-katex</C> are installed. Without them you get plain code and the maths shows as typed. Maths can be written with <C>\( \)</C> or <C>\[ \]</C> as well as <C>$</C> and <C>$$</C>.</>,
  },
  "code-block": {
    summary: "A block of code with a language label and a copy button. Use it when you show code outside a markdown reply; Markdown already uses it for fenced code.",
    imports: IMPORT("CodeBlock"),
    api: ["CodeBlock", ["CodeBlockGroup", "CodeBlock.Group"], ["CodeBlockCode", "CodeBlock.Code"], ["CodeBlockCopyButton", "CodeBlock.CopyButton"]],
    examples: [
      example(raw, "code-block-ready", <CodeBlockReady />, { title: "Ready-made", description: "Pass code and language and you are done." }),
      example(raw, "code-block-compound", <CodeBlockCompound />, { title: "With your own header", description: "Build the row above the code yourself, here with a file name and a copy button." }),
    ],
    notes: <>Colours need <C>shiki</C> installed. Without it, code shows as plain text. Pick the colour themes with the <C>codeThemeLight</C> and <C>codeThemeDark</C> tokens, which are named colours and sizes you can change in the theme.</>,
  },
  loader: {
    summary: "A small loading indicator. Pick one of 13 styles and one of three sizes. Use it while you wait for something that has no text to show yet.",
    imports: IMPORT("Loader"),
    api: ["Loader"],
    examples: [example(raw, "loader-variants", <LoaderVariants />, { title: "All 13 styles" })],
  },
  "text-shimmer": {
    summary: "Text with a band of light sweeping across it. Use it for a status line such as Searching the docs. It stays still for people who have reduced motion switched on.",
    imports: IMPORT("TextShimmer"),
    api: ["TextShimmer"],
    examples: [example(raw, "text-shimmer", <ShimmerExample />, { title: "A status line" })],
  },
  "response-stream": {
    summary: "Draws text that arrives bit by bit. Show it plainly, or let each new word fade in. Use it when you do not need markdown.",
    imports: IMPORT("ResponseStream"),
    api: ["ResponseStream"],
    examples: [example(raw, "response-stream", <ResponseStreamExample />, { title: "Words fading in" })],
    notes: "If the person has reduced motion switched on in their system, the fade is skipped and the text appears plainly.",
  },
  "thinking-bar": {
    summary: "A shimmering status line with an optional Stop link. Show it in the gap before the first word of a reply arrives.",
    imports: IMPORT("ThinkingBar"),
    api: ["ThinkingBar"],
    examples: [example(raw, "thinking-bar", <ThinkingBarExample />, { title: "With a Stop link" })],
  },
};
