import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { CallRecording, CallStatus, CallTranscriptLine } from "../../core/call-report";
import { CallPlayback, type CallPlaybackProps } from "./call-playback";

const lines: CallTranscriptLine[] = [
  { speaker: "niru", text: "Hello, I am calling for Sam.", start_s: 0, end_s: 4 },
  { speaker: "them", text: "Speaking.", start_s: 5, end_s: 6 },
  { speaker: "niru", text: "Is Friday at five free?", start_s: 7, end_s: 10 },
  { speaker: "them", text: "Yes, it is.", start_s: 11, end_s: 13 },
  { speaker: "niru", text: "Thank you, goodbye.", start_s: 14, end_s: 16 },
];
const recording: CallRecording = { attachment_id: "att-1", media_type: "audio/mpeg", duration_s: 90 };
const SRC = "https://example.test/call.mp3";

let time = 0;
let paused = true;
const play = vi.fn(function (this: HTMLMediaElement) {
  paused = false;
  this.dispatchEvent(new Event("play"));
  return Promise.resolve();
});
const pause = vi.fn(function (this: HTMLMediaElement) {
  paused = true;
  this.dispatchEvent(new Event("pause"));
});
const load = vi.fn();

beforeEach(() => {
  time = 0;
  paused = true;
  vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(play);
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(pause);
  vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(load);
  Object.defineProperty(HTMLMediaElement.prototype, "currentTime", { configurable: true, get: () => time, set: (v: number) => void (time = v) });
  Object.defineProperty(HTMLMediaElement.prototype, "duration", { configurable: true, get: () => 90 });
  Object.defineProperty(HTMLMediaElement.prototype, "paused", { configurable: true, get: () => paused });
});
afterEach(() => {
  vi.restoreAllMocks();
  play.mockClear();
  pause.mockClear();
  load.mockClear();
});

const audioEl = (container: HTMLElement) => container.querySelector("audio") as HTMLAudioElement;
const tick = (el: HTMLAudioElement, t: number) => {
  time = t;
  fireEvent.timeUpdate(el);
};
function setup(props: Partial<CallPlaybackProps> = {}) {
  const view = render(<CallPlayback status="completed" recording={recording} src={SRC} transcript={lines} {...props} />);
  const el = audioEl(view.container);
  if (el) fireEvent.loadedMetadata(el);
  return { ...view, el };
}

