"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** One prompt waiting behind the running turn. `data` is opaque to the kit (attachments, mentions, and so on). */
export type QueuedPrompt<T = unknown> = { id: string; text: string; data?: T };

/** What a steer attempt answers: it worked, or it did not and why (the host chooses the words). */
export type SteerResult = { ok: true } | { ok: false; reason: string };

export type UsePromptQueueOptions<T = unknown> = {
  /** True while a turn is working. The next queued prompt is sent when this turns false. */
  running: boolean;
  /** Hold the queue (nothing is sent) while true, for example while the chat needs an answer first. */
  paused?: boolean;
  /** Sends one queued prompt as a new turn. It must start a run, so `running` turns true and later false. */
  onSend: (item: QueuedPrompt<T>) => void | Promise<unknown>;
  /**
   * Adds a queued prompt to the turn that is already working, without interrupting it. Resolve `{ ok: true }` to
   * take it off the queue; `{ ok: false, reason }` (or a rejection) keeps it queued and shows the reason as the note.
   * Omitted: no Steer button.
   */
  onSteer?: (item: QueuedPrompt<T>) => Promise<SteerResult | void>;
  /** Called with the item `edit` took off the queue, so the host can put its text back in the composer. */
  onEdit?: (item: QueuedPrompt<T>) => void;
};

export type PromptQueueState<T = unknown> = {
  items: QueuedPrompt<T>[];
  /** Ids being steered right now. */
  steering: string[];
  /** Why the last steer did not work; cleared by the next action. */
  note: string | null;
  /** True when the host gave `onSteer`. */
  canSteer: boolean;
  add: (text: string, data?: T) => QueuedPrompt<T> | null;
  remove: (id: string) => void;
  /** Takes the item off the queue and returns it (also passed to `onEdit`). */
  edit: (id: string) => QueuedPrompt<T> | null;
  steer: (id: string) => Promise<SteerResult>;
  clearNote: () => void;
  /** Aliases so the whole return can be passed to `PromptQueue` / `Composer` as `queue`. */
  onSteer: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
};

let counter = 0;
const nextId = () => `queued-${Date.now().toString(36)}-${(counter++).toString(36)}`;

/** A stack of prompts typed while a turn works: sent one at a time when it ends, or steered into it. */
export function usePromptQueue<T = unknown>(options: UsePromptQueueOptions<T>): PromptQueueState<T> {
  const { running, paused = false } = options;
  const [items, setItems] = useState<QueuedPrompt<T>[]>([]);
  const [steering, setSteering] = useState<string[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const optionsRef = useRef(options);
  optionsRef.current = options;
  /** Set after a send until the run it started shows up, so one idle sends one prompt. */
  const awaitingRun = useRef(false);

  const commit = useCallback((next: QueuedPrompt<T>[]) => {
    itemsRef.current = next;
    setItems(next);
  }, []);

  const add = useCallback(
    (text: string, data?: T) => {
      const trimmed = text.trim();
      if (!trimmed) return null;
      const item: QueuedPrompt<T> = data === undefined ? { id: nextId(), text: trimmed } : { id: nextId(), text: trimmed, data };
      setNote(null);
      commit([...itemsRef.current, item]);
      return item;
    },
    [commit]
  );

  const remove = useCallback(
    (id: string) => {
      setNote(null);
      commit(itemsRef.current.filter((item) => item.id !== id));
    },
    [commit]
  );

  const edit = useCallback(
    (id: string) => {
      const item = itemsRef.current.find((entry) => entry.id === id) ?? null;
      setNote(null);
      if (!item) return null;
      commit(itemsRef.current.filter((entry) => entry.id !== id));
      optionsRef.current.onEdit?.(item);
      return item;
    },
    [commit]
  );

  const steeringRef = useRef<string[]>([]);
  const steer = useCallback(
    async (id: string): Promise<SteerResult> => {
      const item = itemsRef.current.find((entry) => entry.id === id);
      const handler = optionsRef.current.onSteer;
      if (!item || !handler || steeringRef.current.includes(id)) return { ok: false, reason: "" };
      setNote(null);
      steeringRef.current = [...steeringRef.current, id];
      setSteering(steeringRef.current);
      let result: SteerResult;
      try {
        const answer = await handler(item);
        result = answer ?? { ok: true };
      } catch (error) {
        result = { ok: false, reason: error instanceof Error && error.message ? error.message : "Could not steer this prompt." };
      }
      steeringRef.current = steeringRef.current.filter((entry) => entry !== id);
      setSteering(steeringRef.current);
      if (result.ok) commit(itemsRef.current.filter((entry) => entry.id !== id));
      else setNote(result.reason);
      return result;
    },
    [commit]
  );

  useEffect(() => {
    if (running) awaitingRun.current = false;
  }, [running]);

  useEffect(() => {
    if (running || paused || awaitingRun.current) return;
    const next = items.find((item) => !steering.includes(item.id));
    if (!next) return;
    awaitingRun.current = true;
    commit(itemsRef.current.filter((item) => item.id !== next.id));
    try {
      const sent = optionsRef.current.onSend(next);
      if (sent && typeof (sent as Promise<unknown>).catch === "function") {
        (sent as Promise<unknown>).catch(() => {
          awaitingRun.current = false;
        });
      }
    } catch {
      awaitingRun.current = false;
    }
  }, [running, paused, items, steering, commit]);

  return {
    items,
    steering,
    note,
    canSteer: Boolean(options.onSteer),
    add,
    remove,
    edit,
    steer,
    clearNote: useCallback(() => setNote(null), []),
    onSteer: useCallback((id: string) => void steer(id), [steer]),
    onEdit: useCallback((id: string) => void edit(id), [edit]),
    onDelete: remove,
  };
}
