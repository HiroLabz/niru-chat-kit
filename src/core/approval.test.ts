import { describe, expect, it } from "vitest";
import { fieldLabel, humanizeKey, parseApprovalValues, REQUIRED_FIELD_ERROR, type ApprovalField } from "./approval";

function field(overrides: Partial<ApprovalField> = {}): ApprovalField {
  return {
    name: "invoice_ref",
    type: "string",
    description: null,
    required: true,
    enum_values: [],
    ...overrides,
  } as ApprovalField;
}

describe("fieldLabel", () => {
  it("prefers the description the author wrote", () => {
    expect(fieldLabel(field({ description: "Which invoice?" }))).toBe("Which invoice?");
  });

  /**
   * With no authored description the approver was being asked to fill in `invoice_ref` —
   * a wire key on a form shown to someone signing off on a payment.
   */
  it("humanises the wire field name when no description was authored", () => {
    expect(fieldLabel(field())).toBe("Invoice ref");
  });
});

describe("parseApprovalValues", () => {
  it("keys errors by the wire field name, not by the label shown beside it", () => {
    const parsed = parseApprovalValues([field()], { invoice_ref: "  " });
    expect(parsed.errors).toEqual({ invoice_ref: REQUIRED_FIELD_ERROR });
  });
});

describe("humanizeKey", () => {
  it("sentence-cases wire keys and keeps acronyms", () => {
    expect(humanizeKey("needs_input")).toBe("Needs input");
    expect(humanizeKey("tenant_llm.updated")).toBe("Workspace LLM updated");
    expect(humanizeKey("p95_latency")).toBe("P95 latency");
  });
});
