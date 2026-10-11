import { useEffect } from "react";

export function usePageTitle(title: string): void {
  useEffect(() => {
    document.title = title === "Introduction" ? "niru-chat-kit" : `${title} | niru-chat-kit`;
  }, [title]);
}
