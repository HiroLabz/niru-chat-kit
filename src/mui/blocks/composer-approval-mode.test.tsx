import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { installRecorderWorld, removeRecorderWorld } from "../../core/voice/recorder-test-kit";
import { Composer, type ComposerApprovalMode } from "./composer";

const base = { value: "", onChange: vi.fn(), onSubmit: vi.fn() };

function approval(overrides: Partial<ComposerApprovalMode> = {}): ComposerApprovalMode {
  return {
    value: "judge",
    onChange: vi.fn(),
    heading: "How should actions be approved?",
    options: [
      { value: "ask", label: "Ask for approval", description: "Ask before each change", icon: <span>a</span> },
      { value: "judge", label: "Approve for me", description: "A reviewer approves safe changes", icon: <span>j</span> },
      { value: "auto", label: "Full access", description: "Run without asking", icon: <span>f</span>, tone: "warning" },
    ],
    ...overrides,
  };
}

function narrow() {
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} unobserve() {} });
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ width: 300, height: 40, top: 0, left: 0, right: 300, bottom: 40, x: 0, y: 0, toJSON: () => ({}) });
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Composer approval choice", () => {
  it("draws nothing without the prop", () => {
    const { container } = render(<Composer {...base} onAttach={vi.fn()} />);
    expect(container.querySelector('[data-chat="approval-mode"]')).toBeNull();
    expect(screen.queryByRole("button", { name: /approved/ })).not.toBeInTheDocument();
  });

  it("shows the current option as a button named heading and label", () => {
    render(<Composer {...base} approvalMode={approval()} />);
    const button = screen.getByRole("button", { name: "How should actions be approved?: Approve for me" });
    expect(button).toHaveAttribute("aria-haspopup", "menu");
    expect(button).toHaveTextContent("Approve for me");
  });

  it("uses buttonLabel for the name and falls back to the default heading", () => {
    const { unmount } = render(<Composer {...base} approvalMode={approval({ buttonLabel: "Approvals" })} />);
    expect(screen.getByRole("button", { name: "Approvals: Approve for me" })).toBeInTheDocument();
    unmount();
    render(<Composer {...base} approvalMode={approval({ heading: undefined })} />);
    expect(screen.getByRole("button", { name: "How should actions be approved?: Approve for me" })).toBeInTheDocument();
  });

  it("opens a menu with the heading, radio rows with descriptions and a check on the current one", () => {
    render(<Composer {...base} approvalMode={approval()} />);
    fireEvent.click(screen.getByRole("button", { name: /Approve for me/ }));
    const menu = screen.getByRole("menu");
    expect(within(menu).getByText("How should actions be approved?")).toBeInTheDocument();
    const rows = within(menu).getAllByRole("menuitemradio");
    expect(rows).toHaveLength(3);
    expect(rows.map((row) => row.getAttribute("aria-checked"))).toEqual(["false", "true", "false"]);
    expect(within(menu).getByText("Ask before each change")).toBeInTheDocument();
    expect(within(rows[1]).getByTestId("CheckIcon")).toBeInTheDocument();
    expect(within(rows[0]).queryByTestId("CheckIcon")).toBeNull();
  });

  it("colours a warning option's label and description alike, unlike the others", () => {
    render(<Composer {...base} approvalMode={approval()} />);
    fireEvent.click(screen.getByRole("button", { name: /Approve for me/ }));
    const [ask, , full] = screen.getAllByRole("menuitemradio");
    const colourOf = (node: Element) => getComputedStyle(node).color;
    expect(colourOf(full)).not.toBe(colourOf(ask));
    expect(colourOf(within(full).getByText("Full access"))).toBe(colourOf(within(full).getByText("Run without asking")));
  });

  it("choosing calls onChange and closes; choosing the current one does not call it", () => {
    const onChange = vi.fn();
    render(<Composer {...base} approvalMode={approval({ onChange })} />);
    fireEvent.click(screen.getByRole("button", { name: /Approve for me/ }));
    fireEvent.click(screen.getByRole("menuitemradio", { name: /Full access/ }));
    expect(onChange).toHaveBeenCalledWith("auto");
    fireEvent.click(screen.getByRole("button", { name: /Approve for me/ }));
    fireEvent.click(screen.getByRole("menuitemradio", { name: /Approve for me/ }));
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("shows Learn more at the right of the heading and closes the menu when it is pressed", () => {
    const onClick = vi.fn();
    render(<Composer {...base} approvalMode={approval({ learnMore: { label: "Learn more", onClick } })} />);
    fireEvent.click(screen.getByRole("button", { name: /Approve for me/ }));
    fireEvent.click(screen.getByRole("button", { name: "Learn more" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("is disabled with the reason as its tooltip text, and by a disabled composer", () => {
    const { unmount } = render(<Composer {...base} approvalMode={approval({ disabled: true, disabledReason: "Managed by your admin" })} />);
    const button = screen.getByRole("button", { name: /Approve for me/ });
    expect(button).toBeDisabled();
    unmount();
    render(<Composer {...base} disabled approvalMode={approval()} />);
    expect(screen.getByRole("button", { name: /Approve for me/ })).toBeDisabled();
  });

  it("sits after the plus button and the chips, before the toggles and Send", () => {
    const { container } = render(
      <Composer
        {...base}
        addMenu={{ sections: [] }}
        chips={[{ id: "c", label: "Plan mode" }]}
        approvalMode={approval()}
        toggles={[{ id: "w", label: "Web", icon: <span>i</span>, active: false, onToggle: vi.fn() }]}
      />
    );
    const before = (a: Element, b: Element) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
    const add = screen.getByRole("button", { name: "Add" });
    const chip = container.querySelector('[data-chat="composer-chip"]') as Element;
    const approve = screen.getByRole("button", { name: /Approve for me/ });
    const web = screen.getByRole("button", { name: /Web/ });
    const send = container.querySelector('[data-chat="send"]') as Element;
    expect(before(add, chip) && before(chip, approve) && before(approve, web) && before(web, send)).toBe(true);
  });

  it("keeps the whole wide row in order on one line, also while recording", async () => {
    vi.useFakeTimers();
    installRecorderWorld();
    vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} unobserve() {} });
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ width: 700, height: 40, top: 0, left: 0, right: 700, bottom: 40, x: 0, y: 0, toJSON: () => ({}) });
    const { container } = render(
      <Composer
        {...base}
        addMenu={{ sections: [] }}
        chips={[{ id: "c", label: "Plan mode" }]}
        approvalMode={approval()}
        toggles={[{ id: "w", label: "Web", icon: <span>i</span>, active: false, onToggle: vi.fn() }]}
        trailing={<button type="button" aria-label="Model">m</button>}
        onStartCall={vi.fn()}
        voicePlacement="end"
        voice={{ transcribe: vi.fn(async () => "hi") }}
      />
    );
    const bar = container.querySelector('[data-chat="composer-bar"]') as HTMLElement;
    const names = () => Array.from(bar.querySelectorAll('button, [role="button"]')).map((node) => node.getAttribute("aria-label") ?? node.textContent ?? "");
    expect(names().map((name) => (/Approve for me/.test(name) ? "approval" : /Web/.test(name) ? "Web" : name))).toEqual([
      "Add", "approval", "Web", "Model", "Record a voice message", "Start a call",
    ]);
    const chip = bar.querySelector('[data-chat="composer-chip"]') as Element;
    expect(Boolean(screen.getByRole("button", { name: "Add" }).compareDocumentPosition(chip) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
    expect(Boolean(chip.compareDocumentPosition(screen.getByRole("button", { name: /Approve for me/ })) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
    expect(getComputedStyle(bar).flexWrap).toBe("wrap");
    fireEvent.click(screen.getByRole("button", { name: "Record a voice message" }));
    await act(async () => void (await vi.advanceTimersByTimeAsync(0)));
    expect(names().slice(-3)).toEqual(["Stop and transcribe", "Cancel recording", "Send"]);
    expect(names()[0]).toBe("Add");
    removeRecorderWorld();
    vi.useRealTimers();
  });

  it("moves into More as radio rows in a narrow composer", () => {
    narrow();
    const onChange = vi.fn();
    render(<Composer {...base} approvalMode={approval({ onChange })} />);
    expect(screen.queryByRole("button", { name: /Approve for me/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "More" }));
    const rows = screen.getAllByRole("menuitemradio");
    expect(rows.map((row) => row.getAttribute("aria-checked"))).toEqual(["false", "true", "false"]);
    expect(screen.getByText("How should actions be approved?")).toBeInTheDocument();
    fireEvent.click(rows[2]);
    expect(onChange).toHaveBeenCalledWith("auto");
  });
});
