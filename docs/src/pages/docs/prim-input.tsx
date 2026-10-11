import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import AddIcon from "@mui/icons-material/Add";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import {
  AgentAvatar,
  AVATAR_PRESETS,
  ChatContainer,
  FeedbackBar,
  FileUpload,
  Image,
  JSXPreview,
  PromptInput,
  PromptSuggestion,
  ScrollButton,
  SystemMessage,
} from "@hiro/niru-chat-kit/mui";
import type { FeedbackRating } from "@hiro/niru-chat-kit";
import { example } from "../../components/Example";
import { C } from "../../components/Section";
import type { ComponentDoc } from "./types";
import raw from "./prim-input.tsx?raw";

// #region prompt-input
function PromptInputExample() {
  const [value, setValue] = useState("");
  const [sent, setSent] = useState<string | null>(null);
  return (
    <Stack spacing={1}>
      <PromptInput value={value} onValueChange={setValue} onSubmit={() => { setSent(value); setValue(""); }} maxRows={6}>
        <PromptInput.Textarea placeholder="Press Enter to send, Shift+Enter for a new line" />
        <PromptInput.Actions>
          <PromptInput.Action tooltip="Add">
            <AddIcon fontSize="small" />
          </PromptInput.Action>
          <PromptInput.Action tooltip="Send">
            <ArrowUpwardIcon fontSize="small" />
          </PromptInput.Action>
        </PromptInput.Actions>
      </PromptInput>
      <Typography variant="caption" color="text.secondary">{sent ? "Last sent: " + sent : "Nothing sent yet."}</Typography>
    </Stack>
  );
}
// #endregion

// #region file-upload
function FileUploadExample() {
  const [names, setNames] = useState<string[]>([]);
  return (
    <FileUpload scope="zone" onFilesAdded={(files) => setNames(files.map((file) => file.name))}>
      <Box sx={{ p: 3, border: 1, borderStyle: "dashed", borderRadius: 2, textAlign: "center" }}>
        <FileUpload.Trigger asChild>
          <Button variant="outlined">Choose files</Button>
        </FileUpload.Trigger>
        <Typography sx={{ mt: 1 }} color="text.secondary">
          {names.length ? names.join(", ") : "or drop files here"}
        </Typography>
        <FileUpload.Content>
          <Typography>Drop to attach</Typography>
        </FileUpload.Content>
      </Box>
    </FileUpload>
  );
}
// #endregion

// #region prompt-suggestion
function PromptSuggestionExample() {
  const [picked, setPicked] = useState("");
  return (
    <Stack spacing={1.5}>
      <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1 }}>
        <PromptSuggestion onSelect={setPicked}>Show me a table</PromptSuggestion>
        <PromptSuggestion onSelect={setPicked}>Write some code</PromptSuggestion>
      </Stack>
      <Stack>
        <PromptSuggestion highlight="table" onSelect={setPicked}>Show me a table of the tokens</PromptSuggestion>
      </Stack>
      <Typography variant="caption" color="text.secondary">{picked ? "Picked: " + picked : "Pills wrap onto new lines. The second kind is a row that highlights the matching word."}</Typography>
    </Stack>
  );
}
// #endregion

// #region chat-container
function ChatContainerExample() {
  const [count, setCount] = useState(14);
  return (
    <Stack spacing={1}>
      <Box sx={{ height: 220, display: "flex", flexDirection: "column" }}>
        <ChatContainer.Root rearmKey={String(count)}>
          <ChatContainer.Content>
            {Array.from({ length: count }, (_, index) => (
              <Typography key={index} sx={{ py: 0.5 }}>Message {index + 1}</Typography>
            ))}
          </ChatContainer.Content>
          <ChatContainer.ScrollAnchor />
        </ChatContainer.Root>
      </Box>
      <Button size="small" onClick={() => setCount((n) => n + 1)}>Add a message</Button>
    </Stack>
  );
}
// #endregion

