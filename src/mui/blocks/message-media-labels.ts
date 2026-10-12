/**
 * Every visible word of `MessageMedia`, with English defaults. Override any key with `labels`.
 * `{title}`, `{index}` and `{count}` are filled in where a string uses them.
 */
export interface MessageMediaLabels {
  /** The group around all the media of one reply (screen readers). */
  group: string;
  /** Alt text of an image that has neither `alt` nor `title`. */
  imageFallback: string;
  videoFallback: string;
  audioFallback: string;
  /** Read out for a skeleton while an item is `loading`. */
  loading: string;
  /** A failed item that has a title. */
  failed: string;
  /** A failed item without a title. */
  failedUntitled: string;
  retry: string;
  download: string;
  close: string;
  previous: string;
  next: string;
  /** The counter in the lightbox when there are several images, for example "2 of 4". */
  position: string;
}

export const DEFAULT_MESSAGE_MEDIA_LABELS: MessageMediaLabels = {
  group: "Attached media",
  imageFallback: "Generated image",
  videoFallback: "Generated video",
  audioFallback: "Generated audio",
  loading: "Loading {title}",
  failed: "Could not load {title}",
  failedUntitled: "Could not load this file",
  retry: "Retry",
  download: "Download",
  close: "Close",
  previous: "Previous image",
  next: "Next image",
  position: "{index} of {count}",
};

export function fillLabel(text: string, values: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (whole, key: string) => (key in values ? String(values[key]) : whole));
}
