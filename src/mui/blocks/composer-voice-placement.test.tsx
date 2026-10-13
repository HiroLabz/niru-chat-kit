import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { installRecorderWorld, removeRecorderWorld } from "../../core/voice/recorder-test-kit";
import { Composer, type ComposerProps } from "./composer";

const mics = [
  { deviceId: "default", label: "System default" },
  { deviceId: "usb", label: "USB headset" },
];

function Harness(props: Partial<ComposerProps>) {
  const [value, setValue] = useState("");
  return <Composer onSubmit={vi.fn()} {...props} value={value} onChange={setValue} />;
}
const row = () => within(document.querySelector('[data-chat="composer-bar"]') as HTMLElement).getAllByRole("button").map((b) => b.getAttribute("aria-label"));
function width(px: number) {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ width: px, height: 40, top: 0, left: 0, right: px, bottom: 40, x: 0, y: 0, toJSON: () => ({}) });
}
const flush = () => act(async () => void (await vi.advanceTimersByTimeAsync(0)));

beforeEach(() => {
  vi.useFakeTimers();
  installRecorderWorld();
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} unobserve() {} });
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  removeRecorderWorld();
});

const voice = (extra = {}) => ({ transcribe: vi.fn(async () => "hi"), microphones: mics, microphoneId: "usb", onSelectMicrophone: vi.fn(), ...extra });

describe("Composer voicePlacement", () => {
  it("keeps the mic after attach by default", () => {
    width(700);
    render(<Harness onAttach={vi.fn()} onStartCall={vi.fn()} voice={{ transcribe: vi.fn() }} />);
    expect(row()).toEqual(["Attach a document", "Record a voice message", "Start a call", "Send"]);
  });

  it("start behaves as the default", () => {
    width(700);
    render(<Harness voicePlacement="start" onAttach={vi.fn()} onStartCall={vi.fn()} voice={{ transcribe: vi.fn() }} />);
    expect(row()).toEqual(["Attach a document", "Record a voice message", "Start a call", "Send"]);
  });

  it("end puts the mic immediately before Send, with the call before it", () => {
    width(700);
    render(<Harness voicePlacement="end" onAttach={vi.fn()} onStartCall={vi.fn()} voice={{ transcribe: vi.fn() }} />);
    expect(row()).toEqual(["Attach a document", "Start a call", "Record a voice message", "Send"]);
  });

  it("end also works for browser dictation", () => {
    width(700);
    class Recognition { start() {} stop() {} abort() {} }
    vi.stubGlobal("SpeechRecognition", Recognition);
    Object.defineProperty(window, "SpeechRecognition", { value: Recognition, configurable: true });
    render(<Harness voicePlacement="end" voice />);
    expect(row()).toEqual(["Start voice input", "Send"]);
    Reflect.deleteProperty(window, "SpeechRecognition");
  });

  it("keeps stop and cancel in the row before Send while recording", async () => {
    width(700);
    render(<Harness voicePlacement="end" voice={voice()} />);
    fireEvent.click(screen.getByRole("button", { name: "Record a voice message" }));
    await flush();
    expect(row()).toEqual(["Stop and transcribe", "Cancel recording", "Choose microphone", "Send"]);
  });
});

