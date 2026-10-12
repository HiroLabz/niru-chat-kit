import { describe, expect, it } from "vitest";
import { createFakeVoiceSession } from "./fake-voice-session";

const MICS = [
  { deviceId: "a", label: "Built-in" },
  { deviceId: "b", label: "USB" },
];

describe("fake voice session microphones", () => {
  it("has no microphone members unless asked, so existing adapters and screens see no picker", () => {
    const session = createFakeVoiceSession();
    expect(session.selectMicrophone).toBeUndefined();
    expect(session.getSnapshot().microphones).toBeUndefined();
    expect(session.getSnapshot().microphoneId).toBeUndefined();
  });

  it("lists microphones, selects one and records the call", () => {
    const session = createFakeVoiceSession({ microphones: MICS, microphoneId: "a" });
    expect(session.getSnapshot().microphones).toEqual(MICS);
    session.selectMicrophone?.("b");
    expect(session.getSnapshot().microphoneId).toBe("b");
    expect(session.calls).toEqual(["selectMicrophone(b)"]);
  });

  it("ignores a device that is not listed, and follows the script's list", () => {
    const session = createFakeVoiceSession({ microphones: MICS });
    expect(session.getSnapshot().microphoneId).toBeNull();
    session.selectMicrophone?.("zzz");
    expect(session.getSnapshot().microphoneId).toBeNull();
    session.script.setMicrophones([MICS[1]]);
    expect(session.getSnapshot().microphones).toEqual([MICS[1]]);
  });
});
