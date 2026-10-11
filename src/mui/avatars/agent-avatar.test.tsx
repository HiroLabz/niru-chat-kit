import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AgentAvatar } from "./agent-avatar";
import { AVATAR_PRESETS } from "./presets";

describe("AgentAvatar", () => {
  it("ships 24 presets with stable ids", () => {
    expect(AVATAR_PRESETS.map((p) => p.id)).toEqual(
      Array.from({ length: 24 }, (_, i) => `hiro-${String(i + 1).padStart(2, "0")}`)
    );
  });

  it("draws a preset as an svg labelled with the agent name", () => {
    render(<AgentAvatar avatar={{ kind: "preset", preset_id: "hiro-07" }} name="Support Bot" />);
    const img = screen.getByRole("img", { name: "Support Bot" });
    expect(img.querySelector("svg")).not.toBeNull();
    expect(img.textContent).toBe("");
  });

  it("falls back to the first preset for an unknown id or a missing avatar", () => {
    const { rerender } = render(<AgentAvatar avatar={{ kind: "preset", preset_id: "nope" }} name="A" />);
    expect(screen.getByRole("img", { name: "A" }).querySelector("svg")).not.toBeNull();
    rerender(<AgentAvatar avatar={null} name="A" />);
    expect(screen.getByRole("img", { name: "A" }).querySelector("svg")).not.toBeNull();
  });

  it("falls back to the first preset for a null preset id (API shape)", () => {
    render(<AgentAvatar avatar={{ kind: "preset", preset_id: null, url: null }} name="A" />);
    expect(screen.getByRole("img", { name: "A" }).querySelector("svg")).not.toBeNull();
  });

  it("uses the url for an uploaded image", () => {
    render(<AgentAvatar avatar={{ kind: "image", url: "https://cdn.example/a.webp" }} name="Legal" />);
    expect(screen.getByRole("img", { name: "Legal" }).querySelector("img")?.getAttribute("src")).toBe(
      "https://cdn.example/a.webp"
    );
  });

  it("falls back to the first preset for an image with a null url (API shape)", () => {
    render(<AgentAvatar avatar={{ kind: "image", url: null, preset_id: null }} name="Legal" />);
    const el = screen.getByRole("img", { name: "Legal" });
    expect(el.querySelector("svg")).not.toBeNull();
    expect(el.querySelector("img")).toBeNull();
  });

  it("adds a link badge when linked", () => {
    render(<AgentAvatar avatar={null} name="Acme" linked />);
    expect(screen.getByTestId("agent-avatar-link")).toBeTruthy();
  });
});
