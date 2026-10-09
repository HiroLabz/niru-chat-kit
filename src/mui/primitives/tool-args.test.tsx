import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ToolArgsList as ApprovalArgsList, toolArgEntries as approvalArgEntries } from "./tool-args";

describe("approvalArgEntries", () => {
  it("lists plain values and formats nested ones as JSON", () => {
    const entries = approvalArgEntries({
      format: "csv",
      filename: "fruit",
      rows: [["name", "qty"], ["apple", 2]],
    });
    expect(entries.map((entry) => entry.key)).toEqual(["format", "filename", "rows"]);
    expect(entries[0]).toEqual({ key: "format", value: "csv", block: false });
    expect(entries[2].block).toBe(true);
    expect(JSON.parse(entries[2].value)).toEqual([["name", "qty"], ["apple", 2]]);
  });

  it("leaves out null, blank and empty values but keeps false and zero", () => {
    const entries = approvalArgEntries({ sheets: null, title: "", text: "  ", rows: [], extra: {}, flag: false, n: 0 });
    expect(entries.map((entry) => entry.key)).toEqual(["flag", "n"]);
  });
});

describe("ApprovalArgsList", () => {
  it("shows key: value rows", () => {
    render(<ApprovalArgsList actions={[{ name: "create_file", args: { format: "csv", title: "" } }]} />);
    expect(screen.getByText("format:")).toBeInTheDocument();
    expect(screen.getByText("csv")).toBeInTheDocument();
    expect(screen.queryByText("title:")).not.toBeInTheDocument();
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
});
