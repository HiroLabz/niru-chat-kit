"use client";

import { createContext, useContext } from "react";

/** Optional looks an app can switch on for the whole chat. Every flag is off by default. */
export type ChatLook = {
  /** A turn's working steps ("Worked for 7s") as a bordered card with its state ("Finished") on the right, instead of a plain line. */
  stepsCard?: boolean;
};

const ChatLookContext = createContext<ChatLook>({});

export const ChatLookProvider = ChatLookContext.Provider;

export function useChatLook(): ChatLook {
  return useContext(ChatLookContext);
}
