/**
 * Every default word of the composer's opt-in extras (the Add menu, chips, pasted text and the
 * approval choice). Override any of them with the composer's `extrasLabels` prop. The words
 * the app supplies itself (menu and section titles, item labels, the approval heading) are props
 * of those features and are not listed here unless a default is needed.
 */
export interface ComposerExtrasLabels {
  /** The plus button's name and the Add panel's heading when `addMenu.label` is not given. */
  add: string;
  /** The placeholder and name of a section's search field when it has no `searchPlaceholder`. */
  search: string;
  /** The quiet row shown while a section is `loading`. */
  loading: string;
  /** Said in a searchable section when nothing matches and it has no `emptyText`. */
  noMatches: string;
  /** The start of a remove button's name, for example "Remove Plan mode". */
  remove: string;
  /** The size line of a pasted text; `{count}` is the number of characters, for example "3,412 characters". */
  pastedSize: string;
  /** The link on a pasted text chip. */
  showPasted: string;
  /** The approval menu's heading when `approvalMode.heading` is not given. */
  approvalHeading: string;
  /** The mention list's name when `mentionsLabel` is not given. */
  mentions: string;
  /** Said in the mention list when nothing matches and `mentionsEmptyText` is not given. */
  mentionsEmpty: string;
}

export const DEFAULT_COMPOSER_EXTRAS_LABELS: ComposerExtrasLabels = {
  add: "Add",
  search: "Search",
  loading: "Loading",
  noMatches: "No matches",
  remove: "Remove",
  pastedSize: "{count} characters",
  showPasted: "Show in text field",
  approvalHeading: "How should actions be approved?",
  mentions: "Mentions",
  mentionsEmpty: "No matches",
};

export function composerExtrasLabels(overrides?: Partial<ComposerExtrasLabels>): ComposerExtrasLabels {
  return { ...DEFAULT_COMPOSER_EXTRAS_LABELS, ...overrides };
}
