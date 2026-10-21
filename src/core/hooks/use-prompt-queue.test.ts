import { describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { usePromptQueue, type UsePromptQueueOptions } from "./use-prompt-queue";

function setup(initial: Partial<UsePromptQueueOptions> = {}) {
  const onSend = vi.fn();
  const hook = renderHook((props: Partial<UsePromptQueueOptions>) => usePromptQueue({ running: true, onSend, ...props }), { initialProps: initial });
  return { onSend, ...hook };
}

describe("usePromptQueue", () => {
  it("adds trimmed prompts with data, ignores blanks, and removes by id", () => {
    const { result } = setup();
    act(() => void result.current.add("  first "));
    act(() => void result.current.add("   "));
    act(() => void result.current.add("second", { files: 1 }));
    expect(result.current.items.map((i) => i.text)).toEqual(["first", "second"]);
    expect(result.current.items[1].data).toEqual({ files: 1 });
    act(() => result.current.remove(result.current.items[0].id));
    expect(result.current.items.map((i) => i.text)).toEqual(["second"]);
  });

  it("edit returns the item, removes it and tells the host", () => {
    const onEdit = vi.fn();
    const { result } = setup({ onEdit });
    act(() => void result.current.add("fix me"));
    const id = result.current.items[0].id;
    let taken: unknown;
    act(() => {
      taken = result.current.edit(id);
    });
    expect(taken).toMatchObject({ id, text: "fix me" });
    expect(onEdit).toHaveBeenCalledWith(taken);
    expect(result.current.items).toEqual([]);
  });

  it("steer ok removes the item", async () => {
    const onSteer = vi.fn().mockResolvedValue({ ok: true });
    const { result } = setup({ onSteer });
    expect(result.current.canSteer).toBe(true);
    act(() => void result.current.add("go left"));
    const id = result.current.items[0].id;
    await act(async () => {
      await result.current.steer(id);
    });
    expect(onSteer).toHaveBeenCalledWith(expect.objectContaining({ text: "go left" }));
    expect(result.current.items).toEqual([]);
    expect(result.current.steering).toEqual([]);
  });

  it("steer failure keeps the item and sets the note until the next action", async () => {
    const onSteer = vi.fn().mockResolvedValue({ ok: false, reason: "The turn is almost done." });
    const { result } = setup({ onSteer });
    act(() => void result.current.add("late"));
    await act(async () => {
      await result.current.steer(result.current.items[0].id);
    });
    expect(result.current.items).toHaveLength(1);
    expect(result.current.note).toBe("The turn is almost done.");
    act(() => void result.current.add("another"));
    expect(result.current.note).toBeNull();
  });

  it("a rejected steer also keeps the item", async () => {
    const onSteer = vi.fn().mockRejectedValue(new Error("Offline"));
    const { result } = setup({ onSteer });
    act(() => void result.current.add("x"));
    await act(async () => {
      await result.current.steer(result.current.items[0].id);
    });
    expect(result.current.items).toHaveLength(1);
    expect(result.current.note).toBe("Offline");
  });

  it("has no steer without onSteer", () => {
    const { result } = setup();
    expect(result.current.canSteer).toBe(false);
  });

  it("sends one prompt per idle, in order", () => {
    const { result, rerender, onSend } = setup();
    act(() => void result.current.add("one"));
    act(() => void result.current.add("two"));
    expect(onSend).not.toHaveBeenCalled();
    rerender({ running: false });
    expect(onSend).toHaveBeenCalledTimes(1);
    expect(onSend.mock.calls[0][0].text).toBe("one");
    expect(result.current.items.map((i) => i.text)).toEqual(["two"]);
    rerender({ running: true });
    expect(onSend).toHaveBeenCalledTimes(1);
    rerender({ running: false });
    expect(onSend).toHaveBeenCalledTimes(2);
    expect(onSend.mock.calls[1][0].text).toBe("two");
  });

  it("does not send while paused, then sends when resumed", () => {
    const { result, rerender, onSend } = setup({ running: false, paused: true });
    act(() => void result.current.add("held"));
    expect(onSend).not.toHaveBeenCalled();
    rerender({ running: false, paused: false });
    expect(onSend).toHaveBeenCalledTimes(1);
  });

  it("skips an item that is being steered", async () => {
    let finish: (value: { ok: false; reason: string }) => void = () => {};
    const onSteer = vi.fn(() => new Promise<{ ok: false; reason: string }>((resolve) => (finish = resolve)));
    const { result, rerender, onSend } = setup({ onSteer });
    act(() => void result.current.add("steered"));
    act(() => void result.current.add("plain"));
    let pending: Promise<unknown> = Promise.resolve();
    act(() => {
      pending = result.current.steer(result.current.items[0].id);
    });
    expect(result.current.steering).toHaveLength(1);
    rerender({ running: false, onSteer });
    expect(onSend.mock.calls.map((c) => c[0].text)).toEqual(["plain"]);
    await act(async () => {
      finish({ ok: false, reason: "no" });
      await pending;
    });
    expect(result.current.items.map((i) => i.text)).toEqual(["steered"]);
  });
});
