/**
 * Slash commands in a message box: type `/` first and a list of commands opens, typing
 * filters it, picking one fills the box or runs an action. The app supplies the commands;
 * the kit ships none. Pure functions over text, so any skin can use them.
 */

export type SlashCommand = {
  id: string;
  /** Shown and typed after the slash, for example "summarize". Matched case-insensitively. */
  name: string;
  description?: string;
  /** Extra words that find this command. */
  keywords?: string[];
  /** A heading the command is listed under, for example "Your commands". */
  group?: string;
  /**
   * Text that replaces the typed `/query` when the command is picked (a prompt template).
   * Without it the command is an action: the token is removed and the app does the work.
   */
  insert?: string;
  /** Shown but cannot be picked. */
  disabled?: boolean;
};

/** The command being typed: the text after the slash, and the range of the whole `/query` token. */
export type SlashQuery = { query: string; start: number; end: number };

/**
 * The command being typed, or null. Active only when the slash is the first non-space
 * character of the message (so "and/or", a URL or a path later in the text never counts),
 * the caret is after the slash and no later than the end of that first token, and the
 * token holds no whitespace.
 */
export function slashQuery(text: string, caret: number): SlashQuery | null {
  const start = text.search(/\S/);
  if (start < 0 || text[start] !== "/") return null;
  const gap = text.slice(start).search(/\s/);
  const end = gap < 0 ? text.length : start + gap;
  if (caret <= start || caret > end) return null;
  return { query: text.slice(start + 1, end), start, end };
}

function rank(command: SlashCommand, needle: string): number {
  const name = command.name.toLowerCase();
  if (name.startsWith(needle)) return 0;
  if (name.includes(needle)) return 1;
  const extras = [...(command.keywords ?? []), command.description ?? ""];
  return extras.some((extra) => extra.toLowerCase().includes(needle)) ? 2 : -1;
}

/**
 * The commands that match `query`. An empty query returns all of them in the given order.
 * Otherwise names starting with the query come first, then names containing it, then
 * keyword or description matches, each group in the given order. Disabled commands are
 * ranked like any other and stay in place; the list shows them but they cannot be picked.
 */
export function matchSlashCommands(commands: SlashCommand[], query: string): SlashCommand[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [...commands];
  return commands
    .map((command, index) => ({ command, index, rank: rank(command, needle) }))
    .filter((entry) => entry.rank >= 0)
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map((entry) => entry.command);
}

/**
 * The text and caret after picking `command`: the token replaced by `command.insert`
 * (caret at the end of what was inserted), or removed with the space it leaves at the
 * start trimmed when the command has no `insert`.
 */
export function applySlashCommand(
  text: string,
  range: { start: number; end: number },
  command: SlashCommand
): { text: string; caret: number } {
  const before = text.slice(0, range.start);
  const after = text.slice(range.end);
  if (command.insert !== undefined && command.insert !== "") {
    return { text: before + command.insert + after, caret: before.length + command.insert.length };
  }
  const joined = before + after;
  const trimmed = joined.trimStart();
  const caret = Math.max(0, before.length - (joined.length - trimmed.length));
  return { text: trimmed, caret };
}