describe("Composer microphone choice", () => {
  it("draws no caret without a list, with an empty list, or without a handler", () => {
    width(700);
    const a = render(<Harness voice={{ transcribe: vi.fn() }} />);
    expect(screen.queryByRole("button", { name: "Choose microphone" })).not.toBeInTheDocument();
    a.unmount();
    const b = render(<Harness voice={voice({ microphones: [] })} />);
    expect(screen.queryByRole("button", { name: "Choose microphone" })).not.toBeInTheDocument();
    b.unmount();
    render(<Harness voice={voice({ onSelectMicrophone: undefined })} />);
    expect(screen.queryByRole("button", { name: "Choose microphone" })).not.toBeInTheDocument();
  });

  it("opens a menu of radio items with the current one checked, and choosing calls the handler", () => {
    width(700);
    const onSelectMicrophone = vi.fn();
    render(<Harness voice={voice({ onSelectMicrophone })} />);
    const caret = screen.getByRole("button", { name: "Choose microphone" });
    expect(caret).toHaveAttribute("aria-haspopup", "menu");
    fireEvent.click(caret);
    const items = screen.getAllByRole("menuitemradio");
    expect(items.map((i) => i.textContent)).toEqual(["System default", "USB headset"]);
    expect(items.map((i) => i.getAttribute("aria-checked"))).toEqual(["false", "true"]);
    fireEvent.click(items[0]);
    expect(onSelectMicrophone).toHaveBeenCalledWith("default");
  });

  it("checks the system default when the chosen microphone is not in the list", () => {
    width(700);
    render(<Harness voice={voice({ microphoneId: "gone" })} />);
    fireEvent.click(screen.getByRole("button", { name: "Choose microphone" }));
    expect(screen.getAllByRole("menuitemradio").map((i) => i.getAttribute("aria-checked"))).toEqual(["true", "false"]);
  });

  it("is disabled while recording", async () => {
    width(700);
    render(<Harness voice={voice()} />);
    expect(screen.getByRole("button", { name: "Choose microphone" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Record a voice message" }));
    await flush();
    expect(screen.getByRole("button", { name: "Choose microphone" })).toBeDisabled();
  });

  it("is disabled while transcribing", async () => {
    width(700);
    let finish: (text: string) => void = () => {};
    render(<Harness voice={voice({ transcribe: vi.fn(() => new Promise<string>((resolve) => (finish = resolve))) })} />);
    fireEvent.click(screen.getByRole("button", { name: "Record a voice message" }));
    await flush();
    fireEvent.click(screen.getByRole("button", { name: "Stop and transcribe" }));
    await flush();
    expect(screen.getByRole("button", { name: "Choose microphone" })).toBeDisabled();
    finish("done");
    await flush();
    expect(screen.getByRole("button", { name: "Choose microphone" })).toBeEnabled();
  });

  it("takes the words of the heading from labels", () => {
    width(700);
    render(<Harness voice={voice({ labels: { chooseMicrophone: "Pick a mic" } })} />);
    expect(screen.getByRole("button", { name: "Pick a mic" })).toBeInTheDocument();
  });
});

describe("Composer narrow rows", () => {
  it("start: voice input stays in More, with no microphone list", () => {
    width(300);
    render(<Harness onAttach={vi.fn()} onStartCall={vi.fn()} voice={voice()} />);
    expect(row()).toEqual(["Attach a document", "More", "Start a call", "Send"]);
    fireEvent.click(screen.getByRole("button", { name: "More" }));
    expect(screen.getByRole("menuitem", { name: "Record a voice message" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitemradio")).not.toBeInTheDocument();
  });

  it("end: the row is attach, More, call, voice, Send, and the microphones are in More", () => {
    width(300);
    const onSelectMicrophone = vi.fn();
    render(<Harness voicePlacement="end" onAttach={vi.fn()} onStartCall={vi.fn()} voice={voice({ onSelectMicrophone })} />);
    expect(row()).toEqual(["Attach a document", "More", "Start a call", "Record a voice message", "Send"]);
    expect(document.querySelector('[data-chat="composer-bar"]')).toHaveStyle({ flexWrap: "nowrap" });
    fireEvent.click(screen.getByRole("button", { name: "More" }));
    expect(screen.queryByRole("menuitem", { name: "Record a voice message" })).not.toBeInTheDocument();
    const items = screen.getAllByRole("menuitemradio");
    expect(items.map((i) => i.getAttribute("aria-checked"))).toEqual(["false", "true"]);
    fireEvent.click(items[0]);
    expect(onSelectMicrophone).toHaveBeenCalledWith("default");
  });

  it("end without a list: no More button for it", () => {
    width(300);
    render(<Harness voicePlacement="end" onAttach={vi.fn()} voice={{ transcribe: vi.fn() }} />);
    expect(row()).toEqual(["Attach a document", "Record a voice message", "Send"]);
  });

  it("end: the microphone rows are disabled while recording", async () => {
    width(300);
    render(<Harness voicePlacement="end" voice={voice()} />);
    fireEvent.click(screen.getByRole("button", { name: "Record a voice message" }));
    await flush();
    expect(row()).toEqual(["More", "Stop and transcribe", "Cancel recording", "Send"]);
    fireEvent.click(screen.getByRole("button", { name: "More" }));
    for (const item of screen.getAllByRole("menuitemradio")) expect(item).toHaveAttribute("aria-disabled", "true");
  });
});
