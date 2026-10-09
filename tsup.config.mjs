import { defineConfig } from "tsup";

// Peer dependencies are external by default in tsup. The katex stylesheet is a
// subpath of an optional peer, so it is listed too and stays a dynamic import.
export default defineConfig({
  entry: { index: "src/index.ts", "mui/index": "src/mui/index.ts" },
  format: ["esm"],
  dts: { entry: { index: "src/index.ts", "mui/index": "src/mui/index.ts" } },
  tsconfig: "tsconfig.build.json",
  external: [/^katex(\/|$)/, /^shiki(\/|$)/, /^remark-math$/, /^rehype-katex$/],
  splitting: true,
  clean: true,
  sourcemap: false,
  target: "es2020",
});