// #region scroll-button
function ScrollButtonExample() {
  return (
    <Box sx={{ position: "relative", height: 80 }}>
      <ScrollButton visible onClick={() => undefined} />
    </Box>
  );
}
// #endregion

// #region system-message
function SystemMessageExample() {
  return (
    <Stack spacing={1}>
      <SystemMessage severity="info">The agent is using a shared connection.</SystemMessage>
      <SystemMessage severity="warning">This answer is not backed by the sources.</SystemMessage>
      <SystemMessage severity="error" action={<Button size="small" color="inherit">Retry</Button>}>The run failed.</SystemMessage>
    </Stack>
  );
}
// #endregion

// #region feedback-bar
function FeedbackBarExample() {
  const [value, setValue] = useState<FeedbackRating | null>(null);
  return (
    <FeedbackBar
      value={value}
      onRate={async (rating) => {
        await new Promise((resolve) => setTimeout(resolve, 400)); // your request goes here
        setValue(rating);
      }}
    />
  );
}
// #endregion

// #region image
const PIXELS = "iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAbElEQVR42g3JQQEAMAgDMZxUClIqpVKQwvdcYGXLN1WFii5cpJhiiyuqhEQLi4gRK04/GjXduEkzzTbXP4xMG5uYMWvOP4JCB4eECRsuPwYNPXjIMMMONz8WLb14yTLLLrc/Dh19+Mgxxx53PJP8aZHb6FJwAAAAAElFTkSuQmCC";

function ImageExample() {
  return (
    <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
      <Image base64={PIXELS} mediaType="image/png" alt="A gradient from base64" sx={{ "& img": { width: 96, imageRendering: "pixelated" } }} />
      <Image src="/favicon.svg" alt="An image from a URL" sx={{ "& img": { width: 96 } }} />
    </Stack>
  );
}
// #endregion

// #region jsx-preview
function JsxPreviewExample() {
  return (
    <JSXPreview
      components={{}}
      jsx={'<h3>Order summary</h3><p>Status: <strong>shipped</strong></p><p onClick="alert(1)">Handlers never fire.</p><script>alert(1)</script>'}
    />
  );
}
// #endregion

// #region agent-avatar
function AgentAvatarExample() {
  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", flexWrap: "wrap" }}>
      {AVATAR_PRESETS.slice(0, 8).map((preset) => (
        <AgentAvatar key={preset.id} avatar={{ kind: "preset", preset_id: preset.id }} name={preset.id} size={44} />
      ))}
    </Stack>
  );
}
// #endregion

const IMPORT = (names: string) => `import { ${names} } from "@hiro/niru-chat-kit/mui";`;

