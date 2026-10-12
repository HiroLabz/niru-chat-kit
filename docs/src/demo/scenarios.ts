import type { Scenario } from "./frames";
import { delivery, error, essay, fallback, files, refund, stay } from "./scripts-flow";
import { code, image, markdown, math, sources, tools, trip } from "./scripts-rich";

/** In match order: the first scenario whose keyword appears in the question runs. */
export const SCENARIOS: Scenario[] = [error, refund, delivery, stay, essay, math, code, sources, trip, image, tools, markdown, files];

export const STARTERS: string[] = [
  markdown.starter,
  code.starter,
  math.starter,
  trip.starter,
  tools.starter,
  image.starter,
  sources.starter,
  refund.starter,
  delivery.starter,
  stay.starter,
  error.starter,
  essay.starter,
  files.starter,
];

export function pickScenario(question: string, attachments: string[]): Scenario {
  const lowered = question.toLowerCase();
  const hit = SCENARIOS.find((scenario) => scenario.keywords.some((word) => lowered.includes(word)));
  if (hit) return hit;
  return attachments.length > 0 ? files : fallback;
}

export { fallback };
