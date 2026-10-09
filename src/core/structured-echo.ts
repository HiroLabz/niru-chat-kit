/**
 * Whether a bubble's text is just its own structured output, serialised.
 *
 * When a response schema is applied the runtime answers with the JSON that satisfies
 * it, so the turn carries the same content twice: `text` is the raw
 * `{"letter":"…"}` and `output` is the parsed object the block renders. The bubble
 * printed the first and the block printed the second, which read as the agent
 * answering twice and as a schema firing on a question that never asked for one
 * (tickets 86d4aq124 and 86d4aq12d — one defect, reported as two).
 *
 * The comparison is deliberately narrow. A run may legitimately return prose *and* a
 * structured payload, and that prose must keep rendering; only text that parses to
 * exactly the same value is an echo.
 */

import type { ShapingStatus } from "./shaping";

/** The statuses where `output` holds a payload the block renders in full. */
const APPLIED: readonly ShapingStatus[] = ["applied", "repaired"];

function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null || typeof a !== "object" || typeof b !== "object") return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const left = a as Record<string, unknown>;
  const right = b as Record<string, unknown>;
  const keys = Object.keys(left);
  if (keys.length !== Object.keys(right).length) return false;
  return keys.every((key) => key in right && sameValue(left[key], right[key]));
}

export function isStructuredEcho(
  text: string | null | undefined,
  output: Record<string, unknown> | null | undefined,
  status: ShapingStatus | undefined
): boolean {
  if (!status || !APPLIED.includes(status)) return false;
  if (!output || Object.keys(output).length === 0) return false;
  const trimmed = (text ?? "").trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return false;
  try {
    return sameValue(JSON.parse(trimmed), output);
  } catch {
    return false;
  }
}
