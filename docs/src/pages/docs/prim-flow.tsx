import { useEffect, useState } from "react";
import Stack from "@mui/material/Stack";
import SearchIcon from "@mui/icons-material/Search";
import type { WorkingStep } from "@hiro/niru-chat-kit";
import { ChainOfThought, Reasoning, Source, Steps, Tool } from "@hiro/niru-chat-kit/mui";
import { example } from "../../components/Example";
import { C } from "../../components/Section";
import type { ComponentDoc } from "./types";
import raw from "./prim-flow.tsx?raw";

// #region reasoning
function ReasoningExample() {
  const [streaming, setStreaming] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setStreaming(false), 3500);
    return () => clearTimeout(timer);
  }, []);
  return (
    <Reasoning isStreaming={streaming}>
      <Reasoning.Trigger>{streaming ? "Thinking..." : "Show reasoning"}</Reasoning.Trigger>
      <Reasoning.Content>The question is about structure, so I will read the docs first, then compare the two parts.</Reasoning.Content>
    </Reasoning>
  );
}
// #endregion

// #region steps
function StepsExample() {
  return (
    <Steps defaultOpen>
      <Steps.Trigger>Three steps</Steps.Trigger>
      <Steps.Content>
        <Steps.Item>Read the question</Steps.Item>
        <Steps.Bar />
        <Steps.Item>Search the docs</Steps.Item>
        <Steps.Bar />
        <Steps.Item>Write the answer</Steps.Item>
      </Steps.Content>
    </Steps>
  );
}
// #endregion

// #region chain-of-thought
function ChainOfThoughtExample() {
  return (
    <ChainOfThought defaultOpenIds={["plan"]}>
      <ChainOfThought.Step id="plan">
        <ChainOfThought.Trigger leftIcon={<SearchIcon fontSize="small" />}>Plan the search</ChainOfThought.Trigger>
        <ChainOfThought.Content>
          <ChainOfThought.Item>Find the layout in the README</ChainOfThought.Item>
          <ChainOfThought.Item>Check the list of tokens</ChainOfThought.Item>
        </ChainOfThought.Content>
      </ChainOfThought.Step>
      <ChainOfThought.Step id="answer" isLast>
        <ChainOfThought.Trigger>Write the answer</ChainOfThought.Trigger>
        <ChainOfThought.Content>
          <ChainOfThought.Item>Two parts, one set of tokens</ChainOfThought.Item>
        </ChainOfThought.Content>
      </ChainOfThought.Step>
    </ChainOfThought>
  );
}
// #endregion

// #region tool-states
const step = (id: string, status: WorkingStep["status"], title: string, extra: Partial<WorkingStep> = {}): WorkingStep => ({
  id,
  name: "web_search",
  title,
  status,
  parentId: null,
  ...extra,
});

function ToolStates() {
  return (
    <Stack spacing={1.5}>
      <Tool step={step("1", "running", "Searching the docs for the token list")} />
      <Tool step={step("2", "success", "Searched the docs for the token list", { durationMs: 1400, summary: "Found 4 pages" })} />
      <Tool step={step("3", "error", "Could not reach the search service", { summary: "Timed out after 10s" })} />
      <Tool step={step("4", "interrupted", "Waiting for approval")} />
    </Stack>
  );
}
// #endregion

// #region tool-io
function ToolWithInputAndOutput() {
  return (
    <Tool
      defaultOpen
      step={{ id: "5", name: "web_search", title: "Searched the docs", status: "success", parentId: null, durationMs: 900 }}
      input={{ query: "token list", limit: 5 }}
      output={{ results: [{ title: "Theming", score: 0.92 }, { title: "Core", score: 0.61 }] }}
    />
  );
}
// #endregion

// #region tool-prompt-kit-state
const base = { name: "web_search", parentId: null } as const;

function ToolPromptKitStates() {
  return (
    <Stack spacing={1.5}>
      <Tool step={{ ...base, id: "6", title: "Drafting the call", status: "running" }} state="input-streaming" input="{ query: " />
      <Tool step={{ ...base, id: "7", title: "Ready to run", status: "running" }} state="input-available" input={{ query: "token list" }} />
      <Tool step={{ ...base, id: "8", title: "Finished", status: "success" }} state="output-available" input={{ query: "token list" }} output="4 results" />
      <Tool step={{ ...base, id: "9", title: "Failed", status: "error" }} state="output-error" input={{ query: "token list" }} output="Timed out" />
    </Stack>
  );
}
// #endregion

