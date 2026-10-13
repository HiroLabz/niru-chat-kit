import type { ClipboardEvent } from "react";
import { isLongPaste, type LongPasteThreshold } from "../../core/pasted-text";

/**
 * What the composer does with a paste. Files on the clipboard (a screenshot, a copied image or files) go to
 * `onAttach`. A plain-text paste into the text box that is long goes to `onPasteLongText` and does not enter
 * the box. Returns true when something took the paste, so the caller stops the browser from also inserting it.
 */
export function takePaste(
  event: ClipboardEvent<HTMLElement>,
  options: { onAttach?: (files: File[]) => void; onPasteLongText?: (text: string) => void; threshold?: LongPasteThreshold }
): boolean {
  const data = event.clipboardData;
  if (!data) return false;
  let handled = false;
  if (options.onAttach) {
    let files = Array.from(data.files ?? []);
    if (!files.length) {
      files = Array.from(data.items ?? [])
        .filter((item) => item.kind === "file")
        .map((item) => item.getAsFile())
        .filter((file): file is File => file !== null);
    }
    if (files.length) {
      options.onAttach(files);
      handled = true;
    }
  }
  // Only a paste into the text box counts: a search field or a settings input inside the composer keeps its text.
  const intoField = (event.target as HTMLElement).closest?.('[data-chat="composer-field"]');
  const text = options.onPasteLongText && intoField ? data.getData("text/plain") : "";
  if (text && isLongPaste(text, options.threshold)) {
    options.onPasteLongText?.(text);
    handled = true;
  }
  return handled;
}
