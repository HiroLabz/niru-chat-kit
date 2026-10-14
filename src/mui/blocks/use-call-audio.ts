"use client";

import { useCallback, useEffect, useRef, useState, type SyntheticEvent } from "react";

export const CALL_PLAYBACK_RATES = [1, 1.5, 2] as const;

export type CallAudioState = "loading" | "ready" | "error";

/**
 * State of one native `<audio>` element for the call player. Spread `audioProps` on the element.
 * The element is the source of truth: state follows its events.
 */
export function useCallAudio(src: string | null | undefined, fallbackDuration: number) {
  const ref = useRef<HTMLAudioElement | null>(null);
  const [state, setState] = useState<CallAudioState>("loading");
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rate, setRateState] = useState<number>(1);

  useEffect(() => {
    setState("loading");
    setPlaying(false);
    setCurrent(0);
    setDuration(0);
  }, [src]);

  const syncDuration = (el: HTMLAudioElement) => {
    if (Number.isFinite(el.duration) && el.duration > 0) setDuration(el.duration);
  };

  const run = (fn: () => unknown) => {
    try {
      const result = fn();
      if (result && typeof (result as Promise<unknown>).catch === "function") (result as Promise<unknown>).catch(() => undefined);
    } catch {
      /* play() can refuse (autoplay rules); the paused state stays truthful through events. */
    }
  };

  const play = useCallback(() => {
    const el = ref.current;
    if (el) run(() => el.play());
  }, []);
  const pause = useCallback(() => {
    ref.current?.pause();
  }, []);
  const toggle = useCallback(() => (playing ? pause() : play()), [playing, play, pause]);
  const seek = useCallback((seconds: number) => {
    const el = ref.current;
    if (!el) return;
    const target = Math.max(0, seconds);
    el.currentTime = target;
    setCurrent(target);
  }, []);
  const seekAndPlay = useCallback(
    (seconds: number) => {
      seek(seconds);
      play();
    },
    [seek, play]
  );
  const setRate = useCallback((next: number) => {
    setRateState(next);
    if (ref.current) ref.current.playbackRate = next;
  }, []);
  /** Loads the recording again after an error. */
  const reload = useCallback(() => {
    setState("loading");
    const el = ref.current;
    if (el) run(() => el.load());
  }, []);

  const audioProps = {
    ref,
    src: src ?? undefined,
    preload: "metadata" as const,
    onLoadedMetadata: (e: SyntheticEvent<HTMLAudioElement>) => {
      syncDuration(e.currentTarget);
      e.currentTarget.playbackRate = rate;
      setState("ready");
    },
    onDurationChange: (e: SyntheticEvent<HTMLAudioElement>) => syncDuration(e.currentTarget),
    onCanPlay: () => setState("ready"),
    onTimeUpdate: (e: SyntheticEvent<HTMLAudioElement>) => setCurrent(e.currentTarget.currentTime),
    onPlay: () => setPlaying(true),
    onPause: () => setPlaying(false),
    onEnded: () => setPlaying(false),
    onError: () => {
      setState("error");
      setPlaying(false);
    },
  };

  return {
    audioProps,
    state,
    playing,
    current,
    duration: duration || fallbackDuration,
    rate,
    toggle,
    seek,
    seekAndPlay,
    setRate,
    reload,
  };
}

export type CallAudio = ReturnType<typeof useCallAudio>;
