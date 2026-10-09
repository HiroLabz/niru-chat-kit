import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const SRC = dirname(fileURLToPath(import.meta.url));
const CORE = join(SRC, "core");
const MUI = join(SRC, "mui");

const IMPORT_SPECIFIER = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+|\brequire\s*\(\s*|\bmock\s*\(\s*)["']([^"']+)["']/g;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(entry) ? [path] : [];
  });
}

function specifiers(file: string): string[] {
  const text = readFileSync(file, "utf8");
  return Array.from(text.matchAll(IMPORT_SPECIFIER), (match) => match[1]);
}

function inside(parent: string, path: string): boolean {
  return path === parent || path.startsWith(parent + sep);
}

type Violation = { file: string; specifier: string; reason: string };

function violationsIn(root: string, forbidsMui: boolean): Violation[] {
  const found: Violation[] = [];
  for (const file of sourceFiles(root)) {
    for (const specifier of specifiers(file)) {
      const where = relative(SRC, file);
      if (specifier.startsWith("@/")) found.push({ file: where, specifier, reason: "imports the app" });
      else if (forbidsMui && specifier.startsWith("@mui/")) found.push({ file: where, specifier, reason: "core imports MUI" });
      else if (specifier.startsWith(".")) {
        const target = resolve(dirname(file), specifier);
        if (!inside(SRC, target)) found.push({ file: where, specifier, reason: "leaves the package" });
        else if (forbidsMui && inside(MUI, target)) found.push({ file: where, specifier, reason: "core imports the skin" });
      }
    }
  }
  return found;
}

describe("niru-chat-kit boundaries", () => {
  it("scans real files", () => {
    expect(sourceFiles(CORE).length).toBeGreaterThan(10);
    expect(sourceFiles(MUI).length).toBeGreaterThan(0);
  });

  it("keeps @mui/* and the app out of the core", () => {
    expect(violationsIn(CORE, true)).toEqual([]);
  });

  it("keeps the app out of the MUI skin", () => {
    expect(violationsIn(MUI, false)).toEqual([]);
  });
});
