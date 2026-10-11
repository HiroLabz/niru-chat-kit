import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

// A neutral globe, inlined, so a Source link needs no favicon request.
const GLOBE =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="#888" stroke-width="1.2"><circle cx="8" cy="8" r="6.5"/><path d="M1.5 8h13M8 1.5c2 2 2 11 0 13M8 1.5c-2 2-2 11 0 13"/></svg>'
  );

/**
 * The kit's Source.Trigger asks Google's favicon service for a plain http(s) link. The docs make no
 * network calls, so the build swaps that URL for the globe above. If the kit changes the line, the
 * replace finds nothing and the kit's behaviour (and the privacy note on the Source page) stands.
 */
const localFavicon = (): Plugin => ({
  name: "docs-local-favicon",
  enforce: "pre",
  transform(code, id) {
    if (!id.endsWith("primitives/source.tsx")) return null;
    const swapped = code.replace(/`https:\/\/www\.google\.com\/s2\/favicons[^`]*`/, JSON.stringify(GLOBE));
    return swapped === code ? null : { code: swapped, map: null };
  },
});

// A Content-Security-Policy in the built page proves the docs reach nothing outside their own origin.
// Dev keeps none: Vite's hot reload needs a blob worker.
const CSP =
  "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'";
const csp = (): Plugin => ({
  name: "docs-csp",
  apply: "build",
  transformIndexHtml: (html) => html.replace("<!--csp-->", `<meta http-equiv="Content-Security-Policy" content="${CSP}" />`),
});

const src = (path: string) => fileURLToPath(new URL(`../src/${path}`, import.meta.url));

// DOCS_BASE sets the public path, for a GitHub Pages project site: DOCS_BASE=/niru-chat-kit/
export default defineConfig(() => {
  const raw = process.env.DOCS_BASE ?? "/";
  const base = `${raw.startsWith("/") ? "" : "/"}${raw}${raw.endsWith("/") ? "" : "/"}`;
  return {
    base,
    plugins: [localFavicon(), csp(), react()],
    resolve: {
      alias: [
        { find: /^@hiro\/niru-chat-kit\/mui$/, replacement: src("mui/index.ts") },
        { find: /^@hiro\/niru-chat-kit$/, replacement: src("index.ts") },
      ],
      // The kit source sits outside this folder: make its bare imports (react, @mui/*, shiki ...)
      // resolve to this app's own copies, so there is exactly one React and one MUI.
      dedupe: [
        "react",
        "react-dom",
        "@mui/material",
        "@mui/icons-material",
        "@emotion/react",
        "@emotion/styled",
        "react-markdown",
        "remark-gfm",
        "remark-math",
        "rehype-katex",
        "katex",
        "marked",
        "shiki",
      ],
    },
    server: { fs: { allow: [".."] } },
    build: { outDir: "dist", chunkSizeWarningLimit: 1500 },
  };
});
