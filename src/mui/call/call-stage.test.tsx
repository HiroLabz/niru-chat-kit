import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { createFakeVoiceSession, type FakeVoiceSession, type FakeVoiceSessionOptions } from "../../core/voice/fake-voice-session";
import { createLocalMedia } from "../../core/voice/local-media";
import { fakeMediaDevices } from "../../core/voice/media-test-kit";
import { CallStage, type CallStageProps } from "./call-stage";
import { resetWorld, stubWebGl } from "./call-orb-test-kit";

beforeEach(() => resetWorld());
afterEach(() => vi.unstubAllGlobals());

function setup(options: FakeVoiceSessionOptions = {}, props: Partial<CallStageProps> = {}) {
  const session = createFakeVoiceSession(options);
  const view = render(<CallStage session={session} user={{ name: "Kio" }} agent={{ name: "Niru" }} {...props} />);
  return { session, ...view };
}

const line = () => screen.getByTestId("call-status-line");

describe("CallStage status line, one per state", () => {
  const cases: Array<[string, FakeVoiceSessionOptions, string]> = [
    ["connecting (joining)", { phase: "connecting" }, "Joining the call"],
    ["connecting (connecting)", { phase: "connecting", step: "connecting" }, "Connecting"],
    ["connecting (microphone)", { phase: "connecting", step: "microphone" }, "Waiting for your microphone"],
    ["connecting (audio)", { phase: "connecting", step: "audio" }, "Setting up sound"],
    ["connecting (ready)", { phase: "connecting", step: "ready" }, "Ready"],
    ["listening", { phase: "listening" }, "The mic is yours, Kio"],
    ["listening, muted", { phase: "listening", muted: true }, "Your mic is off"],
    ["thinking", { phase: "thinking" }, "Thinking"],
    ["speaking", { phase: "speaking" }, "Niru is talking"],
    ["held", { phase: "held", capabilities: { hold: true } }, "Call on hold"],
  ];
  it.each(cases)("%s", (_name, options, text) => {
    setup(options);
    expect(line()).toHaveTextContent(text);
  });

  it("follows the session as it changes", () => {
    const { session } = setup();
    act(() => session.script.setPhase("thinking"));
    expect(line()).toHaveTextContent("Thinking");
    act(() => session.script.setPhase("speaking"));
    expect(line()).toHaveTextContent("Niru is talking");
    act(() => session.setMuted(true));
    expect(screen.getByTestId("call-stage")).toHaveAttribute("data-phase", "speaking");
  });

  it("drops the comma when there is no name, and takes custom labels per state", () => {
    const session = createFakeVoiceSession();
    render(<CallStage session={session} labels={{ speaking: "{agent} speaks", thinking: "Hmm" }} agent={{ name: "Niru" }} />);
    expect(line()).toHaveTextContent(/^The mic is yours$/);
    act(() => session.script.setPhase("speaking"));
    expect(line()).toHaveTextContent("Niru speaks");
    act(() => session.script.setPhase("thinking"));
    expect(line()).toHaveTextContent("Hmm");
  });

  it("has exactly one live region, and captions are not one", () => {
    const { session, container } = setup();
    act(() => void session.script.say("agent", "Hello there"));
    expect(container.querySelectorAll('[role="status"], [aria-live], [role="alert"]')).toHaveLength(1);
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
    expect(within(screen.getByTestId("call-captions")).getByText("Hello there")).toBeInTheDocument();
  });
});

