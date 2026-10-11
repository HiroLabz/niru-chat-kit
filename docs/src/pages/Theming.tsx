import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import Slider from "@mui/material/Slider";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { ThemeProvider } from "@mui/material/styles";
import type { ChatKitColorTokens, ChatKitTokenOverrides } from "@hiro/niru-chat-kit";
import { ChatKitProvider, Composer, Conversation, createChatKitTokens } from "@hiro/niru-chat-kit/mui";
import { Code } from "../components/Code";
import { Stage } from "../components/Example";
import { PropsTables } from "../components/PropsTable";
import { C, P, PageHeader, Section } from "../components/Section";
import { SETTLED_TURN, USER_TURN } from "../fixtures/messages";
import { siteTheme, type Mode } from "../site/theme";
import { usePageTitle } from "../site/use-page-title";

type ColorName = keyof ChatKitColorTokens;
const COLORS: ColorName[] = ["accent", "accentContrast", "userBubble", "userBubbleText", "surface", "text", "assistantSurface", "border"];
const FONTS: Record<string, string> = {
  "System sans": '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  Serif: 'Georgia, "Times New Roman", serif',
  Rounded: 'ui-rounded, "Hiragino Maru Gothic ProN", Quicksand, system-ui, sans-serif',
  Mono: 'ui-monospace, SFMono-Regular, Menlo, monospace',
};
const CODE_THEMES = ["one-light", "github-light", "min-light", "solarized-light"];
const CODE_THEMES_DARK = ["one-dark-pro", "github-dark", "nord", "dracula"];

type Edits = { light: Partial<ChatKitColorTokens>; dark: Partial<ChatKitColorTokens>; shared: Partial<ChatKitTokenOverrides> };
const EMPTY: Edits = { light: {}, dark: {}, shared: {} };

const PRESETS: Record<string, Edits> = {
  Default: EMPTY,
  Forest: {
    light: { accent: "#0e7c66", accentContrast: "#ffffff", userBubble: "#d8f0e8", surface: "#fbfaf6" },
    dark: { accent: "#4fd1b0", accentContrast: "#04251d", userBubble: "#1d3a32", surface: "#14201c" },
    shared: { radius: 16, bubbleRadius: 22, fontFamily: FONTS.Serif },
  },
  Sunset: {
    light: { accent: "#c2410c", accentContrast: "#ffffff", userBubble: "#fde4d3", surface: "#fffaf5" },
    dark: { accent: "#fb923c", accentContrast: "#2b1100", userBubble: "#4a2a17", surface: "#1d1612" },
    shared: { radius: 4, bubbleRadius: 6, fontFamily: FONTS.Mono },
  },
};

