# @hiro/niru-chat-kit

niru-chat-kit gives you a working AI chat for your React app: the message list, the box people type in, streaming replies, tool steps, sources and more. It is modelled on [prompt-kit](https://github.com/ibelick/prompt-kit).

It has two parts:

- `@hiro/niru-chat-kit` is the core. It handles the conversation: sending a message, reading the reply as it arrives, follow-up questions, branches, approvals and the `useChatStream` hook. It uses no UI library and knows no URL.
- `@hiro/niru-chat-kit/mui` draws the conversation with Material UI components you can recolour. It has small building blocks, ready-made pieces, `JSXPreview` and the provider that holds your colours. A shadcn version that shares the same core is planned.

Below is the short version: install the kit and get a chat on screen. The documentation site has a live demo and the full details.

## Install

The kit is not on npm. You install it from GitHub, and your package manager builds it during the install. Pin a tag or a commit so every install gets the same code.

```sh
pnpm add github:HiroLabz/niru-chat-kit#<tag-or-commit>
npm install github:HiroLabz/niru-chat-kit#<tag-or-commit>
yarn add HiroLabz/niru-chat-kit#<tag-or-commit>
```

The build needs `tsup` and `typescript`. The package lists them as dev dependencies and pnpm, npm and yarn install them for you before the build runs.

### pnpm 10: allow the build step

pnpm 10 refuses to run the build step of a dependency unless you allow it by name. For a package from GitHub the name includes the commit, so you have to give the full commit id. Without this, `pnpm add` stops with the error `ERR_PNPM_GIT_DEP_PREPARE_NOT_ALLOWED`, and the message shows the address pnpm wanted.

1. Find the newest commit on `main`. The command prints a 40-character id.

   ```sh
   git ls-remote https://github.com/HiroLabz/niru-chat-kit.git refs/heads/main
   ```

2. In your app, create `pnpm-workspace.yaml` next to `package.json` (or open it if you have one) and add this, with your commit id in place of `<full-commit-sha>`.

   ```yaml
   allowBuilds:
     '@hiro/niru-chat-kit@https://codeload.github.com/HiroLabz/niru-chat-kit/tar.gz/<full-commit-sha>': true
   ```

3. Install the kit with the same commit id.

   ```sh
   pnpm add github:HiroLabz/niru-chat-kit#<full-commit-sha>
   ```

   You should see the install finish without errors.

The line names one commit, so when you move to a newer one, change the id in both places. If your app already uses `onlyBuiltDependencies` instead of `allowBuilds`, add the same address there. If you build in Docker, copy `pnpm-workspace.yaml` into the image before `pnpm install`. npm and yarn do not need this file.

Next.js: the package ships compiled ES modules with type declarations, so you do not need `transpilePackages`.

## Peer dependencies

The kit expects your app to provide these libraries.

Required: `react` and `react-dom` (version 19), `@mui/material`, `@mui/icons-material`, `@emotion/react`, `@emotion/styled`, `react-markdown`, `remark-gfm` and `marked`.

```sh
pnpm add @mui/material @mui/icons-material @emotion/react @emotion/styled react-markdown remark-gfm marked
```

Optional:

- `shiki` colours code in replies. Without it, code still shows, as plain text.
- `remark-math`, `rehype-katex` and `katex` draw maths. Without them the maths source shows as plain text. Install all three, or none.

## Quick start

This is a complete chat. The one thing you supply is the transport: a small object that sends a message to your backend and hands back the reply as it streams in. `send()` resolves with a stream of frames (small labelled pieces of the reply). If your backend sends server-sent events, `parseSseStream` in the core turns the response into frames.

```tsx
import { useChatStream, type ChatTransport } from "@hiro/niru-chat-kit";
import { ChatKitProvider, Composer, Conversation } from "@hiro/niru-chat-kit/mui";
import { useState } from "react";

// You write the transport. It is the only part that knows your backend.
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

A `ChatTransport` has `send` and `stop`, and optionally `regenerate`, `resume` and `branches`. The frames it can send are `status`, `token`, `tool`, `thinking`, `reasoning`, `suggestions`, `needs_input`, `result`, `error` and `done`. The documentation site explains each one.

If you would rather not lay out the chat yourself, use `FullChat`. It combines the message list, the message box and the history sidebar in one component.

## Tokens and theming

A token is a named colour or size, like `accent`, that every part of the chat reads when it draws itself. Change a token once and everything that uses it changes.

Wrap the chat in `ChatKitProvider`. Defaults come from the light and dark palettes of your MUI theme. The `tokens` prop overrides any of them without touching a component, and each token is also published as a CSS variable named `--nck-` plus its name, on the provider's root element.

| Token | What it controls |
|---|---|
| `accent`, `accentContrast` | The main colour (buttons, links) and the text on it |
| `text`, `mutedText`, `surface`, `border`, `muted` | Normal text, quieter text, the chat background, thin lines, the background on hover |
| `assistantSurface`, `assistantText` | The assistant's bubble and avatar |
| `userBubble`, `userBubbleText` | The bubble around your own messages |
| `codeSurface`, `codeInlineSurface` | Code blocks, and short code inside a sentence |
| `info`, `success`, `warning`, `error` | Colours for status messages |
| `radius`, `bubbleRadius` | How round corners are, in pixels |
| `fontFamily`, `monoFontFamily` | The font for text and the font for code |
| `codeThemeLight`, `codeThemeDark` | Names of the colour themes used for code (Shiki is the library that colours it) |

A colour set at the top level applies to both light and dark mode. Put it under `light` or `dark` to change one mode only.

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

`useChatKitTokens()` reads the final values. To restyle every chat in your app once, call `setChatKitDefaultOverrides(...)` when the app starts.

## What is included

Small parts, from `@hiro/niru-chat-kit/mui`:

- `Message`: a user or assistant row with avatar, content and actions.
- `ChatContainer`: a scrollable message area that follows new text, with a scroll-to-bottom button.
- `Markdown`: formatted text, with optional maths. Raw HTML is not allowed.
- `CodeBlock`: coloured code with a copy button.
- `Loader`, `TextShimmer`, `ThinkingBar`: waiting and progress indicators.
- `PromptInput`, `PromptSuggestion`, `FileUpload`: the input area, suggestion buttons and file picking.
- `Reasoning`, `Steps`, `ChainOfThought`: collapsible thinking and step lists.
- `Tool`, `ToolArgs`: a tool call with its state and arguments.
- `Source`: source chips and cards.
- `ResponseStream`: text revealed as it streams in.
- `SystemMessage`, `FeedbackBar`, `Image`: notices, thumbs up and down, and safe image display.
- `JSXPreview`: draws markup an agent wrote, within an allowlist (see below).

Ready-made blocks, from the same entry point:

- `Conversation` shows the messages. `FullChat` combines messages, message box and history in one.
- `Composer`, `ComposerPills`, `ComposerSuggestionsList`, `SuggestionPills`, `SlashCommandMenu`: the message box, suggestions and the slash-command list.
- `ChatEmptyState`, `ChatHistorySidebar`: the screen before the first message, and the list of past chats.
- `TurnTimeline`, `TurnSteps`, `TurnActions`, `TurnCopyButton`, `SourceList`, `FileChip`, `MessageNotes`: the parts of one reply.
- `ApprovalCard`, `ApprovalFormFields`, `InterruptPrompt`, `InterruptEditForm`, `QuestionCard`, `MessageEditForm`: asking the person to approve, answer or edit. In `FullChat`, an agent's question is a `QuestionCard` in the thread (tap a suggested answer, press its number, or type in the normal message box); `InterruptPrompt` is the older bottom panel.

## Voice input

Give `Composer` the `voice` prop and it shows a microphone button that types what you say into the box. It uses the browser's own speech recognition (`SpeechRecognition` or `webkitSpeechRecognition`), which costs nothing. In a browser without it, such as Firefox, the button is hidden. Recognised phrases are added to the draft, and sending stops listening. If the microphone is blocked or nothing is heard, a short message appears. Set `voiceLang`, for example `en-PH`, to choose the language. The hook behind it is in the core:

```tsx
const { supported, listening, interim, error, start, stop } = useSpeechInput({
  lang: "en-PH",
  onFinal: (text) => setDraft((draft) => `${draft} ${text}`.trim()),
});
```

### Voice input that records

Where the browser has no speech recognition (an Electron or Chromium shell, for example), or when you want your own speech-to-text, pass `voice` as an object with `transcribe`. The mic then records with `MediaRecorder`, shows the elapsed time and a level, and on stop hands the audio to your function. The text it returns is added to the box. Escape or the mic stops and transcribes; Cancel discards. What the person typed is never changed when something fails.

```tsx
<Composer
  value={draft}
  onChange={setDraft}
  onSubmit={send}
  voice={{
    transcribe: async (audio, { mime, durationMs }) => (await myStt(audio, mime)).text, // reject with a plain-words Error on failure
    microphoneId, // optional deviceId
    maxDurationMs: 60_000, // default 120000
    disabledReason: onCall ? "The microphone is in use on a call." : null,
    labels: { start: "Record a voice message" },
  }}
/>
```

#### Placing the mic and choosing the microphone

By default the mic sits after the attach button. Set `voicePlacement="end"` on `Composer` (or `FullChat`) to put it immediately left of Send, drawn like the round call button; the call button, if you pass one, then sits before it. The recorder's states (asking, recording with time and level, transcribing, failed) still fit the row.

To let the person choose which microphone records, add `microphones` and `onSelectMicrophone` to the `voice` object. With at least one microphone and a handler, a small "Choose microphone" caret joins the mic button (`aria-haspopup="menu"`). It opens the same menu the call screen uses, with radio items and `microphoneId` checked. Choosing one calls `onSelectMicrophone(deviceId)`; store it and pass it back as `microphoneId`, and the next recording uses it. The caret is disabled while recording or transcribing, and is not drawn with an empty list or without the handler. The words "Choose microphone" and "Microphone" can be changed with `labels.chooseMicrophone` and `labels.unnamedMicrophone`.

```tsx
const { microphones } = useMicrophones(); // from the core entry; follows devicechange
<Composer
  voicePlacement="end"
  voice={{ transcribe, microphones, microphoneId, onSelectMicrophone: setMicrophoneId }}
  /* ... */
/>
```

`useMicrophones()` returns `{ microphones: { deviceId, label }[], refresh(): Promise<void> }`. The system default is listed first, the "communications" alias and duplicates are dropped, and a microphone whose name the browser still hides is called "Microphone 1", "Microphone 2" and so on. Names appear only after the microphone was allowed once, so call `refresh()` after permission is granted. On a narrow composer with `voicePlacement="end"` the mic stays in the row (attach, More, call, mic, Send) and the microphone list moves into More under a "Choose microphone" heading.

## Call mode

Call mode is a voice call screen, laid out like Gemini Live, that you can connect to your own voice service. The kit does not include a voice service. You write a `VoiceSession` (a snapshot of the call, a way to subscribe to changes, an audio level meter and a few methods) for LiveKit, WebRTC or the browser, and the kit draws the screens. `createFakeVoiceSession()` is a scriptable stand-in for tests and demos.

- `CallStage` is the full-screen call. It has a dark background with a soft glow in the accent colour. A menu slot sits at the top left, a captions switch and the person's avatar at the top right. The agent's mark and one large status line are in the centre ("The mic is yours, Kio" while listening; you can change the text for each state with `labels`). A row of round buttons runs along the bottom: camera, share screen, a wide pill that moves with the voice, microphone and end. A button only appears when the session says it can do that. Space mutes, Escape minimises (when `onMinimise` is set), and End asks for no confirmation. To lay the screen out yourself, use `CallStage.Header`, `.Status`, `.Captions`, `.Preview` and `.Controls`.
- Set `activity` on the snapshot (or the `activity` prop on `CallStage` or `CallStrip`) to a short sentence such as "Searching the web". While the call is thinking it shows under the status (on the strip it replaces the status text, on one line). With none, a long wait changes the line to "Still working on it" after `quietAfterMs` (default 8000).
- `VoiceLevelPill` is the default moving visual. `CallOrb` (`visual="orb"`) is Niru's orb, with a plain CSS circle where the browser has no WebGL. Both stay still when the person has asked their device for reduced motion.
- `CallStrip` is the minimised call. Pass it to `FullChat` as `aboveComposer` and it sits directly above the message box. Give `FullChat` (or `Composer`) `onStartCall` to show the round phone button next to Send; leave `onStartCall` out while a call is running. You can also set `callLabel` and `callDisabled`.
- `CallCard` is the record of a finished call, with a Show transcript toggle.
- `CallProblemScreen` covers a blocked microphone, a lost connection and an ended call. When the browser blocks sound, the status line becomes a "Tap to hear" button.
- Camera and screen sharing: your session decides how to send them. `useLocalMedia()` from the core gives a preview on the person's own device through `getUserMedia` and `getDisplayMedia`, and nothing leaves the browser. It stops every track when the call is held, ends or fails, when the person turns the camera or sharing off, when the browser's own "stop sharing" button is used, and when the component goes away.
- Call colours come from the dark-mode tokens. Override them with the `colors` prop (`useCallColors` reads them).

```tsx
const session = useMemo(() => createFakeVoiceSession({ capabilities: { camera: true, screenShare: true } }), []);
<CallStage session={session} user={{ name: "Kio" }} agent={{ name: "Niru" }} onMinimise={minimise} />
// later, in the chat:
<CallStrip session={session} onExpand={expand} />
<CallCard summary={summariseCall(session.getSnapshot())} agentName="Niru" />
```

## History sidebar

`ChatHistorySidebar` has four options you switch on yourself.

- `searchable` adds a search box that filters by title and preview, ignoring upper and lower case.
- `grouped` splits the list into Today, Yesterday, Previous 7 days, Previous 30 days and Older, using each item's `at` time. Items without `at` go under Older.
- `onRename(id, title)` and `onDelete(id)` add a menu on each row. Delete asks for confirmation first.
- `labels` changes any of the text, and `now` fixes the clock for tests.

The search and grouping are also in the core, as `filterConversations` and `groupConversationsByAge`.

```tsx
<ChatHistorySidebar items={rows} activeId={id} onSelect={open} onNew={create}
  searchable grouped onRename={rename} onDelete={remove} />
```

## Pin, save and the Saved tab

The kit only draws and reports. Your app keeps what is pinned and saved, and passes it back in.

- Set `pinned: true` on a history item and handle `onPin(id, pinned)` (it adds Pin or Unpin to the row menu). Pinned chats move to a Pinned group above the date groups, in the order you list them.
- Pass `saved` (a list of `SavedItem`) to add two tabs, Chats and Saved. A saved item is `{ id, kind: "conversation" | "message", conversationId, messageId?, title, text?, at }`. The Saved tab lists them newest first. Handle `onOpenSaved(item)` and `onUnsave(item)`. `tab` and `onTabChange` control the tab; leave them out and the sidebar keeps it.
- `ConversationHeader` is a slim bar with the title, a Pin toggle and a Save toggle. Pass it to `FullChat` as `header`.
- Give `ChatTurnActions` an `onSave(message)` and `isSaved(message)` and replies get a bookmark button after Copy.
- To jump to something, pass `highlightMessageId` to `FullChat` or `Conversation` (the chat scrolls to it and tints it for about 2.5 seconds), and `highlightId` to the sidebar to flash a row. With reduced motion on, both show a still outline.

```tsx
<FullChat
  stream={stream}
  agent={agent}
  header={<ConversationHeader title={title} pinned={pinned} onPinChange={setPinned} saved={chatSaved} onSaveChange={setChatSaved} />}
  highlightMessageId={openedMessageId}
  history={{ items, activeId, onSelect, onNew, onPin, saved, onOpenSaved, onUnsave, highlightId }}
/>
```

The core has `splitPinned`, `filterSaved` and `sortSavedNewestFirst` if you build your own list.

## Deleting messages

Give `ChatTurnActions` an `onDelete(message)` function and `TurnActions` shows a Delete button, behind a confirmation, on user and assistant messages. Without it, no Delete button is drawn.

## Composer toggles and the More menu

`toggles` adds on and off chips to the row under the message box. Each is `{ id, label, icon, active, onToggle, disabled?, iconOnly? }` (with `iconOnly` it is a round icon button the size of the plus button: the label is its name and tooltip, the accent tint shows it is on; in More it is still a labelled item) and is announced to screen readers as pressed or not. `moreActions` takes any content, usually menu items, and shows it behind a "More" button.

When the composer itself is narrower than 460 px (a side panel, for example) the row keeps only attach, More, the call button and Send, on one line. Voice input becomes a "Record a voice message" item in More (while it records or transcribes, its stop control shows in the row again), the toggles become checkable items, and a dot marks More while a toggle is on (its name becomes "More, 1 on"). Controls you pass as `trailing` stay in the row unless you also pass `narrowMoreItems`: menu items, or a function `({ closeMenu }) => items`, shown in More instead of `trailing` when narrow. Use the function form for an item that opens a picker and should close the menu afterwards.

```tsx
<Composer value={draft} onChange={setDraft} onSubmit={send}
  toggles={[{ id: "web", label: "Search the web", icon: <PublicIcon />, active: web, onToggle: () => setWeb(!web) }]}
  moreActions={<MenuItem onClick={addPhoto}>Add a photo</MenuItem>} />
```

## Slash commands

Give `Composer` (or `FullChat`) a `commands` list and typing `/` as the first thing in the box opens a list above it, like in ChatGPT, Gemini and Claude. Typing filters it, ArrowUp and ArrowDown move the highlight, Enter or Tab pick, Escape closes it (it stays closed until the text changes), and the mouse works too. The kit ships no commands: your app supplies them, so your people can edit their own. A slash later in the text ("and/or", a URL, a path) never opens the list.

A `SlashCommand` is `{ id, name, description?, keywords?, group?, insert?, disabled? }`. With `insert`, picking replaces the typed `/query` with that text (a prompt template) and puts the caret after it. Without `insert` the command is an action: the `/query` is removed and your `onCommand(command)` does the work. Disabled commands are shown but cannot be picked. `onManageCommands` adds a last row, labelled `manageCommandsLabel` (default "Edit commands"), that calls it and closes the list. Other optional props: `commandsLabel` (default "Commands") and `commandsEmptyText` (default "No matching commands"; with no match, Enter sends the message as usual). The input becomes an ARIA combobox and the list a listbox; focus stays in the box.

```tsx
const commands: SlashCommand[] = [
  { id: "summarize", name: "summarize", description: "A short version", group: "Your commands",
    insert: "Summarize the following in three bullet points:\n\n" },
  { id: "clear", name: "clear", description: "Empty the box", group: "Actions" },
];

<Composer value={draft} onChange={setDraft} onSubmit={send}
  commands={commands}
  onCommand={(command) => { if (command.id === "clear") track("clear"); }}
  onManageCommands={() => setEditorOpen(true)} />
```

The core has `slashQuery(text, caret)`, `matchSlashCommands(commands, query)` and `applySlashCommand(text, range, command)` if you build your own box.

## Add menu, chips, long pastes, mentions and an approval choice

Five opt-in extras for the message box, all passed to `Composer` or straight through `FullChat`. Each appears only when its prop is given; without them the box is exactly as before. The words they add (Add, Search, Loading, No matches, Remove, "{count} characters", Show in text field, the approval heading, Mentions) are in `DEFAULT_COMPOSER_EXTRAS_LABELS`; override any with `extrasLabels={{ add: "Hinzufuegen" }}`.

- **`addMenu`** `{ label?, sections }` replaces the paperclip with a round plus button that opens an "Add" panel above the box (as wide as the box up to 440 px, scrolling past 420 px). When `onAttach` is given and the box is enabled, the first row is the upload action (named by `attachLabel`, opening the same file chooser). A section is `{ id, title?, items, searchable?, searchPlaceholder?, emptyText?, loading? }`; an item is `{ id, label, description?, icon?, onSelect, disabled?, disabledReason?, checked?, keepOpen? }`. A `checked` item is a `menuitemcheckbox` with a check at the right; a disabled item shows its reason in place of its description. A searchable section filters by label and description. Arrows, Home, End and Enter work, typing in a search field does not trigger row shortcuts, Escape closes and returns focus to the plus button. Choosing calls `onSelect` and closes unless `keepOpen`.
- **`chips`** `{ id, label, icon?, onRemove?, removeLabel?, onClick?, tone? }[]` are small chips in the row after the plus button (tone `"default"`, `"accent"` or `"warning"`). On a narrow box they sit on a line above the row.
- **Long pasted text.** With `onPasteLongText(text)`, a plain-text paste into the box that is at or over `longPasteThreshold` (`{ characters?: 2000, lines?: 40 }`) does not enter the text: your app gets it. Files in the same paste still go to `onAttach`; shorter pastes and every paste while disabled are untouched. Hold the text yourself and pass `pastedTexts` (`{ id, text, title? }[]`): each is drawn above the field as a chip with an icon tile, the title (default the first non-empty line, cut with an ellipsis), the size, a "Show in text field" link (`onShowPastedText(id)`) and a remove button (`onRemovePastedText(id)`). The kit never sends or stores the text: you decide what Send does with it. Core helpers: `isLongPaste(text, threshold?)` and `pastedTextTitle(text)`.
- **`mentions`** `ComposerMention[]` (`{ id, label, description?, icon?, group?, keywords? }`) opens a list when the person types `@` at the start of the text or after whitespace (never in an email address or inside a word). Typing filters by label, keywords and description; items are grouped by `group`; ArrowUp, ArrowDown, Home and End move, Enter or Tab pick, Escape closes and keeps the text. Picking replaces the `@query` with `@Label ` and calls `onMention(item)`. Also `mentionsLabel` (default "Mentions"), `mentionsEmptyText` (default "No matches") and `mentionsLoading`. It never opens together with the slash list. Core helpers: `mentionQuery(value, caret)`, `applyMention(value, range, item)`, `matchMentions(items, query)` and `mentionsIn(value, items)`, which returns the items whose `@Label` is still in the text as a whole token, so you can send exactly those.
- **`approvalMode`** `{ value, options, onChange, heading?, learnMore?, disabled?, disabledReason?, buttonLabel?, iconOnly? }` draws a quiet button with the current option's icon and label (with `iconOnly` a round icon button showing only the icon, tooltip the current label, and the label shown anyway for an option without an icon; accessible name "heading: label") that opens a menu headed by `heading` with `learnMore` as a link at its right and the options as `menuitemradio` rows (icon, label, description, a check on the current one; `tone: "warning"` colours a row). On a narrow box the choices move into More.

The row reads: plus (or paperclip), voice at `"start"`, chips, approval, toggles, your `trailing`, then `endLeading` (content for the right end, such as a model picker; it leaves the row with `trailing` when `narrowMoreItems` is given and the box is narrow), call, voice at `"end"` and Send.

```tsx
<Composer value={draft} onChange={setDraft} onSubmit={send}
  onAttach={addFiles}
  addMenu={{ sections: [{ id: "modes", items: [{ id: "plan", label: "Plan mode", description: "Turn plan mode on", checked: plan, keepOpen: true, onSelect: () => setPlan(!plan) }] }] }}
  chips={plan ? [{ id: "plan", label: "Plan mode", tone: "accent", onRemove: () => setPlan(false) }] : []}
  onPasteLongText={(text) => setHeld((all) => [...all, { id: newId(), text }])}
  pastedTexts={held}
  onRemovePastedText={(id) => setHeld((all) => all.filter((item) => item.id !== id))}
  mentions={tools} onMention={(tool) => track(tool.id)}
  approvalMode={{ value: mode, onChange: setMode, options }} />
```

## Tool input and output

`Tool` takes optional `input` and `output`. A string shows as text and anything else as formatted JSON, coloured from the tokens. They sit inside the expanded card, which starts collapsed. If you pass neither, nothing extra is drawn. `state` also accepts the prompt-kit names (`input-streaming`, `input-available`, `output-available`, `output-error`) as other ways to write the existing statuses.

```tsx
<Tool step={step} state="output-available" input={{ query: "pricing" }} output="3 results" />
```

## Images from raw data

`Image` takes `src`, or raw data as `base64` or `uint8Array` together with a `mediaType` such as `image/png`. Raw data is shown through a temporary browser address that is released when the data changes and when the component goes away. A media type that does not start with `image/` is refused, and the fallback text shows instead.

## For AI tools

`llms.txt` is a short index of the kit. `llms-full.txt` lists every export of both entry points with a one-line purpose, the main props and an example. Both ship with the package.

## JSXPreview safety

`JSXPreview` draws markup that an agent wrote. It draws nothing unless you pass `components`, the allowlist of components you permit. It reads the markup with its own small reader, not `react-jsx-parser`.

- Only the components you list and a fixed set of HTML tags are drawn. Any other tag shows as text.
- Only a short list of safe attributes gets through. `on*` handlers and `dangerouslySetInnerHTML` are always dropped, and so are `javascript:` and `data:` links.
- Anything in `{curly braces}` is never run.

Do not turn it on for public pages.

## Where core ends and MUI begins

`src/core` imports nothing from `@mui/*` and nothing from `src/mui`. `src/mui` imports the core. A test (`src/boundaries.test.ts`) fails if that rule is broken. See `CONTRIBUTING.md`.

## Licence

MIT, (c) 2026 HiroLabz. Component names, shapes and behaviour were informed by prompt-kit, MIT, (c) 2025 Julien Thibeaut. See `NOTICE`.
