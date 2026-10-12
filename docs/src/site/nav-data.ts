export type NavLink = { path: string; title: string };
export type NavGroup = { title: string; links: NavLink[] };

export const PRIMITIVES = [
  ["message", "Message"],
  ["chat-container", "ChatContainer"],
  ["markdown", "Markdown"],
  ["code-block", "CodeBlock"],
  ["loader", "Loader"],
  ["text-shimmer", "TextShimmer"],
  ["response-stream", "ResponseStream"],
  ["thinking-bar", "ThinkingBar"],
  ["prompt-input", "PromptInput"],
  ["file-upload", "FileUpload"],
  ["prompt-suggestion", "PromptSuggestion"],
  ["reasoning", "Reasoning"],
  ["steps", "Steps"],
  ["chain-of-thought", "ChainOfThought"],
  ["tool", "Tool"],
  ["source", "Source"],
  ["scroll-button", "ScrollButton"],
  ["system-message", "SystemMessage"],
  ["feedback-bar", "FeedbackBar"],
  ["image", "Image"],
  ["jsx-preview", "JSXPreview"],
  ["agent-avatar", "AgentAvatar"],
] as const;

export const BLOCKS = [
  ["conversation", "Conversation"],
  ["full-chat", "FullChat"],
  ["composer", "Composer"],
  ["composer-pills", "ComposerPills"],
  ["chat-empty-state", "ChatEmptyState"],
  ["conversation-header", "ConversationHeader"],
  ["chat-history-sidebar", "ChatHistorySidebar"],
  ["turn-timeline", "TurnTimeline"],
  ["turn-actions", "TurnActions"],
  ["source-list", "SourceList"],
  ["file-chip", "FileChip"],
  ["interrupts", "Interrupts"],
  ["call-mode", "Call mode"],
] as const;

export type PrimitiveSlug = (typeof PRIMITIVES)[number][0];
export type BlockSlug = (typeof BLOCKS)[number][0];

export const NAV: NavGroup[] = [
  {
    title: "Getting started",
    links: [
      { path: "/", title: "Introduction" },
      { path: "/installation", title: "Installation" },
      { path: "/theming", title: "Theming" },
    ],
  },
  {
    title: "Core",
    links: [
      { path: "/core", title: "Overview" },
      { path: "/core/frames", title: "Frames" },
      { path: "/core/transport", title: "Writing a transport" },
    ],
  },
  { title: "Primitives (small parts)", links: PRIMITIVES.map(([slug, title]) => ({ path: `/primitives/${slug}`, title })) },
  { title: "Blocks (ready-made pieces)", links: BLOCKS.map(([slug, title]) => ({ path: `/blocks/${slug}`, title })) },
  { title: "Guides", links: [{ path: "/jsx-safety", title: "JSXPreview safety" }] },
];
