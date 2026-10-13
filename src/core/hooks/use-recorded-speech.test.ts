import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { FakeMediaRecorder, installRecorderWorld, removeRecorderWorld } from "../voice/recorder-test-kit";
import { useRecordedSpeech, type UseRecordedSpeechOptions } from "./use-recorded-speech";
import { useSpeechInput } from "./use-speech-input";

let world: ReturnType<typeof installRecorderWorld>;
beforeEach(() => {
  vi.useFakeTimers();
  world = installRecorderWorld();
});
afterEach(() => {
  vi.useRealTimers();
  removeRecorderWorld();
});

const flush = () => act(async () => void (await vi.advanceTimersByTimeAsync(0)));

async function recording(options: UseRecordedSpeechOptions) {
  const hook = renderHook((props: UseRecordedSpeechOptions) => useRecordedSpeech(props), { initialProps: options });
  act(() => hook.result.current.start());
  await flush();
  return hook;
}

describe("useRecordedSpeech", () => {
  it("is unsupported without transcribe, and without MediaRecorder", () => {
    expect(renderHook(() => useRecordedSpeech({})).result.current.supported).toBe(false);
    vi.unstubAllGlobals();
    Reflect.deleteProperty(globalThis, "MediaRecorder");
    expect(renderHook(() => useRecordedSpeech({ transcribe: vi.fn() })).result.current.supported).toBe(false);
  });

  it("asks for a mono, processed microphone on the chosen device, then records", async () => {
    const hook = renderHook(() => useRecordedSpeech({ transcribe: vi.fn(), microphoneId: "usb-1" }));
    expect(hook.result.current.supported).toBe(true);
    act(() => hook.result.current.start());
    expect(hook.result.current.state).toBe("asking");
    await flush();
    expect(world.getUserMedia).toHaveBeenCalledWith({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1, deviceId: { exact: "usb-1" } },
    });
    expect(hook.result.current.state).toBe("recording");
    expect(FakeMediaRecorder.instances[0].options?.mimeType).toBe("audio/webm;codecs=opus");
  });

  it("uses the default device without microphoneId, and the first supported MIME type in order", async () => {
    FakeMediaRecorder.supported = new Set(["audio/mp4", "audio/ogg;codecs=opus"]);
    await recording({ transcribe: vi.fn() });
    const audio = world.getUserMedia.mock.calls[0][0].audio as Record<string, unknown>;
    expect(audio).not.toHaveProperty("deviceId");
    expect(FakeMediaRecorder.instances[0].options?.mimeType).toBe("audio/mp4");
  });

  it("falls back to the browser's own type when none is supported", async () => {
    FakeMediaRecorder.supported = new Set();
    await recording({ transcribe: vi.fn() });
    expect(FakeMediaRecorder.instances[0].options).toBeUndefined();
  });

  it("on stop transcribes the audio with its type and duration, adds the text, stops the tracks and keeps nothing", async () => {
    let finish: (text: string) => void = () => undefined;
    const transcribe = vi.fn(() => new Promise<string>((resolve) => (finish = resolve)));
    const onFinal = vi.fn();
    const hook = await recording({ transcribe, onFinal });
    act(() => void vi.advanceTimersByTime(2500));
    expect(hook.result.current.elapsedMs).toBeGreaterThanOrEqual(2400);
    act(() => hook.result.current.stop());
    expect(hook.result.current.state).toBe("transcribing");
    expect(world.tracks[0].stop).toHaveBeenCalledTimes(1);
    const [blob, info] = transcribe.mock.calls[0] as unknown as [Blob, { mime: string; durationMs: number }];
    expect(blob).toBeInstanceOf(Blob);
    expect(info).toEqual({ mime: "audio/webm;codecs=opus", durationMs: 2500 });
    expect(onFinal).not.toHaveBeenCalled();
    await act(async () => finish("  hello there "));
    expect(onFinal).toHaveBeenCalledWith("hello there");
    expect(hook.result.current.state).toBe("idle");
    expect(hook.result.current.failure).toBeNull();
  });

  it("shows a level while recording when the browser can measure it", async () => {
    const analyser = { fftSize: 32, getByteTimeDomainData: (data: Uint8Array) => data.fill(192) };
    class FakeContext {
      createAnalyser = () => analyser;
      createMediaStreamSource = () => ({ connect: vi.fn() });
      close = vi.fn(async () => undefined);
    }
    vi.stubGlobal("AudioContext", FakeContext);
    Object.assign(window, { AudioContext: FakeContext });
    const hook = await recording({ transcribe: vi.fn() });
    act(() => void vi.advanceTimersByTime(300));
    expect(hook.result.current.level).toBeGreaterThan(0.5);
    Reflect.deleteProperty(window, "AudioContext");
  });

  it("stops by itself at maxDurationMs and transcribes", async () => {
    const transcribe = vi.fn(async () => "long");
    const onFinal = vi.fn();
    const hook = await recording({ transcribe, onFinal, maxDurationMs: 5000 });
    act(() => void vi.advanceTimersByTime(4900));
    expect(transcribe).not.toHaveBeenCalled();
    await act(async () => void (await vi.advanceTimersByTimeAsync(200)));
    expect(transcribe).toHaveBeenCalledTimes(1);
    expect(onFinal).toHaveBeenCalledWith("long");
    expect(hook.result.current.state).toBe("idle");
  });

  it("defaults the limit to two minutes", async () => {
    const transcribe = vi.fn(async () => "x");
    await recording({ transcribe });
    act(() => void vi.advanceTimersByTime(119_000));
    expect(transcribe).not.toHaveBeenCalled();
    await act(async () => void (await vi.advanceTimersByTimeAsync(1100)));
    expect(transcribe).toHaveBeenCalledTimes(1);
  });

  it("cancel discards the recording without transcribing, and stops the tracks", async () => {
    const transcribe = vi.fn(async () => "x");
    const hook = await recording({ transcribe });
    act(() => hook.result.current.cancel());
    expect(transcribe).not.toHaveBeenCalled();
    expect(world.tracks[0].stop).toHaveBeenCalled();
    expect(hook.result.current.state).toBe("idle");
    expect(FakeMediaRecorder.instances[0].state).toBe("inactive");
  });

  it("cancel while asking releases the stream once it arrives and never records", async () => {
    let allow: () => void = () => undefined;
    world.gate.hold = new Promise<void>((resolve) => (allow = resolve));
    const hook = renderHook(() => useRecordedSpeech({ transcribe: vi.fn() }));
    act(() => hook.result.current.start());
    act(() => hook.result.current.cancel());
    allow();
    await flush();
    expect(world.tracks[0].stop).toHaveBeenCalled();
    expect(FakeMediaRecorder.instances).toHaveLength(0);
    expect(hook.result.current.state).toBe("idle");
  });

  it("cancel while transcribing drops the result", async () => {
    let finish: (text: string) => void = () => undefined;
    const onFinal = vi.fn();
    const hook = await recording({ transcribe: () => new Promise<string>((resolve) => (finish = resolve)), onFinal });
    act(() => hook.result.current.stop());
    act(() => hook.result.current.cancel());
    await act(async () => finish("late"));
    expect(onFinal).not.toHaveBeenCalled();
    expect(hook.result.current.state).toBe("idle");
  });

  it("an empty result is nothing heard, not an error, and adds nothing", async () => {
    const onFinal = vi.fn();
    const hook = await recording({ transcribe: async () => "   ", onFinal });
    await act(async () => hook.result.current.stop());
    expect(hook.result.current.state).toBe("failed");
    expect(hook.result.current.failure).toBe("nothing-heard");
    expect(onFinal).not.toHaveBeenCalled();
    expect(world.tracks[0].stop).toHaveBeenCalled();
  });

  it("a rejected transcription keeps the app's reason, stops the tracks, and can be tried again", async () => {
    const transcribe = vi.fn().mockRejectedValueOnce(new Error("The speech service is busy.")).mockResolvedValueOnce("second try");
    const onFinal = vi.fn();
    const hook = await recording({ transcribe, onFinal });
    await act(async () => hook.result.current.stop());
    expect(hook.result.current.state).toBe("failed");
    expect(hook.result.current.failure).toBe("transcription-failed");
    expect(hook.result.current.detail).toBe("The speech service is busy.");
    expect(onFinal).not.toHaveBeenCalled();
    act(() => hook.result.current.start());
    await flush();
    expect(hook.result.current.failure).toBeNull();
    await act(async () => hook.result.current.stop());
    expect(onFinal).toHaveBeenCalledWith("second try");
    expect(hook.result.current.state).toBe("idle");
  });

  it.each([
    ["NotAllowedError", "permission-denied"],
    ["NotFoundError", "no-microphone"],
    ["NotReadableError", "microphone-busy"],
    ["SomethingElse", "recording-failed"],
  ])("getUserMedia %s becomes %s", async (name, failure) => {
    world.gate.reject = { name };
    const hook = renderHook(() => useRecordedSpeech({ transcribe: vi.fn() }));
    act(() => hook.result.current.start());
    await flush();
    expect(hook.result.current.state).toBe("failed");
    expect(hook.result.current.failure).toBe(failure);
    world.gate.reject = null;
    act(() => hook.result.current.start());
    await flush();
    expect(hook.result.current.state).toBe("recording");
  });

  it("a recorder that cannot be built fails and releases the microphone", async () => {
    vi.stubGlobal("MediaRecorder", Object.assign(function Broken() {
      throw new Error("no");
    }, { isTypeSupported: () => true }));
    const hook = renderHook(() => useRecordedSpeech({ transcribe: vi.fn() }));
    act(() => hook.result.current.start());
    await flush();
    expect(hook.result.current.failure).toBe("recording-failed");
    expect(world.tracks[0].stop).toHaveBeenCalled();
  });

  it("releases the microphone and adds nothing when unmounted while recording", async () => {
    const transcribe = vi.fn(async () => "x");
    const hook = await recording({ transcribe });
    hook.unmount();
    expect(world.tracks[0].stop).toHaveBeenCalled();
    expect(transcribe).not.toHaveBeenCalled();
  });

  it("drops a pending transcription when unmounted", async () => {
    let finish: (text: string) => void = () => undefined;
    const onFinal = vi.fn();
    const hook = await recording({ transcribe: () => new Promise<string>((resolve) => (finish = resolve)), onFinal });
    act(() => hook.result.current.stop());
    hook.unmount();
    await act(async () => finish("late"));
    expect(onFinal).not.toHaveBeenCalled();
  });
});

describe("useSpeechInput with transcribe", () => {
  it("delegates to the recorder, and start does nothing while a disabledReason is set", async () => {
    const hook = renderHook((props: { reason: string | null }) => useSpeechInput({ transcribe: vi.fn(), disabledReason: props.reason }), { initialProps: { reason: "On a call" as string | null } });
    expect(hook.result.current.supported).toBe(true);
    expect(hook.result.current.disabledReason).toBe("On a call");
    act(() => hook.result.current.start());
    await flush();
    expect(world.getUserMedia).not.toHaveBeenCalled();
    hook.rerender({ reason: null });
    act(() => hook.result.current.start());
    await flush();
    expect(hook.result.current.listening).toBe(true);
    expect(hook.result.current.recorded?.state).toBe("recording");
  });

  it("without transcribe it has no recorder and behaves as before", () => {
    const hook = renderHook(() => useSpeechInput());
    expect(hook.result.current.recorded).toBeNull();
    expect(hook.result.current.supported).toBe(false);
  });
});
