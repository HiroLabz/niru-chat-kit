import { describe, expect, it, vi } from "vitest";
import { createLocalMedia } from "./local-media";
import { fakeMediaDevices } from "./media-test-kit";

describe("createLocalMedia", () => {
  it("starts the camera and screen as local streams and says what the browser supports", async () => {
    const fake = fakeMediaDevices();
    const media = createLocalMedia({ mediaDevices: fake.devices });
    expect(media.getSnapshot().supported).toEqual({ camera: true, screen: true });
    expect(await media.startCamera()).toBe(true);
    expect(await media.startScreen()).toBe(true);
    const now = media.getSnapshot();
    expect(now.camera).toBe(fake.streams[0].stream);
    expect(now.screen).toBe(fake.streams[1].stream);
    expect(fake.devices.getUserMedia).toHaveBeenCalledWith({ video: { facingMode: "user" }, audio: false });
    expect(fake.devices.getDisplayMedia).toHaveBeenCalledWith({ video: true, audio: false });
  });

  it("detects features: no mediaDevices means unavailable, with no throw", async () => {
    const media = createLocalMedia({ mediaDevices: null });
    expect(media.getSnapshot().supported).toEqual({ camera: false, screen: false });
    expect(await media.startCamera()).toBe(false);
    expect(media.getSnapshot().error).toEqual({ device: "camera", reason: "unavailable" });
    const partial = createLocalMedia({ mediaDevices: fakeMediaDevices({ screen: false }).devices });
    expect(partial.getSnapshot().supported).toEqual({ camera: true, screen: false });
  });

  it("stops every track on stopCamera, stopScreen and stopAll", async () => {
    const fake = fakeMediaDevices();
    const media = createLocalMedia({ mediaDevices: fake.devices });
    await media.startCamera();
    await media.startScreen();
    media.stopCamera();
    expect(fake.streams[0].track.stop).toHaveBeenCalledTimes(1);
    expect(media.getSnapshot().camera).toBeNull();
    expect(media.getSnapshot().screen).not.toBeNull();
    media.stopAll();
    expect(fake.streams[1].track.stop).toHaveBeenCalledTimes(1);
    expect(media.getSnapshot().screen).toBeNull();
  });

  it("reports a refusal as denied and anything else as unavailable", async () => {
    const fake = fakeMediaDevices();
    const media = createLocalMedia({ mediaDevices: fake.devices });
    fake.gate.reject = { name: "NotAllowedError" };
    expect(await media.startScreen()).toBe(false);
    expect(media.getSnapshot().error).toEqual({ device: "screen", reason: "denied" });
    fake.gate.reject = { name: "NotFoundError" };
    expect(await media.startCamera()).toBe(false);
    expect(media.getSnapshot().error).toEqual({ device: "camera", reason: "unavailable" });
  });

  it("stops a stream that arrives after its stop was asked for", async () => {
    const fake = fakeMediaDevices();
    let release!: () => void;
    fake.gate.hold = new Promise<void>((resolve) => (release = resolve));
    const media = createLocalMedia({ mediaDevices: fake.devices });
    const pending = media.startCamera();
    media.stopAll();
    release();
    expect(await pending).toBe(false);
    expect(fake.streams[0].track.stop).toHaveBeenCalled();
    expect(media.getSnapshot().camera).toBeNull();
  });

  it("clears a share when the browser's own stop-sharing button ends the track", async () => {
    const fake = fakeMediaDevices();
    const media = createLocalMedia({ mediaDevices: fake.devices });
    const listener = vi.fn();
    media.subscribe(listener);
    await media.startScreen();
    listener.mockClear();
    fake.streams[0].track.end();
    expect(media.getSnapshot().screen).toBeNull();
    expect(listener).toHaveBeenCalled();
  });
});
