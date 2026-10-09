import { CHAT_KIT_COLOR_TOKEN_NAMES, type ChatKitTokenOverrides } from "../../core/tokens";

let registered: ChatKitTokenOverrides | undefined;

/**
 * Sets the overrides every chat in the app starts from, below any `ChatKitProvider`
 * `tokens`. An app calls it once so chats rendered without a provider still wear the
 * app's own look.
 */
export function setChatKitDefaultOverrides(overrides: ChatKitTokenOverrides | undefined): void {
  registered = overrides;
}

export function getChatKitDefaultOverrides(): ChatKitTokenOverrides | undefined {
  return registered;
}

function expand(overrides: ChatKitTokenOverrides): ChatKitTokenOverrides {
  const { light, dark, ...flat } = overrides;
  const shared: Record<string, unknown> = {};
  const colors: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(flat)) {
    if ((CHAT_KIT_COLOR_TOKEN_NAMES as readonly string[]).includes(name)) colors[name] = value;
    else shared[name] = value;
  }
  return { ...shared, light: { ...colors, ...light }, dark: { ...colors, ...dark } };
}

/** Merges two override sets; the second wins, scheme by scheme. */
export function mergeChatKitOverrides(
  base: ChatKitTokenOverrides | undefined,
  next: ChatKitTokenOverrides | undefined
): ChatKitTokenOverrides | undefined {
  if (!base) return next;
  if (!next) return base;
  const a = expand(base);
  const b = expand(next);
  return {
    ...a,
    ...b,
    light: { ...a.light, ...b.light },
    dark: { ...a.dark, ...b.dark },
  };
}
