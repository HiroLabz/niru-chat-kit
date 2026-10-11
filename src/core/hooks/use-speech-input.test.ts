import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { speechErrorMessage, useSpeechInput } from "./use-speech-input";

type Handler = ((event: unknown) => void) | null;

class FakeRecognition {
  static instances: FakeRecognition[] = [];
  lang = "";
  continuous = false;
  interimResults = false;
  onresult: Handler = null;
  onerror: Handler = null;
  onend: Handler = null;
  started = 0;
  stopped = 0;
  aborted = 0;
  constructor() {
    FakeRecognition.instances.push(this);
  }
  start() {
    this.started += 1;
  }
  stop() {
    this.stopped += 1;
    this.onend?.({});
  }
  abort() {
    this.aborted += 1;
  }
}

function results(items: Array<[string, boolean]>, resultIndex = 0) {
  const list = items.map(([transcript, isFinal]) => Object.assign([{ transcript }], { isFinal }));
  return { resultIndex, results: list };
}

afterEach(() => {
  FakeRecognition.instances = [];
  Reflect.deleteProperty(window, "SpeechRecognition");
  Reflect.deleteProperty(window, "webkitSpeechRecognition");
});

describe("useSpeechInput", () => {
  it("reports unsupported when the browser has no recognition, and start is a no-op", () => {
    const { result } = renderHook(() => useSpeechInput());
    expect(result.current.supported).toBe(false);
    act(() => result.current.start());
    expect(result.current.listening).toBe(false);
  });

  it("finds the prefixed constructor", () => {
    Object.assign(window, { webkitSpeechRecognition: FakeRecognition });
    const { result } = renderHook(() => useSpeechInput());
    expect(result.current.supported).toBe(true);
  });

  it("starts with the language, streams interim text and hands over final text", () => {
    Object.assign(window, { SpeechRecognition: FakeRecognition });
    const onFinal = vi.fn();
    const onInterim = vi.fn();
    const { result } = renderHook(() => useSpeechInput({ lang: "fil-PH", onFinal, onInterim }));
    act(() => result.current.start());
    const fake = FakeRecognition.instances[0];
    expect(fake.lang).toBe("fil-PH");
    expect(fake.interimResults).toBe(true);
    expect(result.current.listening).toBe(true);

    act(() => fake.onresult?.(results([["hel", false]])));
    expect(result.current.interim).toBe("hel");
    expect(onInterim).toHaveBeenCalledWith("hel");

    act(() => fake.onresult?.(results([["hello there", true]])));
    expect(onFinal).toHaveBeenCalledWith("hello there");
    expect(result.current.interim).toBe("");
  });

  it("stops, clears listening and the interim text", () => {
    Object.assign(window, { SpeechRecognition: FakeRecognition });
    const { result } = renderHook(() => useSpeechInput());
    act(() => result.current.start());
    act(() => FakeRecognition.instances[0].onresult?.(results([["abc", false]])));
    act(() => result.current.stop());
    expect(FakeRecognition.instances[0].stopped).toBe(1);
    expect(result.current.listening).toBe(false);
    expect(result.current.interim).toBe("");
  });

  it("keeps the error code and message for a denied permission, without throwing", () => {
    Object.assign(window, { SpeechRecognition: FakeRecognition });
    const { result } = renderHook(() => useSpeechInput());
    act(() => result.current.start());
    act(() => FakeRecognition.instances[0].onerror?.({ error: "not-allowed" }));
    expect(result.current.error).toBe("not-allowed");
    expect(speechErrorMessage("not-allowed")).toMatch(/microphone/i);
    expect(speechErrorMessage("no-speech")).toMatch(/did not hear/i);
    expect(speechErrorMessage(null)).toBe("");
    act(() => FakeRecognition.instances[0].onend?.({}));
    expect(result.current.listening).toBe(false);
    expect(result.current.error).toBe("not-allowed");
    act(() => result.current.start());
    expect(result.current.error).toBeNull();
  });

  it("ignores an aborted error and aborts the session on unmount", () => {
    Object.assign(window, { SpeechRecognition: FakeRecognition });
    const { result, unmount } = renderHook(() => useSpeechInput());
    act(() => result.current.start());
    act(() => FakeRecognition.instances[0].onerror?.({ error: "aborted" }));
    expect(result.current.error).toBeNull();
    unmount();
    expect(FakeRecognition.instances[0].aborted).toBe(1);
  });
});
