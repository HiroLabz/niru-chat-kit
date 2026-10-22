import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ToolArgsList as ApprovalArgsList, argLabel, toolArgEntries as approvalArgEntries } from "./tool-args";

describe("argLabel", () => {
  it("turns snake and camel case into a plain label", () => {
    expect(argLabel("file_name")).toBe("File name");
    expect(argLabel("fileName")).toBe("File name");
    expect(argLabel("mode")).toBe("Mode");
  });
});

describe("approvalArgEntries", () => {
  it("lists plain values and writes nested ones as plain lines, never JSON", () => {
    const entries = approvalArgEntries({
      format: "csv",
      filename: "fruit",
      rows: [{ name: "apple", qty: 2 }],
    });
    expect(entries.map((entry) => entry.key)).toEqual(["format", "filename", "rows"]);
    expect(entries[0]).toEqual({ key: "format", label: "Format", value: "csv", block: false });
    expect(entries[2].block).toBe(true);
    expect(entries[2].value).toBe("1.\n  Name: apple\n  Qty: 2");
    expect(entries[2].value).not.toMatch(/[{}[\]"]/);
  });

  it("joins a list of plain values on one line", () => {
    const [entry] = approvalArgEntries({ columns: ["id", "criterion", "status"] });
    expect(entry).toEqual({ key: "columns", label: "Columns", value: "id, criterion, status", block: false });
  });

  it("leaves out null, blank and empty values but keeps false and zero", () => {
    const entries = approvalArgEntries({ sheets: null, title: "", text: "  ", rows: [], extra: {}, flag: false, n: 0 });
    expect(entries.map((entry) => entry.key)).toEqual(["flag", "n"]);
  });
});

describe("ApprovalArgsList", () => {
  it("shows Label: value rows", () => {
    render(<ApprovalArgsList actions={[{ name: "create_file", args: { format: "csv", title: "" } }]} />);
    expect(screen.getByText("Format:")).toBeInTheDocument();
    expect(screen.getByText("csv")).toBeInTheDocument();
    expect(screen.queryByText("Title:")).not.toBeInTheDocument();
  });

  it("renders nothing when no argument has a value", () => {
    const { container } = render(<ApprovalArgsList actions={[{ name: "x", args: { a: null } }]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("names each call when several wait", () => {
    render(
      <ApprovalArgsList
        actions={[
          { name: "one", args: { a: 1 } },
          { name: "two", args: { b: 2 } },
        ]}
      />
    );
    expect(screen.getByText("one")).toBeInTheDocument();
    expect(screen.getByText("two")).toBeInTheDocument();
  });

  it("shows a nested argument with no braces, brackets or quotes", () => {
    const { container } = render(
      <ApprovalArgsList
        actions={[{ name: "update", args: { blocks: [{ id: "b1", type: "table" }], mode: "draft" } }]}
      />
    );
    const text = container.textContent ?? "";
    expect(text).toContain("Blocks:");
    expect(text).toContain("Type: table");
    expect(text).toContain("Mode: draft");
    expect(text).not.toMatch(/[{}[\]"]/);
  });

  it("folds a long value behind Show all and opens it on demand", () => {
    const lines = Array.from({ length: 20 }, (_, i) => ({ id: `row-${i}` }));
    render(<ApprovalArgsList actions={[{ name: "update", args: { rows: lines } }]} />);
    const toggle = screen.getByRole("button", { name: "Show all" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(toggle);
    expect(screen.getByRole("button", { name: "Show less" })).toHaveAttribute("aria-expanded", "true");
  });

  it("does not offer Show all for a short value", () => {
    render(<ApprovalArgsList actions={[{ name: "x", args: { a: "short" } }]} />);
    expect(screen.queryByRole("button", { name: "Show all" })).not.toBeInTheDocument();
  });
});
