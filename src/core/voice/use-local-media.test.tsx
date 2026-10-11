import { describe, expect, it } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { fakeMediaDevices } from "./media-test-kit";
import { useLocalMedia } from "./use-local-media";

describe("useLocalMedia", () => {
  it("exposes the preview streams and stops every track when the component unmounts", async () => {
    const fake = fakeMediaDevices();
    const { result, unmount } = renderHook(() => useLocalMedia({ mediaDevices: fake.devices }));
    expect(result.current.supported).toEqual({ camera: true, screen: true });
    await act(async () => {
      await result.current.startCamera();
      await result.current.startScreen();
    });
    await waitFor(() => expect(result.current.camera).not.toBeNull());
    expect(result.current.screen).not.toBeNull();
    unmount();
    expect(fake.streams[0].track.stop).toHaveBeenCalledTimes(1);
    expect(fake.streams[1].track.stop).toHaveBeenCalledTimes(1);
  });

  it("stops on stopAll", async () => {
    const fake = fakeMediaDevices();
    const { result } = renderHook(() => useLocalMedia({ mediaDevices: fake.devices }));
    await act(async () => {
      await result.current.startCamera();
    });
    act(() => result.current.stopAll());
    expect(fake.streams[0].track.stop).toHaveBeenCalled();
    expect(result.current.camera).toBeNull();
  });
});
