import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { GeneratedFileRef } from "../../core/generated-file";
import { FileChip, FileChipList } from "./file-chip";

const file: GeneratedFileRef = {
  filename: "report.csv",
  format: "csv",
  size_bytes: 2048,
  download_path: "/v1/files/f1",
};

describe("FileChip", () => {
  it("names the file, its type and size", () => {
    render(<FileChip file={file} />);
    expect(screen.getByText("report.csv")).toBeInTheDocument();
    expect(screen.getByText(/CSV/)).toBeInTheDocument();
  });

  it("offers Download only when the app supplied a downloader and the file can be fetched", () => {
    const { rerender } = render(<FileChip file={file} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    rerender(<FileChip file={{ ...file, download_path: undefined }} onDownload={vi.fn()} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    rerender(<FileChip file={file} onDownload={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Download report.csv" })).toBeInTheDocument();
  });

  it("hands the file to the downloader and reports a failure", async () => {
    const onDownload = vi.fn().mockRejectedValue(new Error("nope"));
    render(<FileChip file={file} onDownload={onDownload} />);
    fireEvent.click(screen.getByRole("button", { name: "Download report.csv" }));
    expect(onDownload).toHaveBeenCalledWith(file);
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Could not download the file"));
  });

  it("renders nothing for an empty list", () => {
    const { container } = render(<FileChipList files={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
