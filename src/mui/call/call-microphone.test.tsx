import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { createFakeVoiceSession } from "../../core/voice/fake-voice-session";
import type { VoiceMicrophone } from "../../core/voice/voice-types";
import { CallStage } from "./call-stage";
import { CallStrip } from "./call-strip";
import { resetWorld } from "./call-orb-test-kit";

beforeEach(() => resetWorld());

const MICS: VoiceMicrophone[] = [
  { deviceId: "built-in", label: "Built-in Microphone" },
  { deviceId: "usb", label: "USB Headset" },
];
const caret = () => screen.getByRole("button", { name: "Choose microphone" });

describe("microphone picker on CallStage", () => {
  it("draws nothing new when the session cannot select a microphone", () => {
    render(<CallStage session={createFakeVoiceSession()} />);
    expect(screen.queryByRole("button", { name: "Choose microphone" })).toBeNull();
    expect(screen.getAllByRole("button").map((b) => b.getAttribute("aria-label"))).toEqual(["Turn captions off", "Mute microphone", "End call"]);
  });

  it("puts a labelled caret right after the microphone button and lists the microphones with the current one checked", () => {
    const session = createFakeVoiceSession({ microphones: MICS, microphoneId: "usb" });
    render(<CallStage session={session} />);
    const mute = screen.getByRole("button", { name: "Mute microphone" });
    expect(mute.nextElementSibling).toBe(caret());
    const button = caret();
    expect(button).toHaveAttribute("aria-haspopup", "menu");
    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
    const items = screen.getAllByRole("menuitemradio");
    expect(items.map((i) => i.textContent)).toEqual(["Built-in Microphone", "USB Headset"]);
    expect(items[0]).toHaveAttribute("aria-checked", "false");
    expect(items[1]).toHaveAttribute("aria-checked", "true");
  });

  it("selects through the session, closes the menu and follows the new state", () => {
    const session = createFakeVoiceSession({ microphones: MICS });
    render(<CallStage session={session} />);
    fireEvent.click(caret());
    fireEvent.click(screen.getByRole("menuitemradio", { name: "USB Headset" }));
    expect(session.calls).toContain("selectMicrophone(usb)");
    expect(session.getSnapshot().microphoneId).toBe("usb");
    fireEvent.click(caret());
    expect(screen.getByRole("menuitemradio", { name: "USB Headset" })).toHaveAttribute("aria-checked", "true");
  });

  it("is shown for a single microphone so the person can see which is in use", () => {
    const session = createFakeVoiceSession({ microphones: [MICS[0]], microphoneId: "built-in" });
    render(<CallStage session={session} />);
    fireEvent.click(caret());
    expect(screen.getAllByRole("menuitemradio")).toHaveLength(1);
    expect(screen.getByRole("menuitemradio")).toHaveAttribute("aria-checked", "true");
  });

  it("shows one disabled row when no microphone is found", () => {
    render(<CallStage session={createFakeVoiceSession({ microphones: [] })} />);
    fireEvent.click(caret());
    expect(screen.queryByRole("menuitemradio")).toBeNull();
    const row = screen.getByRole("menuitem", { name: "No microphone found" });
    expect(row).toHaveAttribute("aria-disabled", "true");
  });

  it("works from props alone: onSelectMicrophone, microphones and microphoneId override the session", () => {
    const onSelectMicrophone = vi.fn();
    render(<CallStage session={createFakeVoiceSession()} microphones={MICS} microphoneId="built-in" onSelectMicrophone={onSelectMicrophone} />);
    fireEvent.click(caret());
    expect(screen.getByRole("menuitemradio", { name: "Built-in Microphone" })).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByRole("menuitemradio", { name: "USB Headset" }));
    expect(onSelectMicrophone).toHaveBeenCalledWith("usb");
  });

  it("does not call back for the microphone already in use", () => {
    const onSelectMicrophone = vi.fn();
    render(<CallStage session={createFakeVoiceSession()} microphones={MICS} microphoneId="usb" onSelectMicrophone={onSelectMicrophone} />);
    fireEvent.click(caret());
    fireEvent.click(screen.getByRole("menuitemradio", { name: "USB Headset" }));
    expect(onSelectMicrophone).not.toHaveBeenCalled();
  });

  it("gives an unnamed device a fallback name, and takes its words from the call labels", () => {
    render(
      <CallStage
        session={createFakeVoiceSession()}
        microphones={[{ deviceId: "x", label: "" }]}
        onSelectMicrophone={() => undefined}
        labels={{ chooseMicrophone: "Pick a mic", unnamedMicrophone: "Mic" }}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Pick a mic" }));
    expect(screen.getByRole("menuitemradio")).toHaveTextContent("Mic");
  });

  it("follows the list as devices come and go", () => {
    const session = createFakeVoiceSession({ microphones: [MICS[0]] });
    render(<CallStage session={session} />);
    act(() => session.script.setMicrophones(MICS));
    fireEvent.click(caret());
    expect(screen.getAllByRole("menuitemradio")).toHaveLength(2);
  });

  it("is reachable by keyboard: Tab order, Enter opens, arrows move, Escape closes without minimising or muting", () => {
    const session = createFakeVoiceSession({ microphones: MICS, microphoneId: "built-in" });
    const onMinimise = vi.fn();
    render(<CallStage session={session} onMinimise={onMinimise} />);
    caret().focus();
    expect(caret()).toHaveFocus();
    fireEvent.click(caret());
    const menu = screen.getByRole("menu", { name: "Choose microphone" });
    const first = within(menu).getByRole("menuitemradio", { name: "Built-in Microphone" });
    expect(first).toHaveFocus();
    fireEvent.keyDown(first, { key: "ArrowDown" });
    expect(within(menu).getByRole("menuitemradio", { name: "USB Headset" })).toHaveFocus();
    fireEvent.keyDown(menu, { key: " " });
    expect(session.getSnapshot().muted).toBe(false);
    fireEvent.keyDown(menu, { key: "Escape" });
    expect(onMinimise).not.toHaveBeenCalled();
  });
});