describe("CallPlayback header", () => {
  it.each<[CallStatus, string]>([
    ["completed", "Completed"],
    ["no_answer", "No answer"],
    ["failed", "Could not connect"],
    ["refused", "Not placed"],
  ])("shows %s as %s", (status, text) => {
    setup({ status });
    expect(screen.getByRole("heading", { name: "Call ended" })).toBeInTheDocument();
    expect(screen.getByTestId("call-status")).toHaveTextContent(text);
  });

  it("takes a title, subtitle and summary, and children", () => {
    setup({ title: "Call to Sam's Bakery", subtitle: "Sam's Bakery, 1:30", summary: "Booked Friday.", children: <span>extra</span> });
    expect(screen.getByRole("heading", { name: "Call to Sam's Bakery" })).toBeInTheDocument();
    expect(screen.getByText("Sam's Bakery, 1:30")).toBeInTheDocument();
    expect(screen.getByText("Booked Friday.")).toBeInTheDocument();
    expect(screen.getByText("extra")).toBeInTheDocument();
  });

  it("takes every word from labels", () => {
    setup({ status: "no_answer", labels: { title: "Llamada", statusNoAnswer: "Sin respuesta", speakerThem: "Panadería", play: "Reproducir", showFull: "Ver todo" } });
    expect(screen.getByRole("heading", { name: "Llamada" })).toBeInTheDocument();
    expect(screen.getByTestId("call-status")).toHaveTextContent("Sin respuesta");
    expect(screen.getByRole("button", { name: "Reproducir" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ver todo" })).toBeInTheDocument();
    expect(screen.getAllByText("Panadería").length).toBeGreaterThan(0);
    expect(screen.queryByText("Them")).toBeNull();
  });
});

describe("CallPlayback player", () => {
  it("plays and pauses from the button", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Play recording" }));
    expect(play).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Pause recording" }));
    expect(pause).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Play recording" })).toBeInTheDocument();
  });

  it("is operable from the keyboard: native buttons and a range input, all in the tab order", () => {
    const { el } = setup({ onDownload: () => undefined });
    const controls = [
      screen.getByRole("button", { name: "Play recording" }),
      screen.getByRole("slider", { name: "Seek in recording" }),
      screen.getByRole("button", { name: "1x speed" }),
      screen.getByRole("button", { name: "1.5x speed" }),
      screen.getByRole("button", { name: "2x speed" }),
      screen.getByRole("button", { name: "Download recording" }),
    ];
    for (const control of controls) {
      control.focus();
      expect(control).toHaveFocus();
    }
    // The speed group is one tab stop (roving tabindex): the chosen speed is in the order, arrows move.
    expect(controls[2]!.tabIndex).toBe(0);
    fireEvent.keyDown(controls[2]!, { key: "ArrowRight" });
    expect(controls[3]).toHaveFocus();
    // Buttons are native <button>s, so Enter and Space activate them; the slider is a native range input.
    expect(controls[0]!.tagName).toBe("BUTTON");
    expect(controls[1]!.tagName).toBe("INPUT");
    expect(controls[1]).toHaveAttribute("type", "range");
    expect(controls[1]).toHaveAttribute("aria-valuemax", "90");
    fireEvent.change(controls[1]!, { target: { value: "30" } });
    expect(time).toBe(30);
    fireEvent.click(controls[3]!);
    expect(el.playbackRate).toBe(1.5);
    expect(controls[3]).toHaveAttribute("aria-pressed", "true");
  });

  it("shows elapsed and total time, with a spoken position", () => {
    const { el } = setup();
    tick(el, 12);
    expect(screen.getByRole("slider", { name: "Seek in recording" })).toHaveAttribute("aria-valuetext", "0:12 of 1:30");
    expect(screen.getByText("1:30")).toBeInTheDocument();
    expect(screen.getByText("0:12")).toBeInTheDocument();
  });

  it("sets the playback speed to 2x", () => {
    const { el } = setup();
    fireEvent.click(screen.getByRole("button", { name: "2x speed" }));
    expect(el.playbackRate).toBe(2);
  });

  it("shows Download only with onDownload, and calls it", () => {
    const { unmount } = setup();
    expect(screen.queryByRole("button", { name: "Download recording" })).toBeNull();
    unmount();
    const onDownload = vi.fn();
    setup({ onDownload });
    fireEvent.click(screen.getByRole("button", { name: "Download recording" }));
    expect(onDownload).toHaveBeenCalledTimes(1);
  });

  it("shows a loading line until metadata arrives", () => {
    render(<CallPlayback status="completed" src={SRC} recording={recording} />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading recording");
  });

  it("shows loading while the app resolves the address", () => {
    render(<CallPlayback status="completed" loading transcript={lines} />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading recording");
    expect(screen.queryByRole("slider")).toBeNull();
    expect(screen.getByText("Speaking.")).toBeInTheDocument();
  });

  it("shows an error when the file fails, retries and reloads", () => {
    const onRetry = vi.fn();
    const { el } = setup({ onRetry });
    fireEvent.error(el);
    expect(screen.getByRole("status")).toHaveTextContent("Could not load the recording");
    expect(screen.queryByRole("slider")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(load).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("slider")).toBeInTheDocument();
  });

  it("has no Retry without onRetry, and shows the app's failed state", () => {
    render(<CallPlayback status="completed" failed transcript={lines} />);
    expect(screen.getByRole("status")).toHaveTextContent("Could not load the recording");
    expect(screen.queryByRole("button", { name: "Retry" })).toBeNull();
  });

  it("says No recording and still shows the transcript", () => {
    render(<CallPlayback status="no_answer" transcript={lines} />);
    expect(screen.getByText("No recording")).toBeInTheDocument();
    expect(screen.queryByRole("slider")).toBeNull();
    expect(screen.getByText("Hello, I am calling for Sam.")).toBeInTheDocument();
    // Without audio a line is not a button.
    expect(screen.queryByRole("button", { name: /Play from here/ })).toBeNull();
  });
});

describe("CallPlayback transcript", () => {
  it("shows speakers and times, collapsed to three lines", () => {
    setup();
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getAllByText("Niru").length).toBe(2);
    expect(screen.getByText("Them")).toBeInTheDocument();
    expect(screen.getByText("0:07")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Show full transcript" }));
    expect(screen.getAllByRole("listitem")).toHaveLength(5);
    expect(screen.getByRole("button", { name: "Show less" })).toHaveAttribute("aria-expanded", "true");
  });

  it("has no toggle when the transcript fits", () => {
    setup({ transcript: lines.slice(0, 2) });
    expect(screen.queryByRole("button", { name: "Show full transcript" })).toBeNull();
  });

  it("clicking a line sets currentTime and plays", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: /Is Friday at five free\?/ }));
    expect(time).toBe(7);
    expect(play).toHaveBeenCalledTimes(1);
  });

  it("highlights the line being played and follows timeupdate", () => {
    const { el } = setup({ defaultExpanded: true });
    const current = () => document.querySelector("[aria-current='true']");
    expect(current()).toBeNull();
    tick(el, 1);
    expect(current()).toHaveTextContent("Hello, I am calling for Sam.");
    tick(el, 7.5);
    expect(current()).toHaveTextContent("Is Friday at five free?");
    tick(el, 4.5);
    expect(current()).toBeNull();
    tick(el, 15);
    expect(current()).toHaveTextContent("Thank you, goodbye.");
  });

  it("keeps the playing line visible when the transcript is folded", () => {
    const { el } = setup();
    expect(screen.queryByText("Thank you, goodbye.")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Play recording" }));
    tick(el, 15);
    const item = screen.getByText("Thank you, goodbye.").closest("li")!;
    expect(item).toHaveAttribute("data-active", "true");
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  it("scrolls the list, not the page, to the playing line", () => {
    const { el } = setup({ defaultExpanded: true });
    const list = screen.getByTestId("call-transcript");
    Object.defineProperty(list, "clientHeight", { configurable: true, value: 50 });
    const row = list.querySelector<HTMLElement>("[data-line-index='4']")!;
    Object.defineProperty(row, "offsetTop", { configurable: true, value: 200 });
    Object.defineProperty(row, "offsetHeight", { configurable: true, value: 40 });
    fireEvent.click(screen.getByRole("button", { name: "Play recording" }));
    tick(el, 15);
    expect(list.scrollTop).toBe(190);
  });

  it("notes a truncated transcript", () => {
    const { unmount } = setup();
    expect(screen.queryByRole("note")).toBeNull();
    unmount();
    setup({ transcriptTruncated: true });
    expect(screen.getByRole("note")).toHaveTextContent("shortened");
  });

  it("says No transcript for an empty one", () => {
    setup({ transcript: [] });
    expect(within(screen.getByTestId("call-playback")).getByText("No transcript")).toBeInTheDocument();
  });
});
