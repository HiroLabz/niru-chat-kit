"use client";

import { useState } from "react";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import { formatFileSize, type GeneratedFileRef } from "../../core/generated-file";
import { useChatKitStyles } from "../theme";

const FILE_CHIP_MAX_WIDTH = 320;
const DOWNLOAD_FAILED = "Could not download the file. Try again.";

/** Fetches and saves one file. The kit knows no URL: the app supplies this. */
export type FileDownloader = (file: GeneratedFileRef) => Promise<void>;

/**
 * One generated file: its name, type and size, with a Download button where the app
 * supplied a downloader and the file can be fetched.
 */
export function FileChip({ file, onDownload }: { file: GeneratedFileRef; onDownload?: FileDownloader }) {
  const { scheme } = useChatKitStyles();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const canDownload = Boolean(file.download_path) && Boolean(onDownload);

  async function download() {
    if (!onDownload) return;
    setBusy(true);
    setFailed(false);
    try {
      await onDownload(file);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Stack spacing={0.25} sx={{ minWidth: 0, maxWidth: "100%" }}>
      <Stack
        direction="row"
        data-testid="file-chip"
        sx={scheme((c) => ({
          alignItems: "center",
          gap: 1,
          minWidth: 0,
          maxWidth: FILE_CHIP_MAX_WIDTH,
          px: 1.25,
          py: 0.5,
          borderRadius: 2,
          border: "1px solid",
          borderColor: c.border,
          bgcolor: c.surface,
          color: c.text,
        }))}
      >
        <InsertDriveFileOutlinedIcon fontSize="small" aria-hidden />
        <Stack sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="body2" noWrap title={file.filename} sx={{ fontWeight: 600 }}>
            {file.filename}
          </Typography>
          <Typography variant="caption" sx={scheme((c) => ({ color: c.mutedText }))}>
            {file.format.toUpperCase()} · {formatFileSize(file.size_bytes)}
          </Typography>
        </Stack>
        {canDownload ? (
          <Button
            size="small"
            onClick={() => void download()}
            disabled={busy}
            loading={busy}
            startIcon={<FileDownloadOutlinedIcon fontSize="small" />}
            aria-label={`Download ${file.filename}`}
            sx={scheme((c) => ({ color: c.accent }))}
          >
            Download
          </Button>
        ) : null}
      </Stack>
      {failed ? (
        <Typography variant="caption" role="alert" sx={scheme((c) => ({ color: c.error }))}>
          {DOWNLOAD_FAILED}
        </Typography>
      ) : null}
    </Stack>
  );
}

/** The files a turn made, under its answer. Renders nothing when there are none. */
export function FileChipList({ files, onDownload }: { files: GeneratedFileRef[]; onDownload?: FileDownloader }) {
  if (files.length === 0) return null;
  return (
    <Stack direction="row" sx={{ mt: 0.5, flexWrap: "wrap", gap: 0.75, minWidth: 0, maxWidth: "100%" }}>
      {files.map((file) => (
        <FileChip key={file.file_id ?? file.filename} file={file} onDownload={onDownload} />
      ))}
    </Stack>
  );
}
