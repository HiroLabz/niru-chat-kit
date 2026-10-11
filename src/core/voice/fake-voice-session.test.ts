import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeVoiceSession } from "./fake-voice-session";
import { createLocalMedia } from "./local-media";
import { fakeMediaDevices } from "./media-test-kit";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("createFakeVoiceSession", () => {
  it("starts listening with mute and captions only, and notifies on each change", () => {
    const session = createFakeVoiceSession({ now: () => 5 });
    const snapshot = session.getSnapshot();
    expect(snapshot.phase).toBe("listening");
    expect(snapshot.capabilities).toEqual({ mute: true, captions: true, camera: false, screenShare: false, hold: false });
    expect(snapshot.startedAt).toBe(5);
    const listener = vi.fn();
    session.subscribe(listener);
    session.setMuted(true);
    session.setCaptions(false);
    expect(listener).toHaveBeenCalledTimes(2);
    expect(session.getSnapshot()).toMatchObject({ muted: true, captions: false });
    expect(session.getSnapshot()).not.toBe(snapshot);
  });

  it("scripts every phase, the join steps and the transcript", () => {
    const session = createFakeVoiceSession({ phase: "connecting" });
    expect(session.getSnapshot()).toMatchObject({ phase: "connecting", step: "joining", startedAt: null });
    for (const phase of ["listening", "thinking", "speaking"] as const) {
      session.script.setPhase(phase);
      expect(session.getSnapshot()).toMatchObject({ phase, step: null });
    }
    session.script.setPhase("connecting", "microphone");
    expect(session.getSnapshot().step).toBe("microphone");
    const id = session.script.say("agent", "Hel", { final: false });
    session.script.say("agent", "Hello", { id });
    expect(session.getSnapshot().transcript).toMatchObject([{ id, text: "Hello", final: true }]);
    const second = session.script.say("user", "Hi", { final: false });
    session.script.settle(second, "Hi there");
    expect(session.getSnapshot().transcript.at(-1)).toMatchObject({ text: "Hi there", final: true });
  });

  it("serves scripted levels", () => {
    const session = createFakeVoiceSession();
    session.script.setLevels({ you: 0.4 });
    session.script.setLevels({ agent: 0.9 });
    expect(session.levels.get()).toEqual({ you: 0.4, agent: 0.9 });
  });

  it("ignores camera and screen requests unless the capability is set", async () => {
    const session = createFakeVoiceSession();
    await session.setCamera(true);
    await session.setScreenShare(true);
    expect(session.getSnapshot()).toMatchObject({ cameraOn: false, screenOn: false });
    session.script.setCapabilities({ camera: true, screenShare: true });
    await session.setCamera(true);
    await session.setScreenShare(true);
    expect(session.getSnapshot()).toMatchObject({ cameraOn: true, screenOn: true });
  });

  it("holds and resumes, switching real previews off on hold and on end", async () => {
    const fake = fakeMediaDevices();
    const media = createLocalMedia({ mediaDevices: fake.devices });
    const session = createFakeVoiceSession({ capabilities: { camera: true, screenShare: true, hold: true }, media });
    await session.setCamera(true);
    await session.setScreenShare(true);
    expect(session.getSnapshot().localVideo).toBe(fake.streams[0].stream);
    session.script.setPhase("speaking");
    session.hold();
    expect(session.getSnapshot()).toMatchObject({ phase: "held", cameraOn: false, screenOn: false, localVideo: null, localScreen: null });
    expect(fake.streams[0].track.stop).toHaveBeenCalled();
    expect(fake.streams[1].track.stop).toHaveBeenCalled();
    await session.setCamera(true);
    expect(session.getSnapshot().cameraOn).toBe(false);
    session.resume();
    expect(session.getSnapshot().phase).toBe("speaking");
    await session.setCamera(true);
    expect(fake.streams).toHaveLength(3);
    session.end();
    expect(session.getSnapshot()).toMatchObject({ phase: "ended", cameraOn: false });
    expect(fake.streams[2].track.stop).toHaveBeenCalled();
  });

  it("stops a camera that finished starting after the call was held", async () => {
    const fake = fakeMediaDevices();
    let release!: () => void;
    fake.gate.hold = new Promise<void>((resolve) => (release = resolve));
    const session = createFakeVoiceSession({ capabilities: { camera: true, hold: true }, media: createLocalMedia({ mediaDevices: fake.devices }) });
    const pending = session.setCamera(true);
    session.hold();
    release();
    await pending;
    expect(session.getSnapshot().cameraOn).toBe(false);
    expect(fake.streams[0].track.stop).toHaveBeenCalled();
  });

  it("surfaces a device failure and clears it on the next good request", async () => {
    const session = createFakeVoiceSession({ capabilities: { camera: true } });
    session.script.failDevices("denied");
    await session.setCamera(true);
    expect(session.getSnapshot()).toMatchObject({ cameraOn: false, deviceError: { device: "camera", reason: "denied" } });
    session.script.failDevices(null);
    await session.setCamera(true);
    expect(session.getSnapshot()).toMatchObject({ cameraOn: true, deviceError: null });
  });

  it("raises problems: audio blocked keeps the call, microphone and connection fail it, retry and startAudio recover", async () => {
    const session = createFakeVoiceSession();
    session.script.fail("audio-blocked");
    expect(session.getSnapshot()).toMatchObject({ phase: "listening", problem: "audio-blocked" });
    await session.startAudio();
    expect(session.getSnapshot().problem).toBeNull();
    session.script.fail("microphone-blocked");
    expect(session.getSnapshot()).toMatchObject({ phase: "failed", problem: "microphone-blocked" });
    session.retry();
    expect(session.getSnapshot()).toMatchObject({ phase: "connecting", problem: null });
    vi.advanceTimersByTime(400);
    expect(session.getSnapshot().phase).toBe("listening");
    session.script.fail("connection-lost");
    expect(session.getSnapshot()).toMatchObject({ phase: "failed", problem: "connection-lost" });
  });

  it("plays timed steps and cancels them", () => {
    const session = createFakeVoiceSession({ phase: "connecting" });
    const cancel = session.script.play([
      { at: 10, phase: "listening" },
      { at: 20, say: { speaker: "user", text: "Hello" } },
      { at: 30, levels: { you: 0.5 } },
      { at: 40, phase: "speaking" },
    ]);
    vi.advanceTimersByTime(35);
    expect(session.getSnapshot()).toMatchObject({ phase: "listening" });
    expect(session.getSnapshot().transcript).toHaveLength(1);
    expect(session.levels.get().you).toBe(0.5);
    cancel();
    vi.advanceTimersByTime(100);
    expect(session.getSnapshot().phase).toBe("listening");
  });

  it("restarts a call that ended with an empty transcript, and records calls", () => {
    const session = createFakeVoiceSession();
    session.script.say("user", "Hi");
    session.end();
    session.end();
    session.retry();
    expect(session.getSnapshot().transcript).toEqual([]);
    expect(session.calls).toContain("end");
    expect(session.calls).toContain("retry");
  });

  it("moves its levels like a voice while simulating", () => {
    const session = createFakeVoiceSession({ phase: "speaking" });
    session.script.simulateLevels(true);
    vi.advanceTimersByTime(500);
    expect(session.levels.get().agent).toBeGreaterThan(0);
    session.script.stop();
    const stopped = session.levels.get().agent;
    vi.advanceTimersByTime(500);
    expect(session.levels.get().agent).toBe(stopped);
  });
});
