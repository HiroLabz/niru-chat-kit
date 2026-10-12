/** What kind of file a `MediaItem` is. */
export type MediaKind = "image" | "video" | "audio";

/** Where a `MediaItem` is: still being made or fetched, ready to show, or could not be had. */
export type MediaStatus = "loading" | "ready" | "failed";

/**
 * One image, video or sound shown under an assistant reply. `src` is whatever the app gives (an
 * https address, a `blob:` or a `data:` URL); the kit never fetches it. Give `width` and `height`
 * when you know them so the page does not jump when the picture arrives.
 */
export type MediaItem = {
  /** Stable for the life of the item; used as the list key. */
  id: string;
  kind: MediaKind;
  /** The address to draw. Null while `status` is `loading` or `failed`. */
  src: string | null;
  status: MediaStatus;
  /** What a screen reader says for an image. Falls back to `title`, then to the label "Generated image". */
  alt?: string;
  title?: string;
  /** For example `image/png`, `video/mp4`. */
  mime?: string;
  /** Natural size in px, for the aspect ratio. */
  width?: number;
  height?: number;
  /** A still shown on a video before it plays. */
  poster?: string | null;
  durationSeconds?: number;
  /** The name a download is saved under. */
  filename?: string;
};
