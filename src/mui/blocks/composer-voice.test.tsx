import { afterEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { Composer, type ComposerProps } from "./composer";
import { appendSpeech } from "./composer-voice";

type Handler = ((event: unknown) => void) | null;

class FakeRecognition {
  static instances: FakeRecognition[] = [];
  lang = "";
  continuous = false;
  interimResults = false;
  onresult: Handler = null;
  onerror: Handler = null;
  onend: Handler = null;
  stopped = 0;
  aborted = 0;
  constructor() {
    FakeRecognition.instances.push(this);
  }
  start() {}
  stop() {
    this.stopped += 1;
    this.onend?.({});
  }
  abort() {
    this.aborted += 1;
  }
}

function heard(text: string, isFinal: boolean) {
  return { resultIndex: 0, results: [Object.assign([{ transcript: text }], { isFinal })] };
}

function Harness(props: Partial<ComposerProps>) {
  const [value, setValue] = useState(props.value ?? "");
  return <Composer onSubmit={vi.fn()} {...props} value={value} onChange={setValue} />;
}

afterEach(() => {
  FakeRecognition.instances = [];
  Reflect.deleteProperty(window, "SpeechRecognition");
  Reflect.deleteProperty(window, "webkitSpeechRecognition");
});

describe("Composer voice", () => {
  it("shows no mic by default, even where the browser supports recognition", () => {
    Object.assign(window, { SpeechRecognition: FakeRecognition });
    render(<Harness />);
    expect(screen.queryByRole("button", { name: /voice input/i })).not.toBeInTheDocument();
  });

  it("hides the mic where the browser has no recognition", () => {
    render(<Harness voice />);
    expect(screen.queryByRole("button", { name: /voice input/i })).not.toBeInTheDocument();
  });

  it("toggles listening with a pressed state and a visible indicator, and appends final text", () => {
    Object.assign(window, { SpeechRecognition: FakeRecognition });
    render(<Harness voice voiceLang="en-PH" value="Hi" />);
    const mic = screen.getByRole("button", { name: "Start voice input" });
    expect(mic).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(mic);
    const stop = screen.getByRole("button", { name: "Stop voice input" });
    expect(stop).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("voice-listening-indicator")).toBeInTheDocument();
    expect(FakeRecognition.instances[0].lang).toBe("en-PH");

    act(() => FakeRecognition.instances[0].onresult?.(heard("good mor", false)));
    expect(screen.getByText("good mor")).toBeInTheDocument();
    act(() => FakeRecognition.instances[0].onresult?.(heard("good morning", true)));
    expect(screen.getByRole("textbox")).toHaveValue("Hi good morning");

    fireEvent.click(stop);
    expect(screen.queryByTestId("voice-listening-indicator")).not.toBeInTheDocument();
  });

  it("stops listening when the message is sent", () => {
    Object.assign(window, { SpeechRecognition: FakeRecognition });
    const onSubmit = vi.fn();
    render(<Harness voice value="hello" onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("button", { name: "Start voice input" }));
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(FakeRecognition.instances[0].stopped).toBe(1);
  });

  it("explains a denied microphone and a silent session without crashing", () => {
    Object.assign(window, { SpeechRecognition: FakeRecognition });
    render(<Harness voice />);
    fireEvent.click(screen.getByRole("button", { name: "Start voice input" }));
    act(() => FakeRecognition.instances[0].onerror?.({ error: "not-allowed" }));
    act(() => FakeRecognition.instances[0].onend?.({}));
    expect(screen.getByRole("status")).toHaveTextContent(/microphone access was blocked/i);

    fireEvent.click(screen.getByRole("button", { name: "Start voice input" }));
    act(() => FakeRecognition.instances[1].onerror?.({ error: "no-speech" }));
    act(() => FakeRecognition.instances[1].onend?.({}));
    expect(screen.getByRole("status")).toHaveTextContent(/did not hear/i);
  });

  it("ends the session on unmount", () => {
    Object.assign(window, { SpeechRecognition: FakeRecognition });
    const { unmount } = render(<Harness voice />);
    fireEvent.click(screen.getByRole("button", { name: "Start voice input" }));
    unmount();
    expect(FakeRecognition.instances[0].aborted).toBe(1);
  });

  it("joins phrases with one space", () => {
    expect(appendSpeech("", "hi")).toBe("hi");
    expect(appendSpeech("hi", "there")).toBe("hi there");
    expect(appendSpeech("hi ", "there")).toBe("hi there");
  });
});
