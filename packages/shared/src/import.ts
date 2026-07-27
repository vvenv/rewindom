/** Structured validation error for Excel import preview. */
export interface ImportValidationError {
  row: number;
  column?: string;
  value?: string;
  message: string;
}

/** One row of Excel data in import preview. */
export interface ImportPreviewRow {
  row: number;
  cells: Record<string, string>;
  has_error: boolean;
  /** Per-column error messages for tooltips (column name → messages). */
  cell_errors?: Record<string, string[]>;
}

/** Result of a dry-run import validation. */
export interface ImportPreviewResult {
  valid: boolean;
  total_rows: number;
  summary: Record<string, number>;
  errors: ImportValidationError[];
  columns: string[];
  rows: ImportPreviewRow[];
  /** Present when preview is valid; reuse on submit to skip re-upload. */
  preview_token?: string;
  filename?: string;
}

/** Submit import using a prior preview session. */
export interface ImportSubmitBody {
  preview_token: string;
}

export function emptyImportPreviewResult(
  message: string,
): ImportPreviewResult {
  return {
    valid: false,
    total_rows: 0,
    summary: {},
    errors: [{ row: 0, message }],
    columns: [],
    rows: [],
  };
}

function missingRequiredImportColumnError(
  column: string,
): ImportValidationError {
  return { row: 0, column, message: `缺少必需列「${column}」` };
}

/** Returns file-level error when a required column is absent from headers. */
export function importMissingRequiredColumnError(
  headers: Iterable<string>,
  column: string,
): ImportValidationError | null {
  if (new Set(headers).has(column)) {
    return null;
  }
  return missingRequiredImportColumnError(column);
}

/** Preview result when a required column is absent; null if the column exists. */
export function importMissingRequiredColumnPreview(
  headers: Iterable<string>,
  column: string,
  totalRows = 0,
): ImportPreviewResult | null {
  const error = importMissingRequiredColumnError(headers, column);
  if (!error) {
    return null;
  }
  return {
    valid: false,
    total_rows: totalRows,
    summary: {},
    errors: [error],
    columns: [],
    rows: [],
  };
}

export function importValidationFailedPreview(
  errors: ImportValidationError[],
): ImportPreviewResult {
  return {
    valid: false,
    total_rows: 0,
    summary: {},
    errors,
    columns: [],
    rows: [],
  };
}

/** Compact error text for a highlighted preview cell tooltip. */
export function formatImportCellError(err: ImportValidationError): string {
  const valuePart =
    err.value !== undefined && err.value !== ""
      ? `当前值「${err.value}」：`
      : "";
  return `${valuePart}${err.message}`;
}
