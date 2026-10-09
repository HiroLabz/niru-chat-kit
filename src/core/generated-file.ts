import type { WorkingStep } from "./working-process";
import type { TurnPart } from "./stream/turn-parts";

export type GeneratedFileFormat = "csv" | "xlsx" | "docx" | "pdf";

/**
 * A file the agent built with `create_file`, as the `tool` stream frame or the stored message
 * names it. No bytes travel here. A signed-in console gets `/v1/files/{id}`; a public surface
 * (widget, share link) gets a short-lived `/v1/files/signed/{token}` path and no `file_id`.
 * Without a `download_path` the chip shows the name and offers no download.
 */
export type GeneratedFileRef = {
  file_id?: string | null;
  filename: string;
  format: GeneratedFileFormat;
  size_bytes: number;
  download_path?: string | null;
};

const BYTES_PER_UNIT = 1024;
const SIZE_UNITS = ["B", "KB", "MB", "GB"] as const;

/** "532 B", "4.2 KB", "1.3 MB". */
export function formatFileSize(bytes: number): string {
  let value = Math.max(0, bytes);
  let unit = 0;
  while (value >= BYTES_PER_UNIT && unit < SIZE_UNITS.length - 1) {
    value /= BYTES_PER_UNIT;
    unit += 1;
  }
  const text = unit === 0 || value >= 10 ? Math.round(value).toString() : value.toFixed(1);
  return `${text} ${SIZE_UNITS[unit]}`;
}

type StepsHolder = { steps?: WorkingStep[]; parts?: TurnPart[]; files?: GeneratedFileRef[] };

/** Every file this turn made, in order, each listed once. */
export function filesOfTurn(message: StepsHolder): GeneratedFileRef[] {
  const steps = [
    ...(message.steps ?? []),
    ...(message.parts ?? []).flatMap((part) => (part.kind === "activity" ? part.steps : [])),
  ];
  const seen = new Set<string>();
  const files: GeneratedFileRef[] = [];
  const add = (file: GeneratedFileRef, fallbackKey: string) => {
    const key = file.file_id ?? fallbackKey;
    if (seen.has(key)) return;
    seen.add(key);
    files.push(file);
  };
  for (const file of message.files ?? []) add(file, `stored:${file.filename}`);
  for (const step of steps) {
    if (step.file) add(step.file, `${step.id}:${step.file.filename}`);
  }
  return files;
}
