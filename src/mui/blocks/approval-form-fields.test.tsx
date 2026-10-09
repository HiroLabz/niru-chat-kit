import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ApprovalField } from "../../core/approval";
import { ApprovalFormFields } from "./approval-form-fields";

const FIELDS: ApprovalField[] = [
  { name: "invoice_ref", type: "string", description: "", required: true, repeated: false, enum_values: [] },
  { name: "ceiling", type: "number", description: "Ceiling", required: false, repeated: false, enum_values: [] },
];

describe("ApprovalFormFields", () => {
  it("labels a field by its description, else its humanised name", () => {
    render(<ApprovalFormFields fields={FIELDS} values={{}} errors={{}} onChange={vi.fn()} />);
    expect(screen.getByLabelText(/Invoice ref/)).toBeInTheDocument();
    expect(screen.getByLabelText("Ceiling")).toHaveAttribute("type", "number");
  });

  it("reports edits by field name and shows the field error", () => {
    const onChange = vi.fn();
    render(
      <ApprovalFormFields
        fields={FIELDS}
        values={{}}
        errors={{ invoice_ref: "This field is required." }}
        onChange={onChange}
      />
    );
    expect(screen.getByText("This field is required.")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Ceiling"), { target: { value: "5" } });
    expect(onChange).toHaveBeenCalledWith("ceiling", "5");
  });
});
