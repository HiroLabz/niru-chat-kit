import { describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { Composer, type ComposerProps } from "./composer";

function Harness(props: Partial<ComposerProps> & { onSubmit?: () => void }) {
  const [value, setValue] = useState(props.value ?? "");
  return (
    <Composer
      {...props}
      value={value}
      onChange={setValue}
      onSubmit={props.onSubmit ?? vi.fn()}
    />
  );
}

describe("Composer", () => {
  it("keeps Send off until there is text, then sends on click and on Enter", () => {
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
    const box = screen.getByRole("textbox");
    fireEvent.change(box, { target: { value: "hello" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(box, { key: "Enter" });
    expect(onSubmit).toHaveBeenCalledTimes(2);
    fireEvent.keyDown(box, { key: "Enter", shiftKey: true });
    expect(onSubmit).toHaveBeenCalledTimes(2);
  });

  it("turns Send into Stop while a run is busy", () => {
    const onStop = vi.fn();
    render(<Harness busy onStop={onStop} />);
    expect(screen.queryByRole("button", { name: "Send" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Stop" }));
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it("does nothing when disabled", () => {
    render(<Harness disabled value="text" />);
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
    expect(screen.getByRole("textbox")).toBeDisabled();
  });

  it("offers attach only when the surface handles files, and hands the files over", () => {
    const { rerender, container } = render(<Harness />);
    expect(screen.queryByRole("button", { name: "Attach a document" })).not.toBeInTheDocument();
    const onAttach = vi.fn();
    rerender(<Harness onAttach={onAttach} />);
    expect(screen.getByRole("button", { name: "Attach a document" })).toBeInTheDocument();
    const file = new File(["x"], "notes.txt", { type: "text/plain" });
    fireEvent.change(container.querySelector("input[type=file]") as HTMLInputElement, { target: { files: [file] } });
    expect(onAttach).toHaveBeenCalledWith([file]);
  });

  it("lists attachments as chips that can be removed", () => {
    const onRemoveAttachment = vi.fn();
    render(
      <Harness
        attachments={[{ id: "f1", name: "plan.pdf" }]}
        onRemoveAttachment={onRemoveAttachment}
      />
    );
    expect(screen.getByText("plan.pdf")).toBeInTheDocument();
    fireEvent.click(document.querySelector(".MuiChip-deleteIcon") as Element);
    expect(onRemoveAttachment).toHaveBeenCalledWith("f1");
  });

  it("fills the box from a matching suggestion with the arrow keys and Enter, without sending", () => {
    const onSubmit = vi.fn();
    render(<Harness suggestions={["Summarize my latest activity"]} onSubmit={onSubmit} />);
    const box = screen.getByRole("textbox");
    fireEvent.change(box, { target: { value: "summar" } });
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    fireEvent.keyDown(box, { key: "ArrowDown" });
    fireEvent.keyDown(box, { key: "Enter" });
    expect(box).toHaveValue("Summarize my latest activity");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("opens and closes the settings body in flow", () => {
    render(<Harness settings={<p>Reasoning effort</p>} />);
    expect(screen.queryByText("Reasoning effort")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Run settings" }));
    expect(screen.getByText("Reasoning effort")).toBeInTheDocument();
  });

  it("passes root attributes to the surface", () => {
    const { container } = render(<Harness rootProps={{ "data-ph-mask": "" }} />);
    expect(container.querySelector("[data-ph-mask]")).not.toBeNull();
  });

  describe("attachments for one message", () => {
    const png = new File(["x"], "shot.png", { type: "image/png" });

    function paste(target: Element, data: Partial<DataTransfer>) {
      return fireEvent.paste(target, { clipboardData: data });
    }

    it("attaches a pasted image and keeps the paste from also landing as text", () => {
      const onAttach = vi.fn();
      render(<Harness onAttach={onAttach} />);
      const notPrevented = paste(screen.getByRole("textbox"), { files: [png] as unknown as FileList, items: [] as unknown as DataTransferItemList, getData: () => "" });
      expect(onAttach).toHaveBeenCalledWith([png]);
      expect(notPrevented).toBe(false);
    });

    it("attaches files that arrive only as clipboard items", () => {
      const onAttach = vi.fn();
      render(<Harness onAttach={onAttach} />);
      const item = { kind: "file", getAsFile: () => png } as unknown as DataTransferItem;
      paste(screen.getByRole("textbox"), { files: [] as unknown as FileList, items: [item] as unknown as DataTransferItemList });
      expect(onAttach).toHaveBeenCalledWith([png]);
    });

    it("leaves pasted text alone", () => {
      const onAttach = vi.fn();
      render(<Harness onAttach={onAttach} />);
      const notPrevented = paste(screen.getByRole("textbox"), { files: [] as unknown as FileList, items: [] as unknown as DataTransferItemList, getData: () => "hello" });
      expect(onAttach).not.toHaveBeenCalled();
      expect(notPrevented).toBe(true);
    });

    it("does not touch the clipboard when the surface takes no files", () => {
      const notPrevented = paste(render(<Harness />).container.querySelector("textarea")!, { files: [png] as unknown as FileList });
      expect(notPrevented).toBe(true);
    });

    it("draws an image as a thumbnail and a PDF as a chip, each with a named remove button", () => {
      const onRemoveAttachment = vi.fn();
      render(
        <Harness
          attachments={[
            { id: "a", name: "shot.png", kind: "image", previewUrl: "blob:x" },
            { id: "b", name: "plan.pdf", kind: "pdf" },
          ]}
          onRemoveAttachment={onRemoveAttachment}
        />
      );
      expect(screen.getByRole("img", { name: "shot.png" })).toHaveAttribute("src", "blob:x");
      expect(screen.getByText("plan.pdf")).toBeInTheDocument();
      expect(document.querySelector("[data-testid=PictureAsPdfOutlinedIcon]")).not.toBeNull();
      fireEvent.click(screen.getByRole("button", { name: "Remove plan.pdf" }));
      fireEvent.click(screen.getByRole("button", { name: "Remove shot.png" }));
      expect(onRemoveAttachment).toHaveBeenNthCalledWith(1, "b");
      expect(onRemoveAttachment).toHaveBeenNthCalledWith(2, "a");
    });

    it("greys the paperclip with its own tooltip while paste and drop still reach the host", () => {
      const onAttach = vi.fn();
      render(<Harness onAttach={onAttach} attachDisabled attachTooltip="This agent doesn't accept files." attachLabel="Attach files" attachmentNotice="Nope." />);
      expect(screen.getByRole("button", { name: "Attach files" })).toBeDisabled();
      expect(screen.getByRole("status")).toHaveTextContent("Nope.");
      paste(screen.getByRole("textbox"), { files: [png] as unknown as FileList });
      expect(onAttach).toHaveBeenCalledWith([png]);
    });

    it("tells the writer a message is needed to send the files", () => {
      render(<Harness attachments={[{ id: "a", name: "plan.pdf", kind: "pdf" }]} />);
      expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
    });
  });

  describe("call button", () => {
    it("is absent without onStartCall", () => {
      render(<Harness />);
      expect(screen.queryByRole("button", { name: "Start a call" })).not.toBeInTheDocument();
    });

    it("calls onStartCall, sits before Send, and takes a custom label", () => {
      const onStartCall = vi.fn();
      render(<Harness onStartCall={onStartCall} callLabel="Call Niru" />);
      const call = screen.getByRole("button", { name: "Call Niru" });
      fireEvent.click(call);
      expect(onStartCall).toHaveBeenCalledTimes(1);
      const send = screen.getByRole("button", { name: "Send" });
      expect(call.compareDocumentPosition(send) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it("uses the default label and greys out with callDisabled or disabled", () => {
      const onStartCall = vi.fn();
      const { rerender } = render(<Harness onStartCall={onStartCall} callDisabled />);
      expect(screen.getByRole("button", { name: "Start a call" })).toBeDisabled();
      rerender(<Harness onStartCall={onStartCall} disabled />);
      expect(screen.getByRole("button", { name: "Start a call" })).toBeDisabled();
    });
  });
});
