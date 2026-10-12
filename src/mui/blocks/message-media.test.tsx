import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { MediaItem } from "../../core/media";
import type { ChatMessage } from "../../core/types";
import { Conversation } from "./conversation";
import { FullChat, type FullChatStream } from "./full-chat";
import { MessageMedia } from "./message-media";

afterEach(() => vi.unstubAllGlobals());

const image = (id: string, extra: Partial<MediaItem> = {}): MediaItem => ({
  id,
  kind: "image",
  src: `https://example.test/${id}.png`,
  status: "ready",
  ...extra,
});

describe("MessageMedia images", () => {
  it("renders nothing for an empty list", () => {
    const { container } = render(<MessageMedia items={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("always has alt text: alt, then title, then the label", () => {
    render(<MessageMedia items={[image("a", { alt: "A red sun" }), image("b", { title: "Sunset" }), image("c")]} />);
    const imgs = screen.getAllByRole("img");
    expect(imgs.map((i) => i.getAttribute("alt"))).toEqual(["A red sun", "Sunset", "Generated image"]);
  });

  it("takes its words from labels", () => {
    render(<MessageMedia items={[image("c")]} labels={{ imageFallback: "Dibujo" }} />);
    expect(screen.getByRole("img")).toHaveAttribute("alt", "Dibujo");
  });

  it("keeps the shape: aspect ratio from width and height, one column for one item, maxColumns for many", () => {
    const { rerender } = render(<MessageMedia items={[image("a", { width: 400, height: 200 })]} />);
    const button = screen.getByRole("button");
    expect(getComputedStyle(button).aspectRatio.replace(/\s/g, "")).toBe("400/200");
    expect(getComputedStyle(screen.getByTestId("message-media")).gridTemplateColumns).toBe("repeat(1, minmax(0, 1fr))");
    const three = [image("a"), image("b"), image("c")];
    rerender(<MessageMedia items={three} />);
    expect(getComputedStyle(screen.getByTestId("message-media")).gridTemplateColumns).toBe("repeat(2, minmax(0, 1fr))");
    rerender(<MessageMedia items={three} maxColumns={3} />);
    expect(getComputedStyle(screen.getByTestId("message-media")).gridTemplateColumns).toBe("repeat(3, minmax(0, 1fr))");
    rerender(<MessageMedia items={three} maxColumns={0} />);
    expect(getComputedStyle(screen.getByTestId("message-media")).gridTemplateColumns).toBe("repeat(1, minmax(0, 1fr))");
  });

  it("applies maxHeight to the picture", () => {
    render(<MessageMedia items={[image("a")]} maxHeight={200} />);
    expect(getComputedStyle(screen.getByRole("img")).maxHeight).toBe("200px");
  });

  it("shows a skeleton while loading, and none once the picture has loaded", () => {
    const { rerender } = render(<MessageMedia items={[image("a", { status: "loading", src: null, title: "Sun" })]} />);
    expect(screen.getByRole("status", { name: "Loading Sun" })).toBeInTheDocument();
    expect(screen.queryByRole("img")).toBeNull();
    rerender(<MessageMedia items={[image("a")]} />);
    expect(screen.getByTestId("media-image-skeleton")).toBeInTheDocument();
    fireEvent.load(screen.getByRole("img"));
    expect(screen.queryByTestId("media-image-skeleton")).toBeNull();
  });

  it("shows a failed state with the title and a Retry button only when onRetry is given", () => {
    const failed = image("a", { status: "failed", src: null, title: "Sun" });
    const { rerender } = render(<MessageMedia items={[failed]} />);
    expect(screen.getByRole("status")).toHaveTextContent("Could not load Sun");
    expect(screen.queryByRole("button", { name: "Retry" })).toBeNull();
    const onRetry = vi.fn();
    rerender(<MessageMedia items={[failed]} onRetry={onRetry} />);
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledWith(failed);
    rerender(<MessageMedia items={[{ ...failed, title: undefined }]} />);
    expect(screen.getByRole("status")).toHaveTextContent("Could not load this file");
  });

  it("falls to the failed state when the picture cannot be loaded", () => {
    render(<MessageMedia items={[image("a", { title: "Sun" })]} />);
    fireEvent.error(screen.getByRole("img"));
    expect(screen.getByTestId("media-failed")).toHaveTextContent("Could not load Sun");
  });

  it("calls onOpen and opens no lightbox of its own when onOpen is given", () => {
    const onOpen = vi.fn();
    const item = image("a");
    render(<MessageMedia items={[item]} onOpen={onOpen} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onOpen).toHaveBeenCalledWith(item);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("MessageMedia lightbox", () => {
  it("opens a dialog named by the title, closes on Escape and on Close", () => {
    render(<MessageMedia items={[image("a", { title: "Sunrise", alt: "A sun" })]} />);
    fireEvent.click(screen.getByRole("button", { name: "A sun" }));
    const dialog = screen.getByRole("dialog", { name: "Sunrise" });
    expect(within(dialog).getByRole("img", { name: "A sun" })).toBeInTheDocument();
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "A sun" }));
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("moves focus into the dialog (focus trap) and names an untitled one from the fallback", () => {
    render(<MessageMedia items={[image("a")]} />);
    fireEvent.click(screen.getByRole("button"));
    const dialog = screen.getByRole("dialog", { name: "Generated image" });
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it("shows Download only when onDownload is given, and passes the item", () => {
    const item = image("a");
    const { rerender } = render(<MessageMedia items={[item]} />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.queryByRole("button", { name: "Download" })).toBeNull();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    const onDownload = vi.fn();
    rerender(<MessageMedia items={[item]} onDownload={onDownload} />);
    fireEvent.click(screen.getByRole("button", { name: /Generated image/ }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Download" }));
    expect(onDownload).toHaveBeenCalledWith(item);
  });

  it("steps between images with arrow keys and the buttons, and stops at the ends", () => {
    render(<MessageMedia items={[image("a", { title: "One" }), image("b", { title: "Two" }), image("c", { title: "Three" })]} />);
    fireEvent.click(screen.getAllByRole("button")[0]);
    let dialog = screen.getByRole("dialog", { name: "One" });
    expect(screen.getByTestId("media-position")).toHaveTextContent("1 of 3");
    expect(screen.getByRole("button", { name: "Previous image" })).toBeDisabled();
    fireEvent.keyDown(dialog, { key: "ArrowRight" });
    dialog = screen.getByRole("dialog", { name: "Two" });
    fireEvent.click(screen.getByRole("button", { name: "Next image" }));
    expect(screen.getByRole("dialog", { name: "Three" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next image" })).toBeDisabled();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "ArrowRight" });
    expect(screen.getByRole("dialog", { name: "Three" })).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "ArrowLeft" });
    expect(screen.getByRole("dialog", { name: "Two" })).toBeInTheDocument();
  });

  it("has no arrows or counter for a single image, and ignores arrow keys", () => {
    render(<MessageMedia items={[image("a", { title: "One" })]} />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.queryByRole("button", { name: "Next image" })).toBeNull();
    expect(screen.queryByTestId("media-position")).toBeNull();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "ArrowRight" });
    expect(screen.getByRole("dialog", { name: "One" })).toBeInTheDocument();
  });

  it("takes its words from labels", () => {
    render(<MessageMedia items={[image("a"), image("b")]} onDownload={() => undefined} labels={{ close: "Cerrar", next: "Siguiente", previous: "Anterior", download: "Descargar", position: "{index}/{count}" }} />);
    fireEvent.click(screen.getAllByRole("button", { name: /Generated image/ })[0]);
    expect(screen.getByRole("button", { name: "Cerrar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Siguiente" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Anterior" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Descargar" })).toBeInTheDocument();
    expect(screen.getByTestId("media-position")).toHaveTextContent("1/2");
  });

  it("does not step onto items that are not images or not ready", () => {
    const items: MediaItem[] = [
      image("a", { title: "One" }),
      { id: "v", kind: "video", src: "https://example.test/v.mp4", status: "ready" },
      image("l", { status: "loading", src: null }),
      image("b", { title: "Two" }),
    ];
    render(<MessageMedia items={items} />);
    fireEvent.click(screen.getByRole("button", { name: "One" }));
    fireEvent.click(screen.getByRole("button", { name: "Next image" }));
    expect(screen.getByRole("dialog", { name: "Two" })).toBeInTheDocument();
  });
});

describe("MessageMedia video and audio", () => {
  const video: MediaItem = { id: "v", kind: "video", src: "https://example.test/v.mp4", status: "ready", title: "Clip", poster: "https://example.test/p.png" };
  const audio: MediaItem = { id: "s", kind: "audio", src: "blob:abc", status: "ready", title: "Voice note" };

  it("draws a native video with controls, metadata preload, inline play, poster and no autoplay", () => {
    const { container } = render(<MessageMedia items={[video]} />);
    const el = container.querySelector("video") as HTMLVideoElement;
    expect(el).toHaveAttribute("controls");
    expect(el).toHaveAttribute("preload", "metadata");
    expect(el.playsInline).toBe(true);
    expect(el).toHaveAttribute("poster", "https://example.test/p.png");
    expect(el).not.toHaveAttribute("autoplay");
    expect(el).toHaveAttribute("aria-label", "Clip");
    expect(el).toHaveAttribute("src", "https://example.test/v.mp4");
  });

  it("omits the poster when none is given", () => {
    const { container } = render(<MessageMedia items={[{ ...video, poster: null }]} />);
    expect(container.querySelector("video")).not.toHaveAttribute("poster");
  });

  it("draws a native audio element with the title", () => {
    const { container } = render(<MessageMedia items={[audio]} />);
    const el = container.querySelector("audio") as HTMLAudioElement;
    expect(el).toHaveAttribute("controls");
    expect(el).toHaveAttribute("preload", "metadata");
    expect(el).not.toHaveAttribute("autoplay");
    expect(screen.getByText("Voice note")).toBeInTheDocument();
  });

  it("offers Download for video and audio only with onDownload", () => {
    const { rerender } = render(<MessageMedia items={[video, audio]} />);
    expect(screen.queryByRole("button", { name: /Download/ })).toBeNull();
    const onDownload = vi.fn();
    rerender(<MessageMedia items={[video, audio]} onDownload={onDownload} />);
    fireEvent.click(screen.getByRole("button", { name: "Download Clip" }));
    expect(onDownload).toHaveBeenCalledWith(video);
    fireEvent.click(screen.getByRole("button", { name: "Download Voice note" }));
    expect(onDownload).toHaveBeenCalledWith(audio);
  });

  it("has loading and failed states like images", () => {
    const { rerender } = render(<MessageMedia items={[{ ...video, status: "loading", src: null }]} />);
    expect(screen.getByTestId("media-loading")).toBeInTheDocument();
    const onRetry = vi.fn();
    rerender(<MessageMedia items={[{ ...audio, status: "failed", src: null }]} onRetry={onRetry} />);
    expect(screen.getByRole("status")).toHaveTextContent("Could not load Voice note");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalled();
  });
});

describe("MessageMedia reduced motion", () => {
  function stubMotion(reduce: boolean) {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: reduce && query.includes("prefers-reduced-motion"),
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }));
  }

  it("fades and zooms the picture normally, and neither under reduced motion", () => {
    stubMotion(false);
    const { unmount } = render(<MessageMedia items={[image("a")]} />);
    expect(getComputedStyle(screen.getByRole("img")).opacity).toBe("0");
    unmount();
    stubMotion(true);
    render(<MessageMedia items={[image("a")]} />);
    expect(getComputedStyle(screen.getByRole("img")).opacity).toBe("1");
    const button = screen.getByRole("button");
    expect(button.outerHTML).not.toContain("scale");
  });
});

describe("Conversation renderMedia", () => {
  const user: ChatMessage = { id: "u1", role: "user", text: "Draw a sun" };
  const reply: ChatMessage = { id: "a1", role: "assistant", text: "Here's your sun." };

  it("draws nothing extra when renderMedia is not passed", () => {
    render(<Conversation messages={[user, reply]} />);
    expect(screen.queryByTestId("message-media")).toBeNull();
  });

  it("draws the media under the reply text and above the turn actions", () => {
    render(
      <Conversation
        messages={[user, reply]}
        turnActions={{ onCopy: () => undefined } as never}
        renderMedia={(m) => (m.role === "assistant" ? [image("sun", { alt: "A sun" })] : undefined)}
      />
    );
    const media = screen.getByTestId("message-media");
    const text = screen.getByText("Here's your sun.");
    expect(text.compareDocumentPosition(media) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getAllByTestId("message-media")).toHaveLength(1);
    expect(screen.getByRole("img", { name: "A sun" })).toBeInTheDocument();
  });

  it("never draws media on a user turn, and treats an empty list as none", () => {
    const renderMedia = vi.fn((_message: ChatMessage) => [] as MediaItem[]);
    render(<Conversation messages={[user, reply]} renderMedia={renderMedia} />);
    expect(screen.queryByTestId("message-media")).toBeNull();
    expect(renderMedia.mock.calls.every(([m]) => m.role === "assistant")).toBe(true);
  });

  it("still shows a reply that has media and no text", () => {
    render(<Conversation messages={[user, { id: "a2", role: "assistant", text: "" }]} renderMedia={(m) => (m.id === "a2" ? [image("x", { alt: "Only a picture" })] : undefined)} />);
    expect(screen.getByRole("img", { name: "Only a picture" })).toBeInTheDocument();
  });

  it("forwards mediaProps (onOpen, labels)", () => {
    const onOpen = vi.fn();
    render(
      <Conversation
        messages={[user, reply]}
        renderMedia={() => [image("sun")]}
        mediaProps={{ onOpen, labels: { imageFallback: "Sol" } }}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Sol" }));
    expect(onOpen).toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("FullChat renderMedia", () => {
  const stream: FullChatStream = {
    messages: [
      { id: "u1", role: "user", text: "Draw a sun" },
      { id: "a1", role: "assistant", text: "Here's your sun." },
    ],
    status: "idle",
    error: null,
    interrupt: null,
    followUps: [],
    turnActions: null,
    send: vi.fn(),
    stop: vi.fn(),
    retry: vi.fn(),
    resume: vi.fn(),
  };
  const agent = { name: "Helper", initial: "H" };

  it("forwards renderMedia and mediaProps to the conversation, and draws no media without them", () => {
    const { rerender } = render(<FullChat stream={stream} agent={agent} />);
    expect(screen.queryByTestId("message-media")).toBeNull();
    rerender(<FullChat stream={stream} agent={agent} renderMedia={(m) => (m.role === "assistant" ? [image("sun")] : undefined)} mediaProps={{ labels: { imageFallback: "Sol" } }} />);
    expect(screen.getByRole("img", { name: "Sol" })).toBeInTheDocument();
  });
});
