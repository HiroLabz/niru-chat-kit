import { describe, expect, it } from "vitest";
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
