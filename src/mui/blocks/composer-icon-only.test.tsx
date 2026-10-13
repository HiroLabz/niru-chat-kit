import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { installRecorderWorld, removeRecorderWorld } from "../../core/voice/recorder-test-kit";
import MenuItem from "@mui/material/MenuItem";
import { Composer, type ComposerApprovalMode, type ComposerProps } from "./composer";

const base = { value: "", onChange: vi.fn(), onSubmit: vi.fn() };

function approval(overrides: Partial<ComposerApprovalMode> = {}): ComposerApprovalMode {
  return {
    value: "auto",
    onChange: vi.fn(),
    heading: "How should actions be approved?",
    options: [
      { value: "ask", label: "Ask for approval", icon: <span data-testid="ia">a</span> },
      { value: "auto", label: "Unrestricted", icon: <span data-testid="ib">b</span>, tone: "warning" },
      { value: "plain", label: "Plain choice" },
    ],
    ...overrides,
  };
}

function width(px: number) {
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} unobserve() {} });
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ width: px, height: 40, top: 0, left: 0, right: px, bottom: 40, x: 0, y: 0, toJSON: () => ({}) });
}
const row = () => within(document.querySelector('[data-chat="composer-bar"]') as HTMLElement).getAllByRole("button").map((b) => b.getAttribute("aria-label"));

beforeEach(() => installRecorderWorld());
afterEach(() => {
  removeRecorderWorld();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Composer iconOnly approval button", () => {
  it("keeps the labelled button by default", () => {
    render(<Composer {...base} approvalMode={approval()} />);
    expect(screen.getByRole("button", { name: "How should actions be approved?: Unrestricted" })).toHaveTextContent("Unrestricted");
  });

  it("shows only the icon, keeps the name, tooltip and warning tone", async () => {
    render(<Composer {...base} approvalMode={approval({ iconOnly: true })} />);
    const button = screen.getByRole("button", { name: "How should actions be approved?: Unrestricted" });
    expect(button).not.toHaveTextContent("Unrestricted");
    expect(within(button).getByTestId("ib")).toBeInTheDocument();
    expect(button).toHaveAttribute("aria-haspopup", "menu");
    fireEvent.mouseOver(button);
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Unrestricted");
    const plain = render(<Composer {...base} approvalMode={approval({ iconOnly: true, value: "ask" })} />);
    expect(plain.container).toBeTruthy();
    expect(getComputedStyle(button).color).not.toBe(getComputedStyle(screen.getAllByRole("button", { name: /Ask for approval/ })[0]).color);
  });

  it("opens the same menu", () => {
    const a = approval({ iconOnly: true });
    render(<Composer {...base} approvalMode={a} />);
    fireEvent.click(screen.getByRole("button", { name: /Unrestricted/ }));
    fireEvent.click(screen.getByRole("menuitemradio", { name: /Ask for approval/ }));
    expect(a.onChange).toHaveBeenCalledWith("ask");
  });

  it("falls back to the label for an option without an icon", () => {
    render(<Composer {...base} approvalMode={approval({ iconOnly: true, value: "plain" })} />);
    expect(screen.getByRole("button", { name: "How should actions be approved?: Plain choice" })).toHaveTextContent("Plain choice");
  });
});

describe("Composer iconOnly toggle", () => {
  const make = (active: boolean, onToggle = vi.fn()) => [{ id: "web", label: "Search the web", icon: <span>i</span>, active, onToggle, iconOnly: true }];

  it("keeps a labelled pill without iconOnly", () => {
    render(<Composer {...base} toggles={[{ id: "web", label: "Search the web", icon: <span>i</span>, active: false, onToggle: vi.fn() }]} />);
    expect(screen.getByRole("button", { name: /Search the web/ })).toHaveTextContent("Search the web");
  });

  it("is a round icon button with pressed state, name and toggling", async () => {
    width(700);
    const onToggle = vi.fn();
    const { rerender } = render(<Composer {...base} toggles={make(false, onToggle)} />);
    const button = screen.getByRole("button", { name: "Search the web" });
    expect(button).not.toHaveTextContent("Search");
    expect(button).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(button);
    expect(onToggle).toHaveBeenCalledTimes(1);
    const off = getComputedStyle(button).color;
    rerender(<Composer {...base} toggles={make(true, onToggle)} />);
    const on = screen.getByRole("button", { name: "Search the web" });
    expect(on).toHaveAttribute("aria-pressed", "true");
    expect(getComputedStyle(on).color).not.toBe(off);
    fireEvent.mouseOver(on);
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Search the web");
  });

  it("is a labelled checkable item in More when narrow", () => {
    width(300);
    render(<Composer {...base} toggles={make(true)} />);
    expect(screen.queryByRole("button", { name: "Search the web" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "More, 1 on" }));
    const item = screen.getByRole("menuitemcheckbox", { name: /Search the web/ });
    expect(item).toHaveTextContent("Search the web");
    expect(item).toHaveAttribute("aria-checked", "true");
  });
});

describe("Composer endLeading", () => {
  const end = <button type="button" aria-label="Model">m</button>;
  const props = (extra: Partial<ComposerProps> = {}): ComposerProps => ({ ...base, onAttach: vi.fn(), onStartCall: vi.fn(), trailing: <button type="button" aria-label="Trail">t</button>, ...extra });

  it("draws nothing without it", () => {
    width(700);
    render(<Composer {...props()} />);
    expect(row()).toEqual(["Attach a document", "Trail", "Start a call", "Send"]);
  });

  it("sits after trailing and before call and Send", () => {
    width(700);
    render(<Composer {...props({ endLeading: end })} />);
    expect(row()).toEqual(["Attach a document", "Trail", "Model", "Start a call", "Send"]);
  });

  it("sits before call, voice and Send with voicePlacement end", () => {
    width(700);
    render(<Composer {...props({ endLeading: end, voicePlacement: "end", voice: { transcribe: vi.fn() } })} />);
    expect(row()).toEqual(["Attach a document", "Trail", "Model", "Start a call", "Record a voice message", "Send"]);
  });

  it("sits before the voice input and Send without a call button", () => {
    width(700);
    render(<Composer {...props({ endLeading: end, voicePlacement: "end", voice: { transcribe: vi.fn() }, onStartCall: undefined })} />);
    expect(row()).toEqual(["Attach a document", "Trail", "Model", "Record a voice message", "Send"]);
  });

  it("stays in a narrow row without narrowMoreItems", () => {
    width(300);
    render(<Composer {...props({ endLeading: end })} />);
    expect(row()).toContain("Model");
    expect(row()).toContain("Trail");
  });

  it("leaves a narrow row with trailing when narrowMoreItems is given", () => {
    width(300);
    render(<Composer {...props({ endLeading: end, narrowMoreItems: <MenuItem>Pick model</MenuItem> })} />);
    expect(row()).not.toContain("Model");
    expect(row()).not.toContain("Trail");
    fireEvent.click(screen.getByRole("button", { name: "More" }));
    expect(screen.getByRole("menuitem", { name: "Pick model" })).toBeInTheDocument();
  });
});
