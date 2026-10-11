import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Image } from "./image";

describe("Image", () => {
  it("shows a skeleton until the image loads", () => {
    render(<Image src="https://example.com/cat.png" alt="a cat" />);

    expect(screen.getByTestId("chat-image-skeleton")).toBeInTheDocument();
    expect(screen.getByAltText("a cat")).toBeInTheDocument();

    fireEvent.load(screen.getByAltText("a cat"));

    expect(screen.queryByTestId("chat-image-skeleton")).not.toBeInTheDocument();
    expect(screen.getByAltText("a cat")).toBeInTheDocument();
  });

  it("shows a fallback message when the image fails to load", () => {
    render(<Image src="https://example.com/missing.png" alt="a cat" />);

    fireEvent.error(screen.getByAltText("a cat"));

    expect(screen.getByText("Image could not be loaded")).toBeInTheDocument();
    expect(screen.queryByAltText("a cat")).not.toBeInTheDocument();
  });
});

describe("Image from bytes", () => {
  const created: string[] = [];
  const revoked: string[] = [];
  const PNG_BASE64 = "iVBORw0KGgo=";

  beforeEach(() => {
    created.length = 0;
    revoked.length = 0;
    let n = 0;
    URL.createObjectURL = vi.fn(() => {
      const url = `blob:test/${(n += 1)}`;
      created.push(url);
      return url;
    });
    URL.revokeObjectURL = vi.fn((url: string) => {
      revoked.push(url);
    });
  });

  it("draws base64 bytes through an object URL", () => {
    render(<Image base64={PNG_BASE64} mediaType="image/png" alt="chart" />);
    expect(screen.getByAltText("chart")).toHaveAttribute("src", created[0]);
  });

  it("draws a Uint8Array and tolerates a data: prefix on base64", () => {
    const { rerender } = render(<Image uint8Array={new Uint8Array([1, 2, 3])} mediaType="image/jpeg" alt="a" />);
    expect(screen.getByAltText("a")).toHaveAttribute("src", created[0]);
    rerender(<Image base64={`data:image/png;base64,${PNG_BASE64}`} mediaType="image/png" alt="a" />);
    expect(created).toHaveLength(2);
  });

  it("revokes the object URL when the bytes change and when it unmounts", () => {
    const { rerender, unmount } = render(<Image uint8Array={new Uint8Array([1])} mediaType="image/png" alt="a" />);
    rerender(<Image uint8Array={new Uint8Array([2])} mediaType="image/png" alt="a" />);
    expect(revoked).toEqual([created[0]]);
    unmount();
    expect(revoked).toEqual([created[0], created[1]]);
  });

  it.each([["text/html"], ["application/pdf"], ["image"], [undefined]])(
    "refuses media type %s and makes no URL",
    (mediaType) => {
      render(<Image base64={PNG_BASE64} mediaType={mediaType} alt="x" />);
      expect(screen.getByText("Image could not be loaded")).toBeInTheDocument();
      expect(screen.queryByAltText("x")).not.toBeInTheDocument();
      expect(created).toHaveLength(0);
    }
  );

  it("shows the fallback for base64 that cannot be decoded", () => {
    render(<Image base64="***not base64***" mediaType="image/png" alt="x" />);
    expect(screen.getByText("Image could not be loaded")).toBeInTheDocument();
  });

  it("still loads a plain src without creating object URLs", () => {
    render(<Image src="https://example.com/cat.png" alt="cat" />);
    expect(screen.getByAltText("cat")).toHaveAttribute("src", "https://example.com/cat.png");
    expect(created).toHaveLength(0);
  });
});
