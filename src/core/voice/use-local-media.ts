"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { createLocalMedia, type CreateLocalMediaOptions, type LocalMedia, type LocalMediaSnapshot } from "./local-media";

/** What `useLocalMedia` returns: the preview streams plus the controls. */
export type UseLocalMediaResult = LocalMediaSnapshot & Omit<LocalMedia, "getSnapshot" | "subscribe">;

const SERVER_SNAPSHOT: LocalMediaSnapshot = { camera: null, screen: null, supported: { camera: false, screen: false }, error: null };

/**
 * The visitor's own camera and screen share as local preview streams, through `getUserMedia` and
 * `getDisplayMedia` (feature-detected). Every track is stopped by `stopCamera`, `stopScreen` and
 * `stopAll`, and when the component unmounts. Pass the controller to a session (for example
 * `createFakeVoiceSession({ media })`) or draw the streams in a `<video>` yourself.
 */
export function useLocalMedia(options?: CreateLocalMediaOptions): UseLocalMediaResult & { controller: LocalMedia } {
  const devices = options?.mediaDevices;
  const controller = useMemo(() => createLocalMedia({ mediaDevices: devices }), [devices]);
  const snapshot = useSyncExternalStore(controller.subscribe, controller.getSnapshot, () => SERVER_SNAPSHOT);
  useEffect(() => () => controller.stopAll(), [controller]);
  return {
    ...snapshot,
    controller,
    startCamera: controller.startCamera,
    startScreen: controller.startScreen,
    stopCamera: controller.stopCamera,
    stopScreen: controller.stopScreen,
    stopAll: controller.stopAll,
  };
}
