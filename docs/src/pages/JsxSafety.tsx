import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { ChatKitProvider, JSXPreview } from "@hiro/niru-chat-kit/mui";
import { Code } from "../components/Code";
import { Stage } from "../components/Example";
import { C, Callout, P, PageHeader, Section } from "../components/Section";
import { SITE_MONO } from "../site/theme";
import { usePageTitle } from "../site/use-page-title";

const ALLOWED = { Badge: Chip };

const SAMPLES: Record<string, string> = {
  "Allowed": `<h3>Order summary</h3>\n<div>Status: <Badge label="Shipped" color="success" size="small" /></div>\n<table><tbody><tr><td>Total</td><td>250 USD</td></tr></tbody></table>`,
  "Event handler": `<p onClick="alert(1)" onMouseOver={() => alert(2)}>Hover over me and click me. Nothing runs.</p>`,
  "javascript: link": `<a href="javascript:alert(1)">Not drawn as a link</a>\n<p><span title="ok">Plain tags still work.</span></p>`,
  "Script and unknown tags": `<script>alert(1)</script>\n<iframe src="https://example.com"></iframe>\n<Evil label="not on the allowlist" />`,
  "Expressions": `<p>{window.location.href} and {document.cookie} and {1 + 1}</p>`,
  "dangerouslySetInnerHTML": `<div dangerouslySetInnerHTML={{ __html: "<img src=x onerror=alert(1)>" }}>text</div>`,
  "Unsafe style": `<p style="background: url(https://example.com/track.png); color: red">Styles that load a url() are dropped.</p>`,
  "Half-written (streaming)": `<ul><li>One</li><li>Two, still being wri`,
};

const RULES = [
  ["Allowlist", "JSXPreview draws nothing unless you pass a components prop, which is your allowlist: the components you permit. Only those and a fixed set of plain HTML tags are drawn. Any other tag appears as text."],
  ["Attributes", "Only a short list of safe attributes gets through. on* event handlers and dangerouslySetInnerHTML are always dropped, and so are javascript: and data: links."],
  ["Expressions", "Anything in {curly braces} is never run. The kit reads the markup with its own small reader, not a full JSX engine, and that reader only understands tags, attributes and text."],
  ["Limits", "The number of elements, how deeply they nest and how long a piece of text can be are all capped, so a hostile reply cannot make the page do unbounded work."],
  ["Streaming", "While a reply is still arriving, set isStreaming. The preview then closes any tag left open and hides a half-written one, so partial markup still displays."],
];

export default function JsxSafety() {
  usePageTitle("JSXPreview safety");
  const [sample, setSample] = useState("Allowed");
  const [text, setText] = useState(SAMPLES.Allowed);
  const [streaming, setStreaming] = useState(false);
  return (
    <>
      <PageHeader title="JSXPreview safety" lead="What JSXPreview will and will not draw from an agent's reply, and how to turn it on safely. It shows HTML-like markup that an agent wrote, in a way that stops a hostile reply from running code." />
      <Section title="What it does with the markup">
        <Box component="dl" sx={{ m: 0 }}>
          {RULES.map(([term, text]) => (
            <Box key={term} sx={{ mb: 1.5 }}>
              <Box component="dt" sx={{ fontWeight: 650 }}>{term}</Box>
              <Box component="dd" sx={{ m: 0, color: "text.secondary", maxWidth: 720 }}>{text}</Box>
            </Box>
          ))}
        </Box>
        <Callout tone="warning" title="Do not turn it on for public pages">
          The checks above are strict, but a component you put on the allowlist is your own code and it runs with whatever props the reply gives it. Allow only
          components that only display things. Where you do not trust the model&apos;s output, leave <C>components</C> off.
        </Callout>
      </Section>
      <Section title="Try to break it">
        <P>
          Pick one of the hostile samples, or write your own markup in the box. Only <C>Badge</C> is on the allowlist here, and it is drawn as a Material UI chip. Look at what is left on the right.
        </P>
        <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1, mb: 2 }}>
          {Object.keys(SAMPLES).map((name) => (
            <Button key={name} size="small" variant={sample === name ? "contained" : "outlined"} onClick={() => { setSample(name); setText(SAMPLES[name]); setStreaming(name.startsWith("Half")); }}>
              {name}
            </Button>
          ))}
        </Stack>
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" } }}>
          <TextField label="Markup the agent wrote" multiline minRows={8} value={text} onChange={(e) => { setText(e.target.value); setSample(""); }} slotProps={{ htmlInput: { style: { fontFamily: SITE_MONO, fontSize: 12 } } }} />
          <Box>
            <Box component="div" role="region" aria-label="Rendered result" aria-live="polite">
              <ChatKitProvider>
                <Stage>
                  <JSXPreview jsx={text} components={ALLOWED} isStreaming={streaming} />
                </Stage>
              </ChatKitProvider>
            </Box>
            <Button size="small" sx={{ mt: 1 }} onClick={() => setStreaming((on) => !on)} aria-pressed={streaming}>
              isStreaming: {String(streaming)}
            </Button>
          </Box>
        </Box>
      </Section>
      <Section title="Turning it on">
        <P>Pass the reply text as <C>jsx</C> and your allowlist as <C>components</C>. Each key is the tag name the markup may use.</P>
        <Code code={`import { JSXPreview } from "@hiro/niru-chat-kit/mui";
import Chip from "@mui/material/Chip";

<JSXPreview jsx={agentReply} components={{ Badge: Chip }} isStreaming={busy} />`} />
      </Section>
    </>
  );
}
