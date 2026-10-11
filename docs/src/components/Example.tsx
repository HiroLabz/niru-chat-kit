import { useId, useState, type ReactNode } from "react";
import Box from "@mui/material/Box";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import { ChatKitProvider, useChatKitStyles } from "@hiro/niru-chat-kit/mui";
import { Code } from "./Code";
import { slugify } from "./Section";

export type ExampleDef = {
  title: string;
  description?: ReactNode;
  node: ReactNode;
  /** The source shown on the Code tab; taken from the same file as the live example. */
  code: string;
  /** Fixed stage height in px, for examples that fill their parent (a chat). */
  height?: number;
  /** Stage width cap in px. */
  maxWidth?: number;
};

/**
 * Cuts the snippet for one example out of a source file: the text between
 * `// #region name` and `// #endregion`, dedented. The live example and its code are the
 * same text, so they cannot drift apart.
 */
export function regionOf(raw: string, name: string): string {
  const lines = raw.split("\n");
  const from = lines.findIndex((line) => line.trim() === `// #region ${name}`);
  if (from < 0) throw new Error(`Missing region "${name}"`);
  const body: string[] = [];
  for (const line of lines.slice(from + 1)) {
    if (line.trim() === "// #endregion") break;
    body.push(line);
  }
  const indent = Math.min(...body.filter((line) => line.trim()).map((line) => line.match(/^ */)?.[0].length ?? 0));
  return body.map((line) => line.slice(indent)).join("\n").trim();
}

export function example(raw: string, region: string, node: ReactNode, meta: Omit<ExampleDef, "node" | "code">): ExampleDef {
  return { ...meta, node, code: regionOf(raw, region) };
}

/** The kit-coloured surface an example is drawn on, so the kit tokens (not the page behind) decide how it looks. */
export function Stage({ children, height, maxWidth }: { children: ReactNode; height?: number; maxWidth?: number }) {
  const { scheme } = useChatKitStyles();
  return (
    <Box
      sx={[
        { p: height ? 0 : 2.5, maxWidth, height, display: height ? "flex" : "block", flexDirection: "column", overflow: height ? "hidden" : "visible", borderRadius: "10px", border: 1 },
        scheme((c, all) => ({ bgcolor: c.surface, color: c.text, borderColor: c.border, fontFamily: all.fontFamily })),
      ]}
    >
      {children}
    </Box>
  );
}

/** A titled live example with Preview and Code tabs. */
export function Example({ def }: { def: ExampleDef }) {
  const [tab, setTab] = useState<"preview" | "code">("preview");
  const uid = useId();
  const id = `${slugify(def.title)}-${uid.replace(/:/g, "")}`;
  return (
    <Box component="section" aria-labelledby={`${id}-title`} sx={{ mt: 3 }}>
      <Typography id={`${id}-title`} variant="h3" component="h3" gutterBottom>
        {def.title}
      </Typography>
      {def.description ? (
        <Typography color="text.secondary" sx={{ mb: 1.5, maxWidth: 720 }}>
          {def.description}
        </Typography>
      ) : null}
      <Tabs value={tab} onChange={(_event, next) => setTab(next)} aria-label={`${def.title} view`} sx={{ minHeight: 36, "& .MuiTab-root": { minHeight: 36, py: 0 } }}>
        <Tab value="preview" label="Preview" id={`${id}-t-preview`} aria-controls={`${id}-p-preview`} />
        <Tab value="code" label="Code" id={`${id}-t-code`} aria-controls={`${id}-p-code`} />
      </Tabs>
      <Box role="tabpanel" id={`${id}-p-${tab}`} aria-labelledby={`${id}-t-${tab}`} sx={{ mt: 1 }}>
        {tab === "preview" ? (
          <ChatKitProvider>
            <Stage height={def.height} maxWidth={def.maxWidth}>
              {def.node}
            </Stage>
          </ChatKitProvider>
        ) : (
          <Code code={def.code} />
        )}
      </Box>
    </Box>
  );
}