export const PRIM_INPUT: Record<string, ComponentDoc> = {
  "prompt-input": {
    summary: "The message box, built from parts so you choose the layout: a text field and a row of buttons. Use it when you build your own layout. For a finished box with attachments, voice and toggles, use Composer.",
    imports: IMPORT("PromptInput"),
    api: ["PromptInput", ["PromptInputTextarea", "PromptInput.Textarea"], ["PromptInputActions", "PromptInput.Actions"], ["PromptInputAction", "PromptInput.Action"]],
    examples: [example(raw, "prompt-input", <PromptInputExample />, { title: "Controlling the text yourself", description: "You hold the text in state and pass it in with value. Leave value out and the box keeps its own text." })],
    notes: <>Enter sends the message. Shift+Enter starts a new line. Enter does not send while someone is still composing text with an input method editor, such as for Japanese or Chinese.</>,
  },
  "file-upload": {
    summary: "Lets people pick files or drop them in. Use it around any area that should accept files. The scope decides whether a drop works anywhere on the page or only on one box.",
    imports: IMPORT("FileUpload"),
    api: ["FileUpload", ["FileUploadTrigger", "FileUpload.Trigger"], ["FileUploadContent", "FileUpload.Content"]],
    examples: [example(raw, "file-upload", <FileUploadExample />, { title: "A drop box", description: "Nothing is uploaded. The example only shows the file names." })],
    notes: <>Files that do not match <C>accept</C> are dropped before <C>onFilesAdded</C> is called.</>,
  },
  "prompt-suggestion": {
    summary: "A suggestion for the person to tap, drawn as a small chip or as a full-width row. The row can highlight the part of the text that matches what they have typed.",
    imports: IMPORT("PromptSuggestion"),
    api: ["PromptSuggestion"],
    examples: [example(raw, "prompt-suggestion", <PromptSuggestionExample />, { title: "Chips and a highlighted row" })],
  },
  "chat-container": {
    summary: "The scrolling area for messages. It stays at the newest message while text grows, lets go as soon as the person scrolls up, and shows a jump to latest button. Use it when you build your own message list; Conversation already includes one.",
    imports: IMPORT("ChatContainer"),
    api: [["ChatContainerRoot", "ChatContainer.Root"], ["ChatContainerContent", "ChatContainer.Content"], ["ChatContainerScrollAnchor", "ChatContainer.ScrollAnchor"]],
    examples: [example(raw, "chat-container", <ChatContainerExample />, { title: "Follows new messages", description: "Scroll up, then add a message: the view stays where you are. Scroll back to the bottom and it follows again." })],
    notes: "Screen readers announce new messages politely, without interrupting. When the person sends a message, change rearmKey to a new value so the view starts following again.",
  },
  "scroll-button": {
    summary: "The round jump to latest button. ChatContainer shows it when the reader has scrolled away from the newest message. Use it on its own only if you build your own scrolling area.",
    imports: IMPORT("ScrollButton"),
    api: ["ScrollButton"],
    examples: [example(raw, "scroll-button", <ScrollButtonExample />, { title: "Shown" })],
  },
  "system-message": {
    summary: "A banner inside the chat for something that is not a message: information, a warning or an error. It can carry a button such as Retry.",
    imports: IMPORT("SystemMessage"),
    api: ["SystemMessage"],
    examples: [example(raw, "system-message", <SystemMessageExample />, { title: "Info, warning and error" })],
  },
  "feedback-bar": {
    summary: "Thumbs up and thumbs down buttons for a finished reply. While your request is running, both buttons are off. If the request fails, the old rating comes back and an error shows.",
    imports: `${IMPORT("FeedbackBar")}\nimport type { FeedbackRating } from "@hiro/niru-chat-kit";`,
    api: ["FeedbackBar"],
    examples: [example(raw, "feedback-bar", <FeedbackBarExample />, { title: "Saving a rating", description: "The example waits 400 milliseconds, as if it were talking to your server." })],
  },
  image: {
    summary: "Shows an image the model made. It shows a placeholder while the image loads and a text fallback if it fails. Give it an address, or the image bytes as base64 text or a Uint8Array together with a media type.",
    imports: IMPORT("Image"),
    api: ["Image"],
    examples: [example(raw, "image", <ImageExample />, { title: "From base64 and from an address" })],
    notes: <>Bytes need an <C>image/*</C> media type. Anything else is refused and not drawn.</>,
  },
  "jsx-preview": {
    summary: "Draws markup that an agent wrote, safely. Only the components you list and plain HTML tags are drawn, only safe attributes are kept, and nothing is run. It is off until you pass components.",
    imports: IMPORT("JSXPreview"),
    api: ["JSXPreview"],
    examples: [example(raw, "jsx-preview", <JsxPreviewExample />, { title: "Unsafe markup, made harmless", description: "The click handler and the script tag do nothing." })],
    notes: <>Read the JSXPreview safety page first and try to break it. Do not switch this on for a public page.</>,
  },
  "agent-avatar": {
    summary: "The agent's face: one of 24 built-in drawings, or an image from an address.",
    imports: IMPORT("AgentAvatar, AVATAR_PRESETS"),
    api: ["AgentAvatar"],
    examples: [example(raw, "agent-avatar", <AgentAvatarExample />, { title: "The built-in drawings" })],
  },
};
