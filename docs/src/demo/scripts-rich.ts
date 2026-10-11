import type { Citation } from "@hiro/niru-chat-kit";
import { CODE_ANSWER, MARKDOWN_ANSWER, MATH_ANSWER, SOURCES_ANSWER, TOOLS_ANSWER, TRIP_ANSWER } from "./answers";
import { finish, followUps, reasoning, say, thought, toolEnd, toolStart, type Scenario } from "./frames";

export const SOURCE_CITATIONS: Citation[] = [
  { kind: "web", label: "prompt-kit", url: "https://www.prompt-kit.com", title: "prompt-kit: building blocks for AI chat" },
  { kind: "web", label: "Material UI", url: "https://mui.com/material-ui/", title: "Material UI: React components" },
  { kind: "web", label: "Shiki", url: "https://shiki.style", title: "Shiki: syntax highlighting" },
  { kind: "document", label: "Kit README.md" },
];

const ALT = "Here is another take. ";

/** Regenerating gives the same content with a short lead-in, so the version arrows have two different replies to switch between. */
const variantOf = (text: string, variant: number) => (variant > 0 ? ALT + text : text);

export const markdown: Scenario = {
  id: "markdown",
  starter: "Show me markdown and a table",
  keywords: ["markdown", "table", "format"],
  shows: "Formatted text arriving as it is written: headings, lists, quotes and a table",
  steps: ({ variant }) => {
    const text = variantOf(MARKDOWN_ANSWER, variant);
    return [...say(text), followUps("Write code in a few languages", "Explain the quadratic formula"), finish(text)];
  },
};

export const code: Scenario = {
  id: "code",
  starter: "Write code in a few languages",
  keywords: ["code", "typescript", "python", "highlight", "sql"],
  shows: "Code coloured by language, with a copy button",
  steps: ({ variant }) => {
    const text = variantOf(CODE_ANSWER, variant);
    return [...say(text), followUps("Show me markdown and a table"), finish(text)];
  },
};

export const math: Scenario = {
  id: "math",
  starter: "Explain the quadratic formula",
  keywords: ["math", "maths", "formula", "equation", "quadratic"],
  shows: "Maths inside a sentence and on its own line (drawn with KaTeX, a maths layout library)",
  steps: ({ variant }) => {
    const text = variantOf(MATH_ANSWER, variant);
    return [...say(text), followUps("Write code in a few languages"), finish(text)];
  },
};

export const trip: Scenario = {
  id: "reasoning",
  starter: "Think through a weekend trip",
  keywords: ["think", "reason", "plan", "trip", "steps"],
  shows: "The assistant's thinking, its steps and a tool call, shown in one timeline",
  steps: ({ variant }) => {
    const text = variantOf(TRIP_ANSWER, variant);
    return [
      ...reasoning("r1", "A weekend trip needs one fixed point per day. ", "I will check the ferry times first, ", "then fit the rest around them."),
      thought("t1", "Weighed what fits in two days", 2100),
      toolStart("tool-ferry", "web_search", "Searching for ferry times"),
      { wait: 1300 },
      toolEnd("tool-ferry", "web_search", "Searched for ferry times", {
        durationMs: 1300,
        summary: "Found 6 sailings",
        details: { inputs: { query: "weekend ferry times" }, output: "Early ferry 8:10, return 16:00" },
      }),
      thought("t2", "Compared the two days", 1700),
      ...say(text),
      followUps("Run some tools for me", "Answer with sources"),
      finish(text),
    ];
  },
};

export const tools: Scenario = {
  id: "tools",
  starter: "Run some tools for me",
  keywords: ["tool", "run", "query", "report"],
  shows: "Tool calls that are running, done or failed, one with its raw input and output, and a file the assistant made",
  steps: ({ variant }) => {
    const text = variantOf(TOOLS_ANSWER, variant);
    return [
      toolStart("tool-docs", "search_docs", "Searching the docs for the token list"),
      toolStart("tool-orders", "query_database", "Querying the orders table"),
      { wait: 1600 },
      toolEnd("tool-docs", "search_docs", "Searched the docs for the token list", {
        durationMs: 1500,
        summary: "Found 4 pages",
        details: { inputs: { query: "token list" }, output: "4 results, best match: Theming" },
      }),
      { wait: 600 },
      toolEnd("tool-orders", "query_database", "Queried the orders table", {
        durationMs: 2200,
        summary: "128 rows this month",
        details: { inputsText: "SELECT * FROM orders WHERE month = current", output: "128 rows" },
      }),
      toolStart("tool-mail", "send_email", "Sending the summary to the team"),
      { wait: 900 },
      toolEnd("tool-mail", "send_email", "Could not send the summary", {
        status: "error",
        durationMs: 900,
        summary: "No mail server in this demo",
      }),
      toolStart("tool-file", "create_file", "Making orders-summary.csv"),
      { wait: 700 },
      toolEnd("tool-file", "create_file", "Made orders-summary.csv", {
        durationMs: 700,
        file: { filename: "orders-summary.csv", format: "csv", size_bytes: 2150 },
      }),
      ...say(text),
      followUps("Answer with sources"),
      finish(text),
    ];
  },
};

export const sources: Scenario = {
  id: "sources",
  starter: "Answer with sources",
  keywords: ["source", "cite", "citation", "research"],
  shows: "A row of sources; hover over one for details",
  steps: ({ variant }) => {
    const text = variantOf(SOURCES_ANSWER, variant);
    return [
      toolStart("tool-research", "web_search", "Searching the web for the kit layout"),
      { wait: 1000 },
      toolEnd("tool-research", "web_search", "Searched the web for the kit layout", { summary: "Found 3 pages" }),
      ...say(text),
      followUps("Show me markdown and a table", "Think through a weekend trip"),
      finish(text, { citations: SOURCE_CITATIONS }),
    ];
  },
};

/** An 8x8 gradient PNG, as base64: the demo draws it with the kit's Image from raw bytes. */
export const GRADIENT_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAbElEQVR42g3JQQEAMAgDMZxUClIqpVKQwvdcYGXLN1WFii5cpJhiiyuqhEQLi4gRK04/GjXduEkzzTbXP4xMG5uYMWvOP4JCB4eECRsuPwYNPXjIMMMONz8WLb14yTLLLrc/Dh19+Mgxxx53PJP8aZHb6FJwAAAAAElFTkSuQmCC";

export const image: Scenario = {
  id: "image",
  starter: "Draw me a small image",
  keywords: ["draw", "picture", "gradient", "base64", "show me an image"],
  shows: "An image drawn from raw data (base64) instead of a file or link",
  steps: ({ variant }) => {
    const text = variantOf("Here is an 8 by 8 gradient. The image data arrives as text (base64) and the kit's Image draws it, so no file or link is needed.", variant);
    return [
      toolStart("tool-draw", "generate_image", "Drawing a gradient"),
      { wait: 900 },
      toolEnd("tool-draw", "generate_image", "Drew a gradient", {
        durationMs: 900,
        summary: "8 by 8 PNG",
        details: { inputs: { width: 8, height: 8, style: "gradient" }, output: GRADIENT_PNG_BASE64 },
      }),
      ...say(text),
      followUps("Run some tools for me"),
      finish(text),
    ];
  },
};
