import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { installRecorderWorld, removeRecorderWorld } from "../../core/voice/recorder-test-kit";
import { Composer, type ComposerProps } from "./composer";

let world: ReturnType<typeof installRecorderWorld>;
beforeEach(() => {
  vi.useFakeTimers();
  world = installRecorderWorld();
});
afterEach(() => {
  vi.useRealTimers();
  removeRecorderWorld();
});

function Harness(props: Partial<ComposerProps>) {
  const [value, setValue] = useState(props.value ?? "");
  return <Composer onSubmit={vi.fn()} {...props} value={value} onChange={setValue} />;
}

const flush = () => act(async () => void (await vi.advanceTimersByTimeAsync(0)));
const click = async (name: string | RegExp) => {
  fireEvent.click(screen.getByRole("button", { name }));
  await flush();
};
const box = () => screen.getByRole("textbox");

describe("Composer voice that records", () => {
  it("renders nothing new without transcribe, even where the browser can record", () => {
    render(<Harness voice />);
    expect(screen.queryByRole("button", { name: /record|voice/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    render(<Harness voice={{}} />);
    expect(screen.queryByRole("button", { name: /record|voice/i })).not.toBeInTheDocument();
  });

  it("hides the mic where the browser cannot record", () => {
    Reflect.deleteProperty(navigator, "mediaDevices");
    render(<Harness voice={{ transcribe: vi.fn() }} />);
    expect(screen.queryByRole("button", { name: "Record a voice message" })).not.toBeInTheDocument();
  });

  it("records, shows the time and a level, and appends the transcription with the joining rule", async () => {
    const transcribe = vi.fn(async () => "buy milk");
    render(<Harness value="Remember:" voice={{ transcribe }} />);
    await click("Record a voice message");
    expect(screen.getByRole("status")).toHaveTextContent("Recording");
    expect(screen.getByRole("button", { name: "Stop and transcribe" })).toHaveAttribute("aria-pressed", "true");
    act(() => void vi.advanceTimersByTime(3000));
    expect(screen.getByTestId("voice-elapsed")).toHaveTextContent("0:03");
    expect(screen.getByTestId("voice-level")).toBeInTheDocument();
    await click("Stop and transcribe");
    expect(transcribe).toHaveBeenCalledTimes(1);
    expect(box()).toHaveValue("Remember: buy milk");
    expect(screen.getByRole("button", { name: "Record a voice message" })).toBeInTheDocument();
    expect(world.tracks[0].stop).toHaveBeenCalled();
  });

  it("announces each state in one polite live region and the timer is not part of it", async () => {
    let finish: (text: string) => void = () => undefined;
    render(<Harness voice={{ transcribe: () => new Promise<string>((resolve) => (finish = resolve)) }} />);
    const live = screen.getByRole("status");
    expect(live).toHaveAttribute("aria-live", "polite");
    expect(live).toHaveTextContent("");
    await click("Record a voice message");
    expect(live).toHaveTextContent("Recording");
    expect(screen.getByTestId("voice-elapsed")).toHaveAttribute("aria-hidden", "true");
    await click("Stop and transcribe");
    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(live).toHaveTextContent("Turning your voice into text");
    expect(screen.getByRole("button", { name: "Turning your voice into text" })).toBeDisabled();
    await act(async () => finish("done"));
    expect(live).toHaveTextContent("");
  });

  it("Escape while recording stops and transcribes", async () => {
    const transcribe = vi.fn(async () => "from escape");
    render(<Harness voice={{ transcribe }} />);
    await click("Record a voice message");
    await act(async () => void fireEvent.keyDown(window, { key: "Escape" }));
    expect(transcribe).toHaveBeenCalledTimes(1);
    expect(box()).toHaveValue("from escape");
  });

  it("Cancel discards the recording without transcribing", async () => {
    const transcribe = vi.fn(async () => "never");
    render(<Harness value="typed" voice={{ transcribe }} />);
    await click("Record a voice message");
    await click("Cancel recording");
    expect(transcribe).not.toHaveBeenCalled();
    expect(box()).toHaveValue("typed");
    expect(world.tracks[0].stop).toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Cancel recording" })).not.toBeInTheDocument();
  });

  it("stops by itself at maxDurationMs and transcribes", async () => {
    const transcribe = vi.fn(async () => "long speech");
    render(<Harness voice={{ transcribe, maxDurationMs: 4000 }} />);
    await click("Record a voice message");
    await act(async () => void (await vi.advanceTimersByTimeAsync(4100)));
    expect(transcribe).toHaveBeenCalledTimes(1);
    expect(box()).toHaveValue("long speech");
  });

  it("leaves the draft alone and says why when the transcription fails, then can be pressed again", async () => {
    const transcribe = vi.fn().mockRejectedValueOnce(new Error("The speech service is down.")).mockResolvedValueOnce("again");
    render(<Harness value="keep me" voice={{ transcribe }} />);
    await click("Record a voice message");
    await click("Stop and transcribe");
    expect(box()).toHaveValue("keep me");
    expect(screen.getByRole("status")).toHaveTextContent("The speech service is down.");
    expect(world.tracks[0].stop).toHaveBeenCalled();
    await click("Record a voice message");
    await click("Stop and transcribe");
    expect(box()).toHaveValue("keep me again");
    expect(screen.getByRole("status")).toHaveTextContent("");
  });

  it("uses its own words when the app gives no reason", async () => {
    render(<Harness value="keep" voice={{ transcribe: async () => Promise.reject(new Error("")) }} />);
    await click("Record a voice message");
    await click("Stop and transcribe");
    expect(screen.getByRole("status")).toHaveTextContent("Transcription failed. Try again.");
    expect(box()).toHaveValue("keep");
  });

  it("an empty transcription says nothing was heard and adds nothing", async () => {
    render(<Harness value="keep" voice={{ transcribe: async () => " " }} />);
    await click("Record a voice message");
    await click("Stop and transcribe");
    expect(box()).toHaveValue("keep");
    expect(screen.getByRole("status")).toHaveTextContent("Nothing was heard. Try again.");
    expect(screen.getByRole("button", { name: "Record a voice message" })).toBeEnabled();
  });

  it.each([
    ["NotAllowedError", /access was blocked/],
    ["NotFoundError", /No microphone was found/],
    ["NotReadableError", /in use by something else/],
  ])("%s is explained in plain words and leaves the draft", async (name, words) => {
    world.gate.reject = { name };
    render(<Harness value="draft" voice={{ transcribe: vi.fn() }} />);
    await click("Record a voice message");
    expect(screen.getByRole("status")).toHaveTextContent(words);
    expect(box()).toHaveValue("draft");
    world.gate.reject = null;
    await click("Record a voice message");
    expect(screen.getByRole("status")).toHaveTextContent("Recording");
  });

  it("shows the mic disabled with the reason as tooltip text and description, and never records", async () => {
    render(<Harness voice={{ transcribe: vi.fn(), disabledReason: "The microphone is on a call." }} />);
    const mic = screen.getByRole("button", { name: "Record a voice message" });
    expect(mic).toBeDisabled();
    expect(mic).toHaveAccessibleDescription("The microphone is on a call.");
    fireEvent.mouseOver(mic.parentElement as HTMLElement);
    await act(async () => void (await vi.advanceTimersByTimeAsync(1000)));
    expect(screen.getByRole("tooltip")).toHaveTextContent("The microphone is on a call.");
    expect(world.getUserMedia).not.toHaveBeenCalled();
  });

  it("discards a recording in progress when a reason to stay silent appears", async () => {
    const transcribe = vi.fn(async () => "x");
    const { rerender } = render(<Composer value="" onChange={vi.fn()} onSubmit={vi.fn()} voice={{ transcribe }} />);
    await click("Record a voice message");
    rerender(<Composer value="" onChange={vi.fn()} onSubmit={vi.fn()} voice={{ transcribe, disabledReason: "On a call" }} />);
    expect(transcribe).not.toHaveBeenCalled();
    expect(world.tracks[0].stop).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Record a voice message" })).toBeDisabled();
  });

  it("sending discards a recording so its text cannot land in the next draft", async () => {
    const transcribe = vi.fn(async () => "late");
    const onSubmit = vi.fn();
    render(<Harness value="hello" onSubmit={onSubmit} voice={{ transcribe }} />);
    await click("Record a voice message");
    await click("Send");
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(transcribe).not.toHaveBeenCalled();
    expect(world.tracks[0].stop).toHaveBeenCalled();
  });

  it("releases the microphone on unmount", async () => {
    const view = render(<Harness voice={{ transcribe: vi.fn() }} />);
    await click("Record a voice message");
    view.unmount();
    expect(world.tracks[0].stop).toHaveBeenCalled();
  });

  it("takes every word from labels", async () => {
    render(<Harness voice={{ transcribe: vi.fn(), labels: { start: "Talk", recording: "On air", stop: "Done talking", cancel: "Never mind" } }} />);
    await click("Talk");
    expect(screen.getByRole("status")).toHaveTextContent("On air");
    expect(screen.getByRole("button", { name: "Done talking" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Never mind" })).toBeInTheDocument();
  });

  it("passes the chosen microphone to the browser", async () => {
    render(<Harness voice={{ transcribe: vi.fn(), microphoneId: "usb-2" }} />);
    await click("Record a voice message");
    expect(world.getUserMedia.mock.calls[0][0].audio).toMatchObject({ deviceId: { exact: "usb-2" } });
  });

  it("the pulse stops under reduced motion", async () => {
    render(<Harness voice={{ transcribe: vi.fn() }} />);
    await click("Record a voice message");
    const rules = Array.from(document.querySelectorAll("style")).map((s) => s.textContent).join("");
    expect(rules).toMatch(/prefers-reduced-motion: reduce\)\s*\{[^}]*animation:\s*none/);
  });
});
