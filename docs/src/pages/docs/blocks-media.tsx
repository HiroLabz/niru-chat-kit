import { useState } from "react";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { MediaItem } from "@hiro/niru-chat-kit";
import { Conversation, MessageMedia } from "@hiro/niru-chat-kit/mui";
import { example } from "../../components/Example";
import { C } from "../../components/Section";
import type { ComponentDoc } from "./types";
import raw from "./blocks-media.tsx?raw";

/** A small drawing as a data URL, so the example needs no network. */
function drawing(fill: string, label: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="400" height="300" fill="#1e2a3a"/><circle cx="200" cy="150" r="70" fill="${fill}"/><text x="200" y="272" font-size="22" text-anchor="middle" fill="#ffffff" font-family="sans-serif">${label}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// #region message-media
const ITEMS: MediaItem[] = [
  { id: "sun", kind: "image", status: "ready", src: drawing("#f5b400", "Sun"), alt: "A yellow sun on a dark sky", title: "Sun", width: 400, height: 300 },
  { id: "moon", kind: "image", status: "ready", src: drawing("#d9d9e3", "Moon"), title: "Moon", width: 400, height: 300 },
  { id: "making", kind: "image", status: "loading", src: null, title: "Star", width: 400, height: 300 },
  { id: "broken", kind: "image", status: "failed", src: null, title: "Comet" },
];

function MediaExample() {
  const [log, setLog] = useState("Nothing yet.");
  return (
    <Stack spacing={1.5}>
      <MessageMedia
        items={ITEMS}
        onDownload={(item) => setLog("Download asked for " + item.id)}
        onRetry={(item) => setLog("Retry asked for " + item.id)}
      />
      <Typography variant="caption" color="text.secondary">{log}</Typography>
    </Stack>
  );
}
// #endregion

// #region media-conversation
function MediaInConversation() {
  return (
    <Conversation
      messages={[
        { id: "u1", role: "user", text: "Draw a sun" },
        { id: "a1", role: "assistant", text: "Here\u2019s your sun." },
      ]}
      renderMedia={(message) => (message.id === "a1" ? [ITEMS[0]] : undefined)}
      mediaProps={{ onDownload: () => undefined }}
    />
  );
}
// #endregion

export const BLOCKS_MEDIA: Record<string, ComponentDoc> = {
  "message-media": {
    summary: "Images, videos and sounds under an assistant reply, for example a picture the assistant generated. Images sit in a grid that keeps their shape and open in a lightbox. Videos and audio use the browser's own player. The kit never fetches anything: you give each item a src you already have.",
    imports: 'import type { MediaItem } from "@hiro/niru-chat-kit";\nimport { MessageMedia } from "@hiro/niru-chat-kit/mui";',
    api: ["MessageMedia"],
    examples: [
      example(raw, "message-media", <MediaExample />, {
        title: "Ready, loading and failed items",
        description: "Click a picture to open the lightbox. Use the arrow keys to move between pictures, Escape to close. The loading item is a skeleton. The failed one shows Retry because onRetry is given.",
        maxWidth: 560,
      }),
      example(raw, "media-conversation", <MediaInConversation />, {
        title: "Under a reply in Conversation or FullChat",
        description: "Pass renderMedia and the block is drawn under the reply, above the turn actions. mediaProps carries the callbacks and labels. Without renderMedia nothing is drawn.",
        maxWidth: 560,
      }),
    ],
    notes: (
      <>
        <p>
          A <C>MediaItem</C> has <C>id</C>, <C>kind</C> (<C>image</C>, <C>video</C> or <C>audio</C>), <C>src</C> (an https address, a <C>blob:</C> or a <C>data:</C> URL, or null while it is not ready), <C>status</C> (<C>loading</C>, <C>ready</C> or <C>failed</C>) and the optional <C>alt</C>, <C>title</C>, <C>mime</C>, <C>width</C>, <C>height</C>, <C>poster</C>, <C>durationSeconds</C> and <C>filename</C>. Give <C>width</C> and <C>height</C> when you know them, so the page does not jump when the picture arrives.
        </p>
        <p>
          Alt text is always there: <C>alt</C>, then <C>title</C>, then the label &quot;Generated image&quot;. If you pass <C>onOpen</C> the kit calls it on a click and opens no lightbox of its own. <C>onDownload</C> adds Download to the lightbox and under each video and audio player; your code does the saving. Videos never autoplay and load only their metadata. Under reduced motion the fade and zoom are off.
        </p>
        <p>
          Your content-security-policy must allow the sources you pass (<C>img-src</C>, <C>media-src</C>), including <C>blob:</C> or <C>data:</C> if you use them.
        </p>
      </>
    ),
  },
};
