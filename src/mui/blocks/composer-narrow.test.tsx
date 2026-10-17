import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import MenuItem from "@mui/material/MenuItem";
import { installRecorderWorld, removeRecorderWorld } from "../../core/voice/recorder-test-kit";
import { Composer, type ComposerProps } from "./composer";

const base = { value: "", onChange: vi.fn(), onSubmit: vi.fn() };

/** Makes every element report this width, so the composer thinks it sits in a narrow or a wide box. */
function width(px: number) {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ width: px, height: 40, top: 0, left: 0, right: px, bottom: 40, x: 0, y: 0, toJSON: () => ({}) });
}

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} unobserve() {} });
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Composer toggles on a narrow composer", () => {
  const make = (onToggle = vi.fn()) => [{ id: "web", label: "Search the web", icon: <span>i</span>, active: true, onToggle }];

  it("moves the toggles into the More menu as checkable items", () => {
    width(300);
    const onToggle = vi.fn();
    render(<Composer {...base} toggles={make(onToggle)} />);
    expect(screen.queryByRole("button", { name: /Search the web/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "More, 1 on" }));
    const item = screen.getByRole("menuitemcheckbox", { name: /Search the web/ });
    expect(item).toHaveAttribute("aria-checked", "true");
    fireEvent.click(item);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("lists the toggles above the app's own More items, and keeps Send", () => {
    width(300);
    render(<Composer {...base} toggles={make()} moreActions={<li role="menuitem">Clear</li>} />);
    fireEvent.click(screen.getByRole("button", { name: "More, 1 on" }));
    expect(screen.getByRole("menuitemcheckbox", { name: /Search the web/ })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Clear" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send", hidden: true })).toBeInTheDocument();
  });

  it("keeps the chips on a wide composer", () => {
    width(700);
    render(<Composer {...base} toggles={make()} />);
    expect(screen.getByRole("button", { name: /Search the web/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("button", { name: "More" })).not.toBeInTheDocument();
  });
});

function Harness(props: Partial<ComposerProps>) {
  const [value, setValue] = useState("");
  return <Composer onSubmit={vi.fn()} {...props} value={value} onChange={setValue} />;
}

const rowButtons = () => within(document.querySelector('[data-chat="composer-bar"]') as HTMLElement).getAllByRole("button").map((b) => b.getAttribute("aria-label"));

describe("Composer row on a narrow composer", () => {
  const toggles = (active = false) => [{ id: "web", label: "Search the web", icon: <span>i</span>, active, onToggle: vi.fn() }];

  it("holds attach, More and the call button in that order, and does not wrap", () => {
    width(300);
    render(<Harness onAttach={vi.fn()} onStartCall={vi.fn()} voice={{ transcribe: vi.fn() }} toggles={toggles()} trailing={<button aria-label="Pill">pill</button>} narrowMoreItems={<MenuItem>Model: X</MenuItem>} />);
    expect(rowButtons()).toEqual(["Attach a document", "More", "Start a call"]);
    expect(document.querySelector('[data-chat="composer-bar"]')).toHaveStyle({ flexWrap: "nowrap" });
  });

  it("keeps the app's row controls when it gives no narrow items", () => {
    width(300);
    render(<Harness onAttach={vi.fn()} trailing={<button aria-label="Pill">pill</button>} />);
    expect(rowButtons()).toContain("Pill");
  });

  it("puts the app's narrow items in More, with a close function for them", () => {
    width(300);
    const onPick = vi.fn();
    render(
      <Harness
        trailing={<button aria-label="Pill">pill</button>}
        narrowMoreItems={({ closeMenu }) => (
          <MenuItem onClick={() => { onPick(); closeMenu(); }}>Model: X</MenuItem>
        )}
      />,
    );
    expect(screen.queryByRole("button", { name: "Pill" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "More" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Model: X" }));
    expect(onPick).toHaveBeenCalled();
  });

  afterEach(() => removeRecorderWorld());

  it("ignores narrow items and keeps the row on a wide composer", () => {
    width(700);
    installRecorderWorld();
    render(<Harness onAttach={vi.fn()} voice={{ transcribe: vi.fn() }} trailing={<button aria-label="Pill">pill</button>} narrowMoreItems={<MenuItem>Model: X</MenuItem>} />);
    expect(rowButtons()).toEqual(["Attach a document", "Record a voice message", "Pill", "Send"]);
    expect(screen.queryByRole("button", { name: "More" })).not.toBeInTheDocument();
  });

  it("marks More when a toggle inside is on, and says so in its name", () => {
    width(300);
    render(<Harness toggles={toggles(true)} />);
    expect(screen.getByRole("button", { name: "More, 1 on" })).toBeInTheDocument();
    expect(document.querySelector('[data-chat="more-active"] .MuiBadge-badge')).not.toHaveClass("MuiBadge-invisible");
  });

  it("shows no mark while every toggle is off", () => {
    width(300);
    render(<Harness toggles={toggles(false)} />);
    expect(screen.getByRole("button", { name: "More" })).toBeInTheDocument();
    expect(document.querySelector('[data-chat="more-active"] .MuiBadge-badge')).toHaveClass("MuiBadge-invisible");
  });
});

describe("Composer voice on a narrow composer", () => {
  let world: ReturnType<typeof installRecorderWorld>;
  beforeEach(() => {
    vi.useFakeTimers();
    world = installRecorderWorld();
  });
  afterEach(() => {
    vi.useRealTimers();
    removeRecorderWorld();
  });
  const flush = () => act(async () => void (await vi.advanceTimersByTimeAsync(0)));

  it("offers recording from More, and keeps the stop control in the row while it records", async () => {
    width(300);
    render(<Harness voice={{ transcribe: vi.fn(async () => "hi") }} />);
    expect(rowButtons()).not.toContain("Record a voice message");
    fireEvent.click(screen.getByRole("button", { name: "More" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Record a voice message" }));
    await flush();
    expect(world.tracks.length).toBeGreaterThan(0);
    expect(rowButtons()).toContain("Stop and transcribe");
    expect(rowButtons()).toContain("Cancel recording");
    expect(screen.getByTestId("voice-recorder-status")).toHaveTextContent("Recording");
    fireEvent.click(screen.getByRole("button", { name: "Stop and transcribe" }));
    await flush();
    expect(rowButtons()).not.toContain("Stop and transcribe");
    expect(rowButtons()).not.toContain("Record a voice message");
  });

  it("shows the disabled reason as a disabled item", () => {
    width(300);
    render(<Harness voice={{ transcribe: vi.fn(), disabledReason: "A call is using the microphone." }} />);
    fireEvent.click(screen.getByRole("button", { name: "More" }));
    const item = screen.getByRole("menuitem", { name: /Record a voice message/ });
    expect(item).toHaveAttribute("aria-disabled", "true");
    expect(item).toHaveTextContent("A call is using the microphone.");
  });
});
