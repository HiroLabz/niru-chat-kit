/** How a run's response schema was applied; the same values the Hiro API reports. */
export type ShapingStatus = "none" | "applied" | "repaired" | "failed" | "draft_not_applied";

const SHAPING_STATUSES: readonly ShapingStatus[] = ["none", "applied", "repaired", "failed", "draft_not_applied"];

/** The response-schema half of any run projection; every field is optional. */
export type RunShapingFields = {
  output_schema_name?: string | null;
  shaping_status?: string | null;
  error?: { code?: string | null; message?: string | null } | null;
};

export type RunShaping = {
  schemaName: string | null;
  status: ShapingStatus;
  errorMessage: string | null;
};

function isShapingStatus(value: unknown): value is ShapingStatus {
  return typeof value === "string" && (SHAPING_STATUSES as readonly string[]).includes(value);
}

/** Reads the response-schema outcome out of a run projection; an unknown status degrades to `none`. */
export function readRunShaping(source: RunShapingFields | null | undefined): RunShaping {
  const status = isShapingStatus(source?.shaping_status) ? source.shaping_status : "none";
  return {
    schemaName: source?.output_schema_name ?? null,
    status,
    errorMessage: source?.error?.message ?? null,
  };
}
