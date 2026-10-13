"use client";

/**
 * The microphones on this computer, for a voice input or call picker. Names are only given by the
 * browser once the microphone has been allowed, so call `refresh` after permission was granted; the
 * list also follows the browser's `devicechange` event (a headset plugged in or removed).
 */

import { useCallback, useEffect, useRef, useState } from "react";

/** One microphone the person can choose. */
export type MicrophoneChoice = { deviceId: string; label: string };

/** The id the browser gives the system default microphone. */
const SYSTEM_DEFAULT_ID = "default";
/** A Windows alias of the default microphone; listing it would show the same device twice. */
const COMMUNICATIONS_ID = "communications";

/** The audio inputs of a device list: aliases and duplicates dropped, the system default first, hidden labels numbered. */
export function microphonesOf(devices: readonly Pick<MediaDeviceInfo, "deviceId" | "label" | "kind">[]): MicrophoneChoice[] {
  const seen = new Set<string>();
  const usable = devices.filter((device) => {
    if (device.kind !== "audioinput" || device.deviceId === "" || device.deviceId === COMMUNICATIONS_ID || seen.has(device.deviceId)) return false;
    seen.add(device.deviceId);
    return true;
  });
  const first = usable.find((device) => device.deviceId === SYSTEM_DEFAULT_ID);
  const ordered = first ? [first, ...usable.filter((device) => device !== first)] : usable;
  return ordered.map((device, index) => ({ deviceId: device.deviceId, label: device.label.trim() || `Microphone ${index + 1}` }));
}

export function useMicrophones(): { microphones: MicrophoneChoice[]; refresh: () => Promise<void> } {
  const [microphones, setMicrophones] = useState<MicrophoneChoice[]>([]);
  const mounted = useRef(true);
  const asked = useRef(0);
  const refresh = useCallback(async () => {
    const devices = typeof navigator === "undefined" ? undefined : navigator.mediaDevices;
    if (!devices?.enumerateDevices) return;
    const mine = ++asked.current;
    try {
      const all = await devices.enumerateDevices();
      if (mounted.current && mine === asked.current) setMicrophones(microphonesOf(all));
    } catch {
      // The list stays as it was.
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    void refresh();
    const devices = typeof navigator === "undefined" ? undefined : navigator.mediaDevices;
    devices?.addEventListener?.("devicechange", refresh);
    return () => {
      mounted.current = false;
      devices?.removeEventListener?.("devicechange", refresh);
    };
  }, [refresh]);
  return { microphones, refresh };
}
