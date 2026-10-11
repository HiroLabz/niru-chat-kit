import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { createFakeVoiceSession } from "../../core/voice/fake-voice-session";
import { summariseCall } from "../../core/voice/voice-summary";
import { CallCard } from "./call-card";
import { CallStrip } from "./call-strip";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("CallStrip", () => {
  it("says what the call is doing in the one live region and counts the time", () => {
    const session = createFakeVoiceSession();
    render(<CallStrip session={session} agentName="Niru" userName="Kio" />);
    expect(screen.getByRole("status")).toHaveTextContent("The mic is yours, Kio");
    expect(screen.getByTestId("call-strip-time")).toHaveTextContent("0:00");
    act(() => void vi.advanceTimersByTime(65_000));
    expect(screen.getByTestId("call-strip-time")).toHaveTextContent("1:05");
    act(() => session.script.setPhase("speaking"));
    expect(screen.getByRole("status")).toHaveTextContent("Niru is talking");
  });

  it("lines its content up from the left, with a round level orb first, not centred", () => {
    const session = createFakeVoiceSession();
    render(<CallStrip session={session} onExpand={() => undefined} />);
    const body = screen.getByRole("button", { name: "Open call" });
    expect(getComputedStyle(body).justifyContent).toBe("flex-start");
    const orb = screen.getByTestId("call-strip-pill");
    expect(body.firstElementChild).toBe(orb);
    expect(getComputedStyle(orb).borderRadius).toBe("50%");
    expect(getComputedStyle(orb).width).toBe(getComputedStyle(orb).height);
  });

  it("mutes, ends, and expands", () => {
    const session = createFakeVoiceSession();
    const onExpand = vi.fn();
    render(<CallStrip session={session} onExpand={onExpand} />);
    fireEvent.click(screen.getByRole("button", { name: "Mute microphone" }));
    expect(session.getSnapshot().muted).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Open call" }));
    expect(onExpand).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "End call" }));
    expect(session.getSnapshot().phase).toBe("ended");
    expect(screen.queryByRole("button", { name: "End call" })).toBeNull();
  });

  it("shows camera and screen indicators only while they are on, and no mute without the capability", async () => {
    vi.useRealTimers();
    const session = createFakeVoiceSession({ capabilities: { camera: true, screenShare: true, mute: false } });
    render(<CallStrip session={session} />);
    expect(screen.queryByTestId("call-strip-camera")).toBeNull();
    expect(screen.queryByRole("button", { name: /microphone/i })).toBeNull();
    await act(async () => {
      await session.setCamera(true);
      await session.setScreenShare(true);
    });
    expect(screen.getByTestId("call-strip-camera")).toBeInTheDocument();
    expect(screen.getByTestId("call-strip-screen")).toBeInTheDocument();
  });
});

describe("CallCard", () => {
  const session = () => {
    const fake = createFakeVoiceSession({ now: () => 1000 });
    fake.script.say("user", "What is on today?");
    fake.script.say("agent", "Two meetings.");
    fake.script.say("agent", "and", { final: false });
    return fake;
  };
  const summary = () => ({ ...summariseCall(session().getSnapshot()), durationMs: 247_000 });

  it("shows who, how long, and toggles the transcript with aria-expanded", () => {
    render(<CallCard summary={summary()} agentName="Niru" />);
    expect(screen.getByText("Call with Niru")).toBeInTheDocument();
    expect(screen.getByTestId("call-card-duration")).toHaveTextContent("4:07");
    const toggle = screen.getByRole("button", { name: "Show transcript" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByTestId("call-card-transcript")).toBeNull();
    fireEvent.click(toggle);
    expect(screen.getByRole("button", { name: "Hide transcript" })).toHaveAttribute("aria-expanded", "true");
    const lines = screen.getByTestId("call-card-transcript").querySelectorAll("li");
    expect(Array.from(lines).map((item) => item.textContent)).toEqual(["You: What is on today?", "Niru: Two meetings."]);
  });

  it("says when nothing was said, opens by default on request, and offers Call again", () => {
    const onCallAgain = vi.fn();
    render(<CallCard summary={{ durationMs: 0, transcript: [], startedAt: null, endedAt: null }} defaultOpen onCallAgain={onCallAgain} />);
    expect(screen.getByText("Nothing was said.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Call again" }));
    expect(onCallAgain).toHaveBeenCalled();
  });
});
