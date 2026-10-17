import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const HERE = dirname(fileURLToPath(import.meta.url));
const IMPORT_SPECIFIER = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+|\bexport\s+\*\s+from\s*)["'](\.[^"']*)["']/g;

/** Resolves a relative specifier to the .ts / .tsx file or index file it names. */
function resolveFile(from: string, specifier: string): string | null {
  const base = resolve(dirname(from), specifier);
  for (const candidate of [`${base}.ts`, `${base}.tsx`, join(base, "index.ts"), join(base, "index.tsx")]) {
    try {
      readFileSync(candidate);
      return candidate;
    } catch {
      // try the next form
    }
  }
  return null;
}

/** Every source file reachable from `entry` through static or dynamic relative imports. */
function reachableFrom(entry: string): Set<string> {
  const seen = new Set<string>();
  const queue = [entry];
  while (queue.length) {
    const file = queue.pop() as string;
    if (seen.has(file)) continue;
    seen.add(file);
    const text = readFileSync(file, "utf8");
    for (const match of text.matchAll(IMPORT_SPECIFIER)) {
      const target = resolveFile(file, match[1]);
      if (target) queue.push(target);
    }
  }
  return seen;
}

describe("FullChat bundle weight", () => {
  const reached = [...reachableFrom(join(HERE, "full-chat.tsx"))].map((file) => file.slice(HERE.length + 1));

  it("walks the real import graph", () => {
    expect(reached).toContain("full-chat.tsx");
    expect(reached).toContain("composer.tsx");
    expect(reached).toContain("conversation.tsx");
  });

  it("never reaches the history sidebar, so an app that passes no sidebar does not bundle it", () => {
    expect(reached.filter((file) => file.includes("chat-history"))).toEqual([]);
  });
});
