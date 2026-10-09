import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { EDIT_FORM_COPY, TURN_ACTION_COPY } from "../../core/stream/turn-copy";
import { Conversation } from "./conversation";
import { MessageEditForm } from "./message-edit-form";

describe("MessageEditForm", () => {
  it("saves only changed, non-empty wording", () => {
    const onSave = vi.fn();
    render(<MessageEditForm initialText="Why?" disabled={false} onSave={onSave} onCancel={vi.fn()} />);
    const save = screen.getByRole("button", { name: EDIT_FORM_COPY.save });
    expect(save).toBeDisabled();
    fireEvent.change(screen.getByLabelText(EDIT_FORM_COPY.label), { target: { value: "  Why not?  " } });
    fireEvent.click(save);
    expect(onSave).toHaveBeenCalledWith("Why not?");
  });

  it("cancels with Escape and with the Cancel button", () => {
    const onCancel = vi.fn();
    render(<MessageEditForm initialText="Why?" disabled={false} onSave={vi.fn()} onCancel={onCancel} />);
    fireEvent.keyDown(screen.getByLabelText(EDIT_FORM_COPY.label), { key: "Escape" });
    fireEvent.click(screen.getByRole("button", { name: EDIT_FORM_COPY.cancel }));
    expect(onCancel).toHaveBeenCalledTimes(2);
  });

  it("opens from the Edit control on a question and sends the new wording to onEdit", () => {
    const onEdit = vi.fn();
    render(
      <Conversation
        messages={[{ id: "u1", serverId: "s-u1", role: "user", text: "Why?" }]}
        turnActions={{ disabled: false, onEdit }}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: TURN_ACTION_COPY.edit }));
    fireEvent.change(screen.getByLabelText(EDIT_FORM_COPY.label), { target: { value: "Why so?" } });
    fireEvent.click(screen.getByRole("button", { name: EDIT_FORM_COPY.save }));
    expect(onEdit).toHaveBeenCalledWith("s-u1", "Why so?");
  });
});
