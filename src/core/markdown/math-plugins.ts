import { useEffect, useState } from "react";
import type { Options } from "react-markdown";

type PluggableList = NonNullable<Options["remarkPlugins"]>;

export type MathPlugins = {
  remarkPlugins: PluggableList;
  rehypePlugins: PluggableList;
};

let loaded: MathPlugins | null = null;
let pending: Promise<MathPlugins> | null = null;

/**
 * Loads remark-math, rehype-katex and the KaTeX stylesheet with dynamic
 * imports so none of it is in the initial bundle. A failed load is not cached,
 * so a later message can retry. KaTeX never throws on bad input and never
 * trusts it (`trust: false`); no raw HTML is enabled anywhere.
 */
export function loadMathPlugins(): Promise<MathPlugins> {
  if (loaded) return Promise.resolve(loaded);
  pending ??= Promise.all([
    import("remark-math"),
    import("rehype-katex"),
    import("katex/dist/katex.min.css"),
  ])
    .then(([remarkMath, rehypeKatex]) => {
      loaded = {
        remarkPlugins: [[remarkMath.default, { singleDollarTextMath: false }]],
        rehypePlugins: [
          [
            rehypeKatex.default,
            { throwOnError: false, strict: "ignore", trust: false, errorColor: "currentColor" },
          ],
        ],
      };
      return loaded;
    })
    .catch((error: unknown) => {
      pending = null;
      throw error;
    });
  return pending;
}

/** Maths plugins once loaded, `null` until then or if loading failed. */
export function useMathPlugins(enabled: boolean): MathPlugins | null {
  const [plugins, setPlugins] = useState<MathPlugins | null>(loaded);
  useEffect(() => {
    if (!enabled || loaded) return;
    let cancelled = false;
    loadMathPlugins()
      .then((result) => {
        if (!cancelled) setPlugins(result);
      })
      .catch(() => {
        // Source stays visible as plain markdown.
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);
  return enabled ? (plugins ?? loaded) : null;
}

/** Test-only: forget the cached load. */
export function resetMathPluginsForTests(): void {
  loaded = null;
  pending = null;
}