describe("CallStage controls follow the session's capabilities", () => {
  it("shows only mute, captions and end by default", () => {
    setup();
    expect(screen.getByRole("button", { name: "Mute microphone" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "End call" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Turn captions off" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /camera/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /screen/i })).toBeNull();
    expect(screen.queryByRole("button", { name: "Hold call" })).toBeNull();
    expect(screen.getByTestId("voice-level-pill")).toBeInTheDocument();
  });

  it("shows camera, share, hold, and drops mute and captions when the session says so", () => {
    setup({ capabilities: { camera: true, screenShare: true, hold: true, mute: false, captions: false } });
    expect(screen.getByRole("button", { name: "Turn on camera" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Share your screen" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Hold call" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /microphone/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /captions/i })).toBeNull();
    expect(screen.getByRole("button", { name: "End call" })).toBeInTheDocument();
  });

  it("reacts when capabilities appear later", () => {
    const { session } = setup();
    expect(screen.queryByRole("button", { name: /camera/i })).toBeNull();
    act(() => session.script.setCapabilities({ camera: true }));
    expect(screen.getByRole("button", { name: "Turn on camera" })).toBeInTheDocument();
  });

  it("end needs no confirmation and shows the ended screen", () => {
    const { session } = setup();
    fireEvent.click(screen.getByRole("button", { name: "End call" }));
    expect(session.calls).toContain("end");
    expect(screen.getByRole("alert")).toHaveTextContent("Call ended");
    expect(screen.queryByTestId("call-controls")).toBeNull();
  });

  it("uses the orb instead of the pill with visual=orb", () => {
    stubWebGl(null);
    setup({}, { visual: "orb" });
    expect(screen.queryByTestId("voice-level-pill")).toBeNull();
    expect(screen.getByTestId("call-orb")).toBeInTheDocument();
  });
});

describe("CallStage mute, captions and keyboard", () => {
  it("toggles mute from the button and from Space, but Space on a button still presses that button", () => {
    const { session } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Mute microphone" }));
    expect(session.getSnapshot().muted).toBe(true);
    expect(screen.getByRole("button", { name: "Unmute microphone" })).toBeInTheDocument();
    const stage = screen.getByTestId("call-stage");
    fireEvent.keyDown(stage, { key: " " });
    expect(session.getSnapshot().muted).toBe(false);
    fireEvent.keyDown(screen.getByRole("button", { name: "End call" }), { key: " " });
    expect(session.getSnapshot().muted).toBe(false);
    expect(session.getSnapshot().phase).toBe("listening");
  });

  it("takes focus on mount so the shortcuts work at once", () => {
    setup();
    expect(screen.getByTestId("call-stage")).toHaveFocus();
  });

  it("Escape minimises only when the app supplies onMinimise", () => {
    const onMinimise = vi.fn();
    const first = setup();
    fireEvent.keyDown(screen.getByTestId("call-stage"), { key: "Escape" });
    expect(onMinimise).not.toHaveBeenCalled();
    first.unmount();
    setup({}, { onMinimise });
    fireEvent.keyDown(screen.getByTestId("call-stage"), { key: "Escape" });
    expect(onMinimise).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Minimise call" }));
    expect(onMinimise).toHaveBeenCalledTimes(2);
  });

  it("toggles captions: the icon changes with a slash when off and the lines hide", () => {
    const { session, container } = setup();
    session.script.say("agent", "Good morning");
    act(() => session.script.say("user", "Hi"));
    expect(container.querySelector('[data-testid="ClosedCaptionIcon"]')).not.toBeNull();
    expect(screen.getByTestId("call-captions")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Turn captions off" }));
    expect(session.getSnapshot().captions).toBe(false);
    expect(container.querySelector('[data-testid="ClosedCaptionDisabledIcon"]')).not.toBeNull();
    expect(screen.queryByTestId("call-captions")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Turn captions on" }));
    expect(screen.getByTestId("call-captions")).toHaveTextContent("Hi");
  });

  it("shows the latest two lines, the newest larger, interim lines marked", () => {
    const { session } = setup();
    act(() => {
      session.script.say("user", "one");
      session.script.say("agent", "two");
      session.script.say("user", "thr", { final: false });
    });
    const shown = within(screen.getByTestId("call-captions")).getAllByText(/./);
    expect(shown.map((node) => node.textContent)).toEqual(["two", "thr"]);
    expect(shown[1]).toHaveAttribute("data-final", "false");
  });

  it("renders the menu and avatar slots", () => {
    setup({}, { menu: <button>Open menu</button>, user: { name: "Kio", avatar: <span>KP</span> } });
    expect(screen.getByRole("button", { name: "Open menu" })).toBeInTheDocument();
    expect(screen.getByText("KP")).toBeInTheDocument();
  });
});

describe("CallStage problems", () => {
  it("microphone blocked: a screen with Try again that calls the session again", () => {
    const { session } = setup();
    act(() => session.script.fail("microphone-blocked"));
    expect(screen.getByRole("alert")).toHaveTextContent("The microphone is blocked");
    expect(screen.queryByTestId("call-controls")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(session.calls).toContain("retry");
    expect(session.getSnapshot().phase).toBe("connecting");
  });

  it("audio blocked: Tap to hear stays on the call and clears itself", () => {
    const { session } = setup();
    act(() => session.script.fail("audio-blocked"));
    expect(screen.getByTestId("call-controls")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Tap to hear" }));
    expect(session.calls).toContain("startAudio");
    return Promise.resolve().then(() => expect(screen.queryByRole("button", { name: "Tap to hear" })).toBeNull());
  });

  it("connection lost: Call again", () => {
    vi.useFakeTimers();
    const { session } = setup();
    act(() => session.script.fail("connection-lost"));
    expect(screen.getByRole("alert")).toHaveTextContent("Connection lost");
    fireEvent.click(screen.getByRole("button", { name: "Call again" }));
    expect(line()).toHaveTextContent("Joining the call");
    act(() => void vi.advanceTimersByTime(400));
    expect(line()).toHaveTextContent("The mic is yours, Kio");
    vi.useRealTimers();
  });

  it("ended: Call again uses onCallAgain when given, and Close calls onClose", () => {
    const onCallAgain = vi.fn();
    const onClose = vi.fn();
    setup({ phase: "ended" }, { onCallAgain, onClose });
    expect(screen.getByRole("alert")).toHaveTextContent("Call ended");
    fireEvent.click(screen.getByRole("button", { name: "Call again" }));
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onCallAgain).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("held: shows Resume, which resumes", () => {
    const { session } = setup({ capabilities: { hold: true } });
    fireEvent.click(screen.getByRole("button", { name: "Hold call" }));
    expect(session.getSnapshot().phase).toBe("held");
    fireEvent.click(screen.getByRole("button", { name: "Resume" }));
    expect(session.getSnapshot().phase).toBe("listening");
  });
});

describe("CallStage camera and screen share", () => {
  function withMedia(options: FakeVoiceSessionOptions = {}) {
    const fake = fakeMediaDevices();
    const media = createLocalMedia({ mediaDevices: fake.devices });
    const view = setup({ capabilities: { camera: true, screenShare: true, hold: true }, media, ...options });
    return { fake, media, ...view };
  }
  const flush = () => act(async () => void (await Promise.resolve()));

  it("shows the local camera preview behind the status, and turns it off", async () => {
    const { fake, session } = withMedia();
    fireEvent.click(screen.getByRole("button", { name: "Turn on camera" }));
    await flush();
    const preview = screen.getByTestId("call-preview");
    expect(preview).toHaveAttribute("data-source", "camera");
    expect((preview.querySelector("video") as HTMLVideoElement).srcObject).toBe(fake.streams[0].stream);
    expect(screen.getByRole("button", { name: "Turn off camera" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Turn off camera" }));
    await flush();
    expect(screen.queryByTestId("call-preview")).toBeNull();
    expect(fake.streams[0].track.stop).toHaveBeenCalled();
    expect(session.getSnapshot().cameraOn).toBe(false);
  });

  it("shows the Sharing your screen chip with a stop control", async () => {
    const { fake, session } = withMedia();
    fireEvent.click(screen.getByRole("button", { name: "Share your screen" }));
    await flush();
    const chip = screen.getByTestId("call-sharing-chip");
    expect(chip).toHaveTextContent("Sharing your screen");
    fireEvent.click(within(chip).getByRole("button", { name: "Stop" }));
    await flush();
    expect(screen.queryByTestId("call-sharing-chip")).toBeNull();
    expect(fake.streams[0].track.stop).toHaveBeenCalled();
    expect(session.getSnapshot().screenOn).toBe(false);
  });

  it("switches both off when the call is held", async () => {
    const { fake, session } = withMedia();
    fireEvent.click(screen.getByRole("button", { name: "Turn on camera" }));
    fireEvent.click(screen.getByRole("button", { name: "Share your screen" }));
    await flush();
    fireEvent.click(screen.getByRole("button", { name: "Hold call" }));
    await flush();
    expect(fake.streams.every((entry) => entry.track.stop.mock.calls.length > 0)).toBe(true);
    expect(screen.queryByTestId("call-sharing-chip")).toBeNull();
    expect(screen.queryByTestId("call-preview")).toBeNull();
    expect(session.getSnapshot()).toMatchObject({ cameraOn: false, screenOn: false });
  });

  it("switches both off when the call ends", async () => {
    const { fake } = withMedia();
    fireEvent.click(screen.getByRole("button", { name: "Turn on camera" }));
    await flush();
    fireEvent.click(screen.getByRole("button", { name: "End call" }));
    await flush();
    expect(fake.streams[0].track.stop).toHaveBeenCalled();
  });

  it("says so when the browser refuses", async () => {
    const { fake } = withMedia();
    fake.gate.reject = { name: "NotAllowedError" };
    fireEvent.click(screen.getByRole("button", { name: "Turn on camera" }));
    await flush();
    expect(screen.getByTestId("call-device-error")).toHaveTextContent("blocked access");
    expect(screen.getByRole("button", { name: "Turn on camera" })).toBeInTheDocument();
  });

  it("draws the agent's video when it has one and the camera is off", () => {
    const { session } = withMedia();
    const remote = { getTracks: () => [] } as unknown as MediaStream;
    act(() => session.script.setRemoteVideo(remote));
    expect(screen.getByTestId("call-preview")).toHaveAttribute("data-source", "agent");
  });
});

describe("CallStage reduced motion", () => {
  it("holds the pill and the orb still", () => {
    resetWorld({ reduced: true });
    stubWebGl(null);
    const first = setup();
    expect(screen.getByTestId("voice-level-pill")).toHaveAttribute("data-motion", "still");
    first.unmount();
    setup({}, { visual: "orb" });
    expect(screen.getByTestId("call-orb")).toHaveAttribute("data-orb-motion", "still");
  });

  it("animates both otherwise", () => {
    stubWebGl(null);
    const first = setup();
    expect(screen.getByTestId("voice-level-pill")).toHaveAttribute("data-motion", "animated");
    first.unmount();
    setup({}, { visual: "orb" });
    expect(screen.getByTestId("call-orb")).toHaveAttribute("data-orb-motion", "animated");
  });
});

describe("CallStage compound parts", () => {
  it("composes its own layout from the parts", () => {
    const session: FakeVoiceSession = createFakeVoiceSession();
    render(
      <CallStage session={session}>
        <CallStage.Status />
        <CallStage.Controls />
      </CallStage>
    );
    expect(screen.getByTestId("call-status")).toBeInTheDocument();
    expect(screen.getByTestId("call-controls")).toBeInTheDocument();
    expect(screen.queryByTestId("call-header")).toBeNull();
  });
});
