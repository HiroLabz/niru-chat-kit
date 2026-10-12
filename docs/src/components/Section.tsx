import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

export const slugify = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

/** A titled part of a page. The `h2` has an id, which the "On this page" list links to. */
export function Section({ title, children, level = 2 }: { title: string; children: ReactNode; level?: 2 | 3 }) {
  const id = slugify(title);
  return (
    <Box component="section" aria-labelledby={id} sx={{ mt: level === 2 ? 5 : 3 }}>
      <Typography id={id} variant={level === 2 ? "h2" : "h3"} component={level === 2 ? "h2" : "h3"} sx={{ mb: 1.5, scrollMarginTop: 80 }}>
        {title}
      </Typography>
      {children}
    </Box>
  );
}

export function PageHeader({ title, lead }: { title: string; lead?: ReactNode }) {
  return (
    <Box component="header" sx={{ mb: 3 }}>
      <Typography variant="h1" component="h1" gutterBottom>
        {title}
      </Typography>
      {lead ? (
        <Typography variant="h6" component="p" color="text.secondary" sx={{ fontWeight: 400, lineHeight: 1.5 }}>
          {lead}
        </Typography>
      ) : null}
    </Box>
  );
}

/** Inline code in running text. */
export function C({ children }: { children: ReactNode }) {
  return (
    <Box
      component="code"
      sx={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace", fontSize: "0.88em", overflowWrap: "anywhere", bgcolor: "action.hover", px: 0.6, py: 0.15, borderRadius: 0.75 }}
    >
      {children}
    </Box>
  );
}

export function P({ children }: { children: ReactNode }) {
  return (
    <Typography sx={{ mb: 1.5, maxWidth: 720, lineHeight: 1.7 }} component="p">
      {children}
    </Typography>
  );
}

export function Callout({ title, children, tone = "info" }: { title?: string; children: ReactNode; tone?: "info" | "warning" }) {
  return (
    <Box
      role="note"
      sx={{
        my: 2,
        p: 2,
        borderRadius: 1.5,
        border: 1,
        borderColor: tone === "warning" ? "warning.main" : "divider",
        borderLeftWidth: 4,
        borderLeftColor: tone === "warning" ? "warning.main" : "primary.main",
        bgcolor: "action.hover",
      }}
    >
      {title ? (
        <Typography sx={{ fontWeight: 650, mb: 0.5 }} component="p">
          {title}
        </Typography>
      ) : null}
      <Typography component="div" variant="body2" sx={{ lineHeight: 1.65 }}>
        {children}
      </Typography>
    </Box>
  );
}
