# @hiro/niru-chat-kit

A streaming chat kit for React, modelled on [prompt-kit](https://github.com/ibelick/prompt-kit).
It has two layers:

- `@hiro/niru-chat-kit` (core): stream parsing, the frame-to-turn reducer, steps, copy text,
  follow-ups, branches, approvals and the `useChatStream` hook. No UI library, no knowledge of any URL.
- `@hiro/niru-chat-kit/mui` (MUI skin): compound parts, ready-made blocks, `JSXPreview` and the
  token provider. A shadcn skin that shares the same core and token names is planned.

## Install

The package is installed straight from GitHub. The build runs on install (`prepare`), so the
published `dist` is produced for you. Pin a tag.

```sh
pnpm add github:HiroLabz/niru-chat-kit#v0.1.0
npm install github:HiroLabz/niru-chat-kit#v0.1.0
yarn add HiroLabz/niru-chat-kit#v0.1.0
```

The build needs `tsup` and `typescript`, which the kit lists as dev dependencies. pnpm, npm and
yarn install them for a git dependency before running `prepare`, so nothing extra is needed.

Next.js: the package ships compiled ESM (`dist`) with type declarations, so `transpilePackages` is
not required.

## Peer dependencies

Install these in your app:

- Required: `react`, `react-dom` (19), `@mui/material`, `@mui/icons-material`, `@emotion/react`,
  `@emotion/styled`, `react-markdown`, `remark-gfm`, `marked`.
- Optional, loaded on demand and skipped gracefully if missing: `shiki` (code highlighting; without
  it code shows as plain text), `remark-math`, `rehype-katex` and `katex` (maths; without them the
  source stays visible as plain markdown). Install all four to get maths.

## Quick start

```tsx
import { useChatStream, type ChatTransport } from "@hiro/niru-chat-kit";
import { ChatKitProvider, Composer, Conversation } from "@hiro/niru-chat-kit/mui";
import { useState } from "react";

// You implement the transport: it is the only thing that knows your backend.
// send() resolves with an async iterable of stream frames (see parseSseStream
// in the core entry if your backend speaks SSE).
declare const transport: ChatTransport;

export function Chat() {
  const { messages, status, send, stop } = useChatStream(transport);
  const [draft, setDraft] = useState("");
  const busy = status === "connecting" || status === "streaming";

  return (
    <ChatKitProvider>
      <Conversation messages={messages} typing={status === "connecting"} onStop={() => void stop()} />
      <Composer
        value={draft}
        onChange={setDraft}
        busy={busy}
        onStop={() => void stop()}
        onSubmit={() => {
          void send(draft);
          setDraft("");
        }}
      />
    </ChatKitProvider>
  );
}
```

`ChatTransport` has `send`, `stop`, and optional `regenerate`, `resume` and `branches`. Frames are
`status`, `token`, `tool`, `thinking`, `reasoning`, `suggestions`, `needs_input`, `result`, `error`
and `done`.

## Tokens and theming

Wrap the chat in `ChatKitProvider`. Defaults come from the MUI theme's light and dark palettes.
`tokens` overrides any of them without touching a component, and every token is also written as a
`--nck-*` CSS variable on the provider's root element.

| Token | Meaning |
|---|---|
| `accent`, `accentContrast` | Primary action colour and the text on it |
| `text`, `mutedText`, `surface`, `border`, `muted` | Body text, secondary text, page surface, rules, hover fill |
| `assistantSurface`, `assistantText` | Assistant bubble and avatar |
| `userBubble`, `userBubbleText` | User bubble |
| `codeSurface`, `codeInlineSurface` | Fenced block, inline code |
| `info`, `success`, `warning`, `error` | Status colours |
| `radius`, `bubbleRadius` | Corner radii in px |
| `fontFamily`, `monoFontFamily` | Fonts |
| `codeThemeLight`, `codeThemeDark` | Shiki theme names |

A colour set at the top level applies to both schemes; set it under `light` or `dark` for one.

```tsx
<ChatKitProvider
  tokens={{
    accent: "#0e7c66",
    radius: 10,
    light: { userBubble: "#d8f0e8" },
    dark: { userBubble: "#1d3a32" },
  }}
>
  {children}
</ChatKitProvider>
```

`useChatKitTokens()` reads the resolved set. To restyle every chat in an app once, call
`setChatKitDefaultOverrides(...)` at start-up.

## What is in the box

Primitives (`/mui`):

- `Message`: user and assistant rows with avatar, content and actions.
- `ChatContainer`: auto-following, scrollable transcript with a scroll button.
- `Markdown`: GFM markdown with optional maths; no raw HTML.
- `CodeBlock`: Shiki-highlighted code with a copy button.
- `Loader`, `TextShimmer`, `ThinkingBar`: progress and waiting indicators.
- `PromptInput`, `PromptSuggestion`, `FileUpload`: input surface, suggestion chips, file picking.
- `Reasoning`, `Steps`, `ChainOfThought`: collapsible model thinking and step lists.
- `Tool`, `ToolArgs`: tool calls with state and arguments.
- `Source`: citation chips and cards.
- `ResponseStream`: text revealed as it streams.
- `SystemMessage`, `FeedbackBar`, `Image`: notices, thumbs feedback, safe images.
- `JSXPreview`: renders agent-written markup under an allowlist (see below).

Blocks (`/mui`):

- `Conversation`: the per-turn transcript. `FullChat`: transcript, composer and history in one.
- `Composer`, `ComposerPills`, `ComposerSuggestionsList`, `SuggestionPills`: message box and suggestions.
- `ChatEmptyState`, `ChatHistorySidebar`: the empty prompt and the thread list.
- `TurnTimeline`, `TurnSteps`, `TurnActions`, `TurnCopyButton`, `SourceList`, `FileChip`, `MessageNotes`: parts of a turn.
- `ApprovalCard`, `ApprovalFormFields`, `InterruptPrompt`, `InterruptEditForm`, `QuestionCard`, `MessageEditForm`: human-in-the-loop and editing.

## JSXPreview safety

`JSXPreview` renders markup an agent wrote. It is off unless you pass `components`, the allowlist.
It uses its own small reader (no `react-jsx-parser`):

- Only listed components and a fixed set of HTML tags render; any other tag shows as text.
- Attributes are limited to a safe set. `on*` handlers and `dangerouslySetInnerHTML` never pass,
  and neither do `javascript:` or `data:` URLs.
- `{expressions}` are never evaluated.

Do not enable it on a public surface.

## Core and MUI split

`src/core` imports no `@mui/*` and nothing from `src/mui`; `src/mui` imports core. A test
(`src/boundaries.test.ts`) fails on a violation. See `CONTRIBUTING.md`.

## Licence

MIT, (c) 2026 HiroLabz. Component names, compound shapes and behaviour were informed by prompt-kit,
MIT, (c) 2025 Julien Thibeaut; see `NOTICE`.