describe("minimise and return", () => {
  it("renders a labelled minimise button only when onMinimise is given, and it calls it", () => {
    const session = createFakeVoiceSession();
    const { rerender } = render(<CallStage session={session} />);
    expect(screen.queryByRole("button", { name: "Minimise call" })).toBeNull();
    const onMinimise = vi.fn();
    rerender(<CallStage session={session} onMinimise={onMinimise} />);
    fireEvent.click(screen.getByRole("button", { name: "Minimise call" }));
    expect(onMinimise).toHaveBeenCalledTimes(1);
  });

  it("CallStrip has a body button that returns to the call, with a label you can change", () => {
    const onExpand = vi.fn();
    const { rerender } = render(<CallStrip session={createFakeVoiceSession()} onExpand={onExpand} />);
    fireEvent.click(screen.getByRole("button", { name: "Open call" }));
    expect(onExpand).toHaveBeenCalledTimes(1);
    rerender(<CallStrip session={createFakeVoiceSession()} onExpand={onExpand} labels={{ openCall: "Return to call" }} />);
    expect(screen.getByRole("button", { name: "Return to call" })).toBeInTheDocument();
  });
});

describe("microphone picker on CallStrip", () => {
  it("draws nothing new without a way to select", () => {
    render(<CallStrip session={createFakeVoiceSession()} />);
    expect(screen.queryByRole("button", { name: "Choose microphone" })).toBeNull();
  });

  it("opens the same menu while the call is minimised, and selects", () => {
    const session = createFakeVoiceSession({ microphones: MICS, microphoneId: "built-in" });
    render(<CallStrip session={session} onExpand={() => undefined} />);
    fireEvent.click(caret());
    expect(screen.getByRole("menuitemradio", { name: "Built-in Microphone" })).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByRole("menuitemradio", { name: "USB Headset" }));
    expect(session.getSnapshot().microphoneId).toBe("usb");
  });

  it("lists no microphone as one disabled row, and hides the caret when the call is over", () => {
    const session = createFakeVoiceSession({ microphones: [] });
    render(<CallStrip session={session} />);
    fireEvent.click(caret());
    expect(screen.getByRole("menuitem", { name: "No microphone found" })).toHaveAttribute("aria-disabled", "true");
    fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });
    act(() => session.end());
    expect(screen.queryByRole("button", { name: "Choose microphone" })).toBeNull();
  });
});