/** The colour picker needs #rrggbb; let the browser normalise any CSS colour (alpha is dropped for the swatch). */
function swatchHex(value: string): string {
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return "#000000";
  ctx.fillStyle = "#000000";
  ctx.fillStyle = value;
  const out = ctx.fillStyle;
  if (/^#[0-9a-f]{6}$/i.test(out)) return out;
  const m = out.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  return m ? "#" + [m[1], m[2], m[3]].map((n) => Number(n).toString(16).padStart(2, "0")).join("") : "#000000";
}

/** Only what changed, shaped as the `tokens` prop wants it. */
function toOverrides(edits: Edits): ChatKitTokenOverrides {
  const out: ChatKitTokenOverrides = { ...edits.shared };
  if (Object.keys(edits.light).length) out.light = edits.light;
  if (Object.keys(edits.dark).length) out.dark = edits.dark;
  return out;
}

function Preview({ mode, tokens }: { mode: Mode; tokens: ChatKitTokenOverrides }) {
  return (
    <ThemeProvider theme={siteTheme(mode)}>
      <ChatKitProvider tokens={tokens}>
        <Stage>
          <Box sx={{ bgcolor: "transparent" }}>
            <Conversation messages={[USER_TURN, SETTLED_TURN]} />
            <Composer value="" onChange={() => undefined} onSubmit={() => undefined} />
          </Box>
        </Stage>
      </ChatKitProvider>
    </ThemeProvider>
  );
}

export default function Theming() {
  usePageTitle("Theming");
  const [mode, setMode] = useState<Mode>("light");
  const [edits, setEdits] = useState<Edits>(EMPTY);
  const defaults = useMemo(() => createChatKitTokens(siteTheme(mode)), [mode]);
  const tokens = useMemo(() => toOverrides(edits), [edits]);
  const current = (name: ColorName) => edits[mode][name] ?? (mode === "light" ? defaults.light[name] : defaults.dark[name]);
  const setColor = (name: ColorName, value: string) => setEdits((e) => ({ ...e, [mode]: { ...e[mode], [name]: value } }));
  const setShared = (patch: Partial<ChatKitTokenOverrides>) => setEdits((e) => ({ ...e, shared: { ...e.shared, ...patch } }));
  const code = `<ChatKitProvider\n  tokens={${JSON.stringify(tokens, null, 2).replace(/\n/g, "\n  ")}}\n>\n  {children}\n</ChatKitProvider>`;

  return (
    <>
      <PageHeader
        title="Theming"
        lead="Want the chat in your brand colours? This page shows how to change its colours, corner roundness and fonts, and gives you the code to copy."
      />
      <Section title="What a token is">
        <P>
          A token is a named colour or size that the chat reads whenever it draws something. <C>accent</C> is one: it is the colour of the Send button and of
          links. Every part of the kit that needs the accent colour asks for the token <C>accent</C> instead of using a fixed colour. So if you change that one
          token, everything that used it changes with it.
        </P>
        <Code code={`<ChatKitProvider tokens={{ accent: "#0e7c66" }}>
  {children}
</ChatKitProvider>`} />
        <P>
          That is a complete theme change: the accent is now green everywhere. Any token you do not set keeps its default, which the kit works out from your
          Material UI theme&apos;s light and dark palettes. Each token is also published as a CSS variable named <C>--nck-</C> followed by its name (for example{" "}
          <C>--nck-accent</C>), so your own CSS can use it too.
        </P>
        <P>
          A colour set at the top level applies to both light and dark mode. To change it for one mode only, put it under <C>light</C> or <C>dark</C>, as the
          editor below does.
        </P>
      </Section>
      <Section title="Token editor">
        <P>
          Try it here. Choose Light or Dark, pick a preset or edit a colour (type a value or use the colour square), and drag the sliders for corner roundness.
          The chat under the controls changes as you go. When you like it, press Copy under &quot;Your tokens&quot; and paste the result into your app.
        </P>
        <Stack direction="row" spacing={1.5} sx={{ mb: 2, flexWrap: "wrap", rowGap: 1, alignItems: "center" }}>
          <ToggleButtonGroup size="small" exclusive value={mode} onChange={(_e, next: Mode | null) => next && setMode(next)} aria-label="Colour scheme to edit and preview">
            <ToggleButton value="light">Light</ToggleButton>
            <ToggleButton value="dark">Dark</ToggleButton>
          </ToggleButtonGroup>
          {Object.keys(PRESETS).map((name) => (
            <Button key={name} size="small" variant="outlined" onClick={() => setEdits(PRESETS[name])}>
              {name}
            </Button>
          ))}
        </Stack>
        <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", lg: "minmax(260px, 320px) 1fr" }, alignItems: "start" }}>
          <Stack component="form" spacing={1.5} aria-label="Token controls" onSubmit={(e) => e.preventDefault()}>
            <Typography variant="subtitle2">Colours ({mode})</Typography>
            {COLORS.map((name) => {
              const value = current(name);
              return (
                <Stack key={name} direction="row" spacing={1} sx={{ alignItems: "center" }}>
                  <TextField size="small" label={name} value={value} onChange={(e) => setColor(name, e.target.value)} fullWidth />
                  <Box component="input" type="color" aria-label={`${name} colour picker`} value={swatchHex(value)} onChange={(e) => setColor(name, e.target.value)} sx={{ width: 40, height: 40, p: 0, border: 0, bgcolor: "transparent", cursor: "pointer" }} />
                </Stack>
              );
            })}
            <Typography variant="subtitle2" sx={{ pt: 1 }}>Shape and type</Typography>
            <Box>
              <Typography id="radius-label" variant="body2">Radius: {edits.shared.radius ?? defaults.radius}px</Typography>
              <Slider aria-labelledby="radius-label" min={0} max={28} value={edits.shared.radius ?? defaults.radius} onChange={(_e, v) => setShared({ radius: v as number })} />
            </Box>
            <Box>
              <Typography id="bubble-label" variant="body2">Bubble radius: {edits.shared.bubbleRadius ?? defaults.bubbleRadius}px</Typography>
              <Slider aria-labelledby="bubble-label" min={0} max={32} value={edits.shared.bubbleRadius ?? defaults.bubbleRadius} onChange={(_e, v) => setShared({ bubbleRadius: v as number })} />
            </Box>
            <TextField select size="small" label="fontFamily" value={edits.shared.fontFamily ?? ""} onChange={(e) => setShared({ fontFamily: e.target.value || undefined })}>
              <MenuItem value="">Theme default</MenuItem>
              {Object.entries(FONTS).map(([label, value]) => (
                <MenuItem key={label} value={value}>{label}</MenuItem>
              ))}
            </TextField>
            <TextField select size="small" label={mode === "light" ? "codeThemeLight" : "codeThemeDark"} value={(mode === "light" ? edits.shared.codeThemeLight : edits.shared.codeThemeDark) ?? ""} onChange={(e) => setShared(mode === "light" ? { codeThemeLight: e.target.value || undefined } : { codeThemeDark: e.target.value || undefined })}>
              <MenuItem value="">Default</MenuItem>
              {(mode === "light" ? CODE_THEMES : CODE_THEMES_DARK).map((name) => (
                <MenuItem key={name} value={name}>{name}</MenuItem>
              ))}
            </TextField>
            <Button onClick={() => setEdits(EMPTY)}>Reset</Button>
          </Stack>
          <Box sx={{ minWidth: 0 }}>
            <Box role="region" aria-label="Preview" aria-live="polite">
              <Preview mode={mode} tokens={tokens} />
            </Box>
            <Typography variant="subtitle2" sx={{ mt: 2 }}>Your tokens</Typography>
            <Code code={code} />
            <Button size="small" variant="outlined" onClick={() => void navigator.clipboard.writeText(code)}>
              Copy
            </Button>
          </Box>
        </Box>
      </Section>
      <Section title="All tokens">
        <Box component="table" sx={{ borderCollapse: "collapse", width: "100%", "& th, & td": { textAlign: "left", p: 1, borderBottom: 1, borderColor: "divider", verticalAlign: "top" } }}>
          <thead>
            <tr><th scope="col">Token</th><th scope="col">What it controls</th></tr>
          </thead>
          <tbody>
            {[
              ["accent, accentContrast", "The main colour (buttons, links) and the text drawn on top of it"],
              ["text, mutedText, surface, border, muted", "Normal text, quieter text, the chat background, thin lines, and the background when you hover over something"],
              ["assistantSurface, assistantText", "The assistant's message bubble and avatar"],
              ["userBubble, userBubbleText", "The bubble around your own messages"],
              ["codeSurface, codeInlineSurface", "The background of code blocks and of short code inside a sentence"],
              ["info, success, warning, error", "Colours for information, success, warning and error messages"],
              ["radius, bubbleRadius", "How round corners are, in pixels. radius is for most things, bubbleRadius for message bubbles"],
              ["fontFamily, monoFontFamily", "The font for text and the font for code"],
              ["codeThemeLight, codeThemeDark", "Names of the colour themes used to colour code (Shiki is the library that does the colouring)"],
            ].map(([name, meaning]) => (
              <tr key={name}><td><C>{name}</C></td><td>{meaning}</td></tr>
            ))}
          </tbody>
        </Box>
        <P>
          To read the final values in your own component, call <C>useChatKitTokens()</C>. To restyle every chat in your app once, call{" "}
          <C>setChatKitDefaultOverrides(...)</C> when the app starts.
        </P>
      </Section>
      <Section title="API">
        <PropsTables api={["ChatKitProvider"]} />
      </Section>
    </>
  );
}
