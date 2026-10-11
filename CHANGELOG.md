# Changelog

## Unreleased

- MUI skin: `CallStrip` lines its content up from the left (it was centred by the button inside it) and shows a small round voice-level orb instead of a dot while the call runs; the expand icon sits at the right, before Mute and End.
- MUI skin: the call lives at the bottom of the chat. `Composer` takes optional `onStartCall`, `callLabel` (default "Start a call") and `callDisabled`: a round phone button in the actions row just before Send. `FullChat` forwards them and takes optional `aboveComposer`, a node rendered directly above the composer (or the interrupt card), for example a `CallStrip`. Default unchanged.
- Core and MUI skin: call mode. Core adds the `VoiceSession` contract (states connecting, listening, thinking, speaking, held, ended, failed; join steps; muted; captions; transcript; capabilities for camera and screen share; local and remote video; problems), `useVoiceSession`, a scriptable `createFakeVoiceSession`, `useLocalMedia` / `createLocalMedia` (camera and screen share previews through `getUserMedia` and `getDisplayMedia`, feature-detected, every track stopped on stop, hold, end and unmount), `followLevels`, `createLevels`, `summariseCall`. The MUI skin adds `CallStage` (Header, Status, Captions, Preview, Controls) in a Gemini Live layout, `VoiceLevelPill`, `CallOrb`, `CallControlButton`, `CallStrip`, `CallCard` and the problem screens. Nothing changes unless you use it.
- Core: `retry()` after a failed send no longer adds the question to the transcript a second time; the question already on screen is re-run.
- MUI skin: `FullChat` forwards `voice`, `voiceLang`, `toggles`, `moreActions` and `moreLabel` to its `Composer`. Default unchanged.
- Core and MUI skin: voice input. `useSpeechInput({ lang, onFinal, onInterim })` (browser speech recognition, feature-detected, safe on the server) and `speechErrorMessage`; `Composer` takes an optional `voice` (and `voiceLang`) that adds a mic toggle with a listening indicator and a short message when permission is denied or nothing is heard. The mic is hidden where the browser has no recognition; sending stops it. Default unchanged.
- Core and MUI skin: `ChatHistorySidebar` takes optional `searchable`, `grouped`, `onRename`, `onDelete`, `labels` and `now`: a search box over title and preview, Today / Yesterday / Previous 7 days / Previous 30 days / Older groups by `at`, and a per-row Rename and Delete (delete asks first). Core adds `conversationAgeGroup`, `groupConversationsByAge` and `filterConversations`. Default unchanged.
- Core and MUI skin: `ChatTurnActions` takes an optional `onDelete(message)`; `TurnActions` then shows Delete behind a confirm on user and assistant turns. Nothing shows without it.
- MUI skin: `Composer` takes optional `toggles` (on/off chips with `aria-pressed`) and `moreActions` (shown behind a "More" button), plus `moreLabel`. Default unchanged. The attachment strip moved to its own file.
- MUI skin: `Tool` takes optional `input` and `output` (text as text, anything else as pretty JSON coloured from the tokens, collapsed until the card opens) and `state`, which accepts the prompt-kit states `input-streaming`, `input-available`, `output-available` and `output-error` as aliases of the existing statuses. Nothing new renders without them.
- MUI skin: `Image` takes `base64` or `uint8Array` with a `mediaType` as well as `src`. Object URLs are revoked on change and unmount; a media type that is not `image/*` is refused with the fallback text.
- Package: `llms.txt` and `llms-full.txt` (an index and a reference of every export of both entry points) are published with the package.
- MUI skin: `FullChat` takes an optional `emptyState` node that replaces the greeting before the first message. Default unchanged.
- MUI skin: with `columnMaxWidth`, the composer's column padding no longer loses to the dark-scheme `padding` rule (the composer spanned the full width in dark).
- Core and MUI skin: `ChatTurnActions` takes an optional `renderExtraActions(message)`; its result is drawn in the same row as Copy, Regenerate and the rating, after them, on a settled assistant reply. Default unchanged.
- MUI skin: `FullChat` takes an optional `disabled` that disables the composer and hides the pills. Default unchanged.
- MUI skin: `FullChat` and `Conversation` take an optional `columnMaxWidth` (px) that centres the turns, and for `FullChat` the composer, in a column with a 24 px minimum gutter; the transcript and its scrollbar stay full width. Default unchanged.
- MUI skin: the turn timestamp carries a `data-chat-timestamp` attribute so an app can show it on hover only.
- MUI skin: `Conversation` draws no face on the typing row when `liveAvatar` is `null` (before, `null` fell back to the initial); an absent `liveAvatar` behaves as before.
- MUI skin: `AgentAvatar` and `AVATAR_PRESETS` (24 illustrated preset avatars, ids `hiro-01` to `hiro-24`). Accepts the API avatar shape directly; unknown ids, missing avatars and images without a url fall back to `hiro-01`. Optional `linked` badge.

## 0.1.0

First release as a standalone package.

- Core entry (`@hiro/niru-chat-kit`): SSE parsing, frame-to-turn reducer, steps, follow-ups, branches, approvals and `useChatStream`. No UI library.
- MUI skin (`@hiro/niru-chat-kit/mui`): primitives, blocks, `JSXPreview` and the token provider.
- Built ESM output with type declarations; install straight from GitHub.