// #region source
function SourceExample() {
  return (
    <Source href="https://www.prompt-kit.com">
      <Source.Trigger label="prompt-kit" showFavicon={false} />
      <Source.Content title="prompt-kit" description="Building blocks for AI chat interfaces. Hover over the link, or tab to it, to see this card." />
    </Source>
  );
}
// #endregion

const IMPORT = (names: string) => `import { ${names} } from "@hiro/niru-chat-kit/mui";`;

export const PRIM_FLOW: Record<string, ComponentDoc> = {
  reasoning: {
    summary: "A collapsible section for the model's thinking. It is open while the reply streams in and closes by itself when the reply ends. Use it to keep long reasoning out of the way.",
    imports: IMPORT("Reasoning"),
    api: ["Reasoning", ["ReasoningTrigger", "Reasoning.Trigger"], ["ReasoningContent", "Reasoning.Content"]],
    examples: [example(raw, "reasoning", <ReasoningExample />, { title: "Closes when the reply ends", description: "It starts open, as if a reply were arriving, and closes after three seconds." })],
    notes: <>If someone opens or closes the section during a reply, it stays as they left it for that reply. The next reply opens it again.</>,
  },
  steps: {
    summary: "A collapsible vertical list of steps with a line between them. Use it for a short list of things the agent did.",
    imports: IMPORT("Steps"),
    api: ["Steps", ["StepsTrigger", "Steps.Trigger"], ["StepsContent", "Steps.Content"], ["StepsItem", "Steps.Item"], ["StepsBar", "Steps.Bar"]],
    examples: [example(raw, "steps", <StepsExample />, { title: "Three steps" })],
    notes: <>Put a <C>Steps.Bar</C> between two items, never after the last one.</>,
  },
  "chain-of-thought": {
    summary: "A list of steps joined by a vertical line, where each step opens and closes on its own. Use it when each step has details worth reading.",
    imports: IMPORT("ChainOfThought"),
    api: ["ChainOfThought", ["ChainOfThoughtStep", "ChainOfThought.Step"], ["ChainOfThoughtTrigger", "ChainOfThought.Trigger"], ["ChainOfThoughtContent", "ChainOfThought.Content"], ["ChainOfThoughtItem", "ChainOfThought.Item"]],
    examples: [example(raw, "chain-of-thought", <ChainOfThoughtExample />, { title: "Two steps" })],
    notes: <>Set <C>isLast</C> on the last step so no line is drawn below it.</>,
  },
  tool: {
    summary: "A card for one tool call the agent made, such as a web search. It shows the tool's name, a status chip, how long it took and a short summary. Open it to see the details. It is also exported as ToolCard.",
    imports: `${IMPORT("Tool")}\nimport type { WorkingStep } from "@hiro/niru-chat-kit";`,
    api: ["Tool"],
    examples: [
      example(raw, "tool-states", <ToolStates />, { title: "Running, done, failed and paused", description: "The chip follows step.status." }),
      example(raw, "tool-io", <ToolWithInputAndOutput />, { title: "Showing input and output", description: "Pass input and output to show them in the opened card. Text shows as text and anything else as formatted JSON. Leave them out and nothing extra shows." }),
      example(raw, "tool-prompt-kit-state", <ToolPromptKitStates />, { title: "The four prompt-kit states", description: <>If you already use prompt-kit, pass its state in <C>state</C>. It decides the chip instead of <C>step.status</C>.</> }),
    ],
    notes: <>Hiro&apos;s own chats do not show input and output, because the stream does not carry them. Show them only if your backend sends them and the person looking is allowed to see them.</>,
  },
  source: {
    summary: "A link to a source, with a card that appears when someone hovers over the link or tabs to it. The link stays clickable while the card is open.",
    imports: IMPORT("Source"),
    api: ["Source", ["SourceTrigger", "Source.Trigger"], ["SourceContent", "Source.Content"]],
    examples: [example(raw, "source", <SourceExample />, { title: "Hover over the link" })],
    notes: (
      <>
        For a normal http or https address, the link shows the site&apos;s small icon, which the kit fetches from Google&apos;s favicon service. Pass <C>showFavicon={"{false}"}</C> to
        skip that request, as this example does. This docs site swaps in a local icon, so it makes no request at all. Other kinds of address never get an icon.
      </>
    ),
  },
};
