import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { installRecorderWorld, removeRecorderWorld } from "../voice/recorder-test-kit";
import { useSpeechInput } from "./use-speech-input";

class FakeRecognition {
  static instances: FakeRecognition[] = [];
  lang = "";
  continuous = false;
  interimResults = false;
  onresult: ((event: unknown) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  onend: ((event: unknown) => void) | null = null;
  started = 0;
  aborted = 0;
  constructor() {
    FakeRecognition.instances.push(this);
  }
  start() {
    this.started += 1;
  }
  stop() {
    this.onend?.({});
  }
  abort() {
    this.aborted += 1;
  }
}

const heard = (items: Array<[string, boolean]>) => ({
  resultIndex: 0,
  results: items.map(([transcript, isFinal]) => Object.assign([{ transcript }], { isFinal })),
});
const flush = () => act(async () => void (await vi.advanceTimersByTimeAsync(0)));

beforeEach(() => {
  vi.useFakeTimers();
  installRecorderWorld();
});
afterEach(() => {
  vi.useRealTimers();
  removeRecorderWorld();
  FakeRecognition.instances = [];
  Reflect.deleteProperty(window, "SpeechRecognition");
  Reflect.deleteProperty(window, "webkitSpeechRecognition");
});

async function recording(transcribe = vi.fn(async () => "server words"), onFinal = vi.fn(), lang?: string) {
  const hook = renderHook(() => useSpeechInput({ transcribe, onFinal, lang }));
  act(() => hook.result.current.start());
  await flush();
  return { hook, transcribe, onFinal };
}

describe("recording preview from browser speech recognition", () => {
  it("shows interim then settled words while recording, in the given language", async () => {
    Object.assign(window, { SpeechRecognition: FakeRecognition });
    const { hook } = await recording(undefined, undefined, "en-PH");
    const recognition = FakeRecognition.instances[0];
    expect(recognition.lang).toBe("en-PH");
    expect(recognition.interimResults).toBe(true);
    expect(hook.result.current.interim).toBe("");
    act(() => recognition.onresult?.(heard([["what is", false]])));
    expect(hook.result.current.interim).toBe("what is");
    act(() => recognition.onresult?.(heard([["what is on my calendar", true], [" today", false]])));
    expect(hook.result.current.interim).toBe("what is on my calendar today");
  });

  it("is replaced by the server text on stop, and the preview is never the final text", async () => {
    Object.assign(window, { webkitSpeechRecognition: FakeRecognition });
    const { hook, transcribe, onFinal } = await recording();
    act(() => FakeRecognition.instances[0].onresult?.(heard([["preview words", false]])));
    act(() => hook.result.current.stop());
    await flush();
    expect(transcribe).toHaveBeenCalledTimes(1);
    expect(onFinal).toHaveBeenCalledTimes(1);
    expect(onFinal).toHaveBeenCalledWith("server words");
    expect(hook.result.current.interim).toBe("");
    expect(FakeRecognition.instances[0].aborted).toBe(1);
  });

  it("clears the preview on cancel and sends nothing", async () => {
    Object.assign(window, { SpeechRecognition: FakeRecognition });
    const { hook, transcribe, onFinal } = await recording();
    act(() => FakeRecognition.instances[0].onresult?.(heard([["never mind", false]])));
    expect(hook.result.current.interim).toBe("never mind");
    act(() => hook.result.current.recorded?.cancel());
    await flush();
    expect(hook.result.current.interim).toBe("");
    expect(transcribe).not.toHaveBeenCalled();
    expect(onFinal).not.toHaveBeenCalled();
  });

  it("keeps recording with no preview and no error where the browser has no recognition", async () => {
    const { hook } = await recording();
    expect(hook.result.current.recorded?.state).toBe("recording");
    expect(hook.result.current.interim).toBe("");
    expect(hook.result.current.error).toBeNull();
  });

  it("restarts recognition when the browser ends it by itself during recording", async () => {
    Object.assign(window, { SpeechRecognition: FakeRecognition });
    await recording();
    act(() => FakeRecognition.instances[0].onend?.({}));
    expect(FakeRecognition.instances).toHaveLength(2);
    expect(FakeRecognition.instances[1].started).toBe(1);
  });

  it("does not start recognition when not recording", () => {
    Object.assign(window, { SpeechRecognition: FakeRecognition });
    renderHook(() => useSpeechInput({ transcribe: vi.fn() }));
    expect(FakeRecognition.instances).toHaveLength(0);
  });
});
