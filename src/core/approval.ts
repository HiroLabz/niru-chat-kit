import type { Interrupt } from "./types";

export type ApprovalFieldType = "string" | "number" | "integer" | "boolean" | "enum" | "object";

/**
 * One field of an authored resume form, mirroring the API's output-builder field
 * shape. Hand-written rather than taken from a generated schema so the approval
 * surfaces do not block on a types regeneration.
 */
export type ApprovalField = {
  name: string;
  type: ApprovalFieldType;
  description: string;
  required: boolean;
  repeated: boolean;
  enum_values: string[];
};

/** An interrupt plus the approval half the API adds when a run pauses on a gated tool. */
export type ApprovalInterrupt = Interrupt & {
  tool?: string | null;
  /** The gated calls waiting, so the card can prefill an edit of the arguments. */
  actions?: Array<{ name: string; args: Record<string, unknown> }>;
  /** True when exactly one call waits and the gate allows an edit decision. */
  can_edit?: boolean;
  fields?: ApprovalField[];
  approval_url?: string | null;
  expires_at?: string | null;
};

/**
 * Per-word display overrides for wire values shown to a reader. Words whose own capital
 * falls inside the word (a brand) or that are acronyms keep their casing wherever they
 * fall; every other word is left as given.
 */
const ENUM_WORD_OVERRIDES: Record<string, string> = {
  ai: "AI",
  api: "API",
  clickhouse: "ClickHouse",
  clickup: "ClickUp",
  crm: "CRM",
  csv: "CSV",
  docusign: "DocuSign",
  dynamodb: "DynamoDB",
  gitlab: "GitLab",
  http: "HTTP",
  hubspot: "HubSpot",
  id: "ID",
  json: "JSON",
  linkedin: "LinkedIn",
  llm: "LLM",
  mcp: "MCP",
  mongodb: "MongoDB",
  mysql: "MySQL",
  nlp: "NLP",
  ocr: "OCR",
  onedrive: "OneDrive",
  openai: "OpenAI",
  pagerduty: "PagerDuty",
  pdf: "PDF",
  png: "PNG",
  postgresql: "PostgreSQL",
  posthog: "PostHog",
  rpm: "RPM",
  sendgrid: "SendGrid",
  sharepoint: "SharePoint",
  sms: "SMS",
  sse: "SSE",
  tenant: "Workspace",
  tiktok: "TikTok",
  tpm: "TPM",
  ttft: "TTFT",
  url: "URL",
  usd: "USD",
  whatsapp: "WhatsApp",
  youtube: "YouTube",
};

/** `p95`, `p99` and friends are percentiles, not words, so they stay shouting. */
const PERCENTILE = /^p\d+$/i;

/**
 * Turns a wire value into sentence case: `needs_input` becomes "Needs input".
 *
 * Underscores and dots are wire punctuation a reader should never see. Only the first
 * character of the first word is capitalised, so an already-cased string a caller hands
 * in (a model name, a customer's own id) is not mangled.
 */
export function humanizeKey(value: string): string {
  const words = value
    .split(/[_.\s]+/)
    .filter(Boolean)
    .map((word) => {
      const lower = word.toLowerCase();
      if (ENUM_WORD_OVERRIDES[lower]) return ENUM_WORD_OVERRIDES[lower];
      return PERCENTILE.test(word) ? word.toUpperCase() : word;
    });
  const joined = words.join(" ");
  return joined.charAt(0).toUpperCase() + joined.slice(1);
}

/**
 * Coerce a resume form's raw text inputs into the JSON the API expects.
 *
 * Every control holds a string (that is what an `<input>` gives you), but the
 * backend validates each value against the field's declared type and refuses a
 * mismatch, so the coercion has to happen before the submit rather than being
 * discovered as a 422. Errors are returned per field name so the form can mark the
 * offending control instead of showing one opaque banner.
 */

export const REQUIRED_FIELD_ERROR = "This field is required.";
export const NUMBER_FIELD_ERROR = "Enter a number.";
export const BOOLEAN_TRUE = "true";
export const BOOLEAN_FALSE = "false";

export type ParsedApprovalValues = {
  values: Record<string, unknown>;
  errors: Record<string, string>;
};

function coerce(field: ApprovalField, raw: string): unknown | undefined {
  if (field.type === "boolean") return raw === BOOLEAN_TRUE;
  if (field.type === "number" || field.type === "integer") {
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return raw;
}

export function parseApprovalValues(
  fields: ApprovalField[],
  raw: Record<string, string>
): ParsedApprovalValues {
  const values: Record<string, unknown> = {};
  const errors: Record<string, string> = {};
  for (const field of fields) {
    const entry = (raw[field.name] ?? "").trim();
    if (!entry) {
      if (field.required) errors[field.name] = REQUIRED_FIELD_ERROR;
      continue;
    }
    const coerced = coerce(field, entry);
    if (coerced === undefined) {
      errors[field.name] = NUMBER_FIELD_ERROR;
      continue;
    }
    values[field.name] = coerced;
  }
  return { values, errors };
}

/**
 * A field's display label: the authored description, else the field's own name.
 *
 * The fallback is humanised because a form schema's field names are wire keys: an
 * approver with no authored description was being asked to fill in `invoice_ref`.
 */
export function fieldLabel(field: ApprovalField): string {
  return field.description || humanizeKey(field.name);
}
