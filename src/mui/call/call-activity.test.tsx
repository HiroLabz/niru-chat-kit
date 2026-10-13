import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { createFakeVoiceSession, type FakeVoiceSession } from "../../core/voice/fake-voice-session";
import { CallStage } from "./call-stage";
import { CallStrip } from "./call-strip";
import { resetWorld, stubWebGl } from "./call-orb-test-kit";

beforeEach(() => {
  vi.useFakeTimers();
  resetWorld();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const stage = (session: FakeVoiceSession, props: Partial<Parameters<typeof CallStage>[0]> = {}) =>
  render(<CallStage session={session} user={{ name: "Kio" }} agent={{ name: "Niru" }} {...props} />);
const activity = () => screen.queryByTestId("call-activity-line");
const tick = (ms: number) => act(() => void vi.advanceTimersByTime(ms));

describe("CallStage activity line", () => {
  it("shows the app's sentence under Thinking and removes it when the call returns to listening", () => {
    const session = createFakeVoiceSession({ phase: "thinking", activity: "Searching the web" });
    stage(session);
    expect(screen.getByTestId("call-status-line")).toHaveTextContent("Thinking");
    expect(activity()).toHaveTextContent("Searching the web");
    act(() => session.script.setActivity("Making a picture"));
    expect(activity()).toHaveTextContent("Making a picture");
    act(() => session.script.setPhase("listening"));
    expect(activity()).toBeNull();
    expect(screen.getByTestId("call-status-line")).toHaveTextContent("The mic is yours, Kio");
  });

  it("shows nothing new when the snapshot has no activity", () => {
    stage(createFakeVoiceSession({ phase: "thinking" }));
    expect(activity()).toBeNull();
    expect(screen.getByTestId("call-status-line")).toHaveTextContent("Thinking");
  });

  it("the prop wins over the snapshot, and an empty prop hides it", () => {
    const session = createFakeVoiceSession({ phase: "thinking", activity: "From the snapshot" });
    const view = stage(session, { activity: "From the prop" });
    expect(activity()).toHaveTextContent("From the prop");
    view.rerender(<CallStage session={session} activity={null} />);
    expect(activity()).toBeNull();
  });

  it("also shows while speaking when the app still supplies one, never while listening or held", () => {
    const session = createFakeVoiceSession({ phase: "speaking", activity: "Reading your notes", capabilities: { hold: true } });
    stage(session);
    expect(activity()).toHaveTextContent("Reading your notes");
    act(() => session.script.setPhase("listening"));
    expect(activity()).toBeNull();
    act(() => session.script.setPhase("held"));
    expect(activity()).toBeNull();
  });

  it("falls back to Still working on it after eight quiet seconds, and returns to nothing on listening", () => {
    const session = createFakeVoiceSession({ phase: "thinking" });
    stage(session);
    tick(7900);
    expect(activity()).toBeNull();
    tick(200);
    expect(activity()).toHaveTextContent("Still working on it");
    act(() => session.script.setPhase("listening"));
    expect(activity()).toBeNull();
    act(() => session.script.setPhase("thinking"));
    expect(activity()).toBeNull();
    tick(8100);
    expect(activity()).toHaveTextContent("Still working on it");
  });

  it("quietAfterMs changes the wait", () => {
    stage(createFakeVoiceSession({ phase: "thinking" }), { quietAfterMs: 2000 });
    tick(1900);
    expect(activity()).toBeNull();
    tick(200);
    expect(activity()).toHaveTextContent("Still working on it");
  });

  it("shows the app's text as is, however long it stays quiet", () => {
    stage(createFakeVoiceSession({ phase: "thinking", activity: "Searching the web" }));
    tick(60_000);
    expect(activity()).toHaveTextContent(/^Searching the web$/);
  });

  it("the app's text replaces the fallback, and clearing it starts the wait again", () => {
    const session = createFakeVoiceSession({ phase: "thinking" });
    stage(session);
    tick(9000);
    act(() => session.script.setActivity("Making a picture"));
    expect(activity()).toHaveTextContent(/^Making a picture$/);
    act(() => session.script.setActivity(null));
    expect(activity()).toBeNull();
    tick(8100);
    expect(activity()).toHaveTextContent("Still working on it");
  });

  it("takes the fallback from the labels", () => {
    stage(createFakeVoiceSession({ phase: "thinking" }), { labels: { stillWorking: "Hang on, almost there" }, quietAfterMs: 100 });
    tick(200);
    expect(activity()).toHaveTextContent("Hang on, almost there");
  });

  it("is announced in the call's one polite live region, with no second one and no focus change", () => {
    const session = createFakeVoiceSession({ phase: "thinking" });
    const { container } = stage(session, { autoFocus: false });
    const before = document.activeElement;
    act(() => session.script.setActivity("Searching the web"));
    tick(9000);
    expect(container.querySelectorAll('[role="status"], [aria-live], [role="alert"]')).toHaveLength(1);
    expect(screen.getByRole("status")).toContainElement(activity());
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
    expect(document.activeElement).toBe(before);
    expect(activity()?.closest("button, [tabindex]")?.getAttribute("tabindex")).not.toBe("0");
  });

  it("fades in normally and does not animate under reduced motion", () => {
    stage(createFakeVoiceSession({ phase: "thinking", activity: "Searching the web" }));
    expect(activity()).toHaveAttribute("data-motion", "fade");
    resetWorld({ reduced: true });
    document.body.innerHTML = "";
    stage(createFakeVoiceSession({ phase: "thinking", activity: "Searching the web" }));
    expect(activity()).toHaveAttribute("data-motion", "none");
  });

  it("works with the orb visual too", () => {
    stubWebGl(null);
    stage(createFakeVoiceSession({ phase: "thinking", activity: "Searching the web" }), { visual: "orb" });
    expect(activity()).toHaveTextContent("Searching the web");
  });
});

describe("CallStrip activity", () => {
  const strip = () => screen.getByTestId("call-strip-status");

  it("shows the sentence in place of the status, on one line, with the full text as a tooltip", () => {
    const text = "Searching the web for the latest news about something very long indeed";
    const session = createFakeVoiceSession({ phase: "thinking", activity: text });
    render(<CallStrip session={session} />);
    expect(strip()).toHaveTextContent(text);
    expect(strip()).toHaveAttribute("title", text);
    const style = getComputedStyle(strip());
    expect(style.whiteSpace).toBe("nowrap");
    expect(style.textOverflow).toBe("ellipsis");
    expect(screen.getAllByRole("status")).toHaveLength(1);
  });

  it("goes back to the plain status on listening", () => {
    const session = createFakeVoiceSession({ phase: "thinking", activity: "Making a picture" });
    render(<CallStrip session={session} userName="Kio" />);
    act(() => session.script.setPhase("listening"));
    expect(strip()).toHaveTextContent("The mic is yours, Kio");
    expect(strip()).not.toHaveAttribute("title");
  });

  it("keeps Thinking with no activity, then says Still working on it after the quiet time", () => {
    const session = createFakeVoiceSession({ phase: "thinking" });
    render(<CallStrip session={session} />);
    expect(strip()).toHaveTextContent("Thinking");
    tick(7900);
    expect(strip()).toHaveTextContent("Thinking");
    tick(200);
    expect(strip()).toHaveTextContent("Still working on it");
  });

  it("quietAfterMs and the activity prop work, and the prop wins", () => {
    const session = createFakeVoiceSession({ phase: "thinking", activity: "Snapshot text" });
    const view = render(<CallStrip session={session} activity="Prop text" quietAfterMs={500} />);
    expect(strip()).toHaveTextContent("Prop text");
    view.rerender(<CallStrip session={session} activity={null} quietAfterMs={500} />);
    expect(strip()).toHaveTextContent("Thinking");
    tick(600);
    expect(strip()).toHaveTextContent("Still working on it");
  });
});
