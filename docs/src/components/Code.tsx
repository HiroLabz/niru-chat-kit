import Box from "@mui/material/Box";
import { CodeBlock } from "@hiro/niru-chat-kit/mui";

/** A highlighted snippet, drawn by the kit's own `CodeBlock`. */
export function Code({ code, language = "tsx" }: { code: string; language?: string }) {
  return (
    <Box sx={{ "& > div": { my: 1.5, border: 1, borderColor: "divider" } }}>
      <CodeBlock code={code.replace(/\n+$/, "")} language={language} />
    </Box>
  );
}
