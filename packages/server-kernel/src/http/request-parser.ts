/**
 * Request parameter parsing utilities
 * Shared functions for parsing and validating request parameters
 */

/**
 * Normalize an Excel cell value (which may be a string, number, rich-text
 * object, hyperlink object, etc.) into a plain string.
 */
export function cellToString(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (typeof obj.text === "string") return obj.text;
    if (Array.isArray(obj.richText)) {
      return obj.richText
        .map((part) =>
          part && typeof (part as { text?: unknown }).text === "string"
            ? (part as { text: string }).text
            : "",
        )
        .join("");
    }
    if ("text" in obj && obj.text != null) return cellToString(obj.text);
    if ("result" in obj) return cellToString(obj.result);
  }
  return String(value);
}

/**
 * Parse a string parameter, returning trimmed string or undefined if not a string
 * Note: empty strings are returned as empty strings (not undefined)
 */
export function parseString(v: unknown): string | undefined {
  return typeof v === "string" ? v.trim() : undefined;
}

export function parseStringArray(v: unknown): string[] | undefined {
  if (v === undefined) return undefined;
  if (!Array.isArray(v)) return undefined;
  return v
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

/**
 * Parse a string parameter that can be null, returning null if explicitly null
 */
export function parseStringOrNull(v: unknown): string | null | undefined {
  if (v === null) return null;
  return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
}

/**
 * Parse an integer parameter from query string or body
 */
export function parseIntParam(v: unknown): number | undefined {
  if (typeof v === "string") {
    const n = parseInt(v, 10);
    return isNaN(n) ? undefined : n;
  }
  if (typeof v === "number") return v;
  return undefined;
}

/**
 * Parse a boolean parameter from various formats
 */
export function parseBooleanParam(v: unknown): boolean | undefined {
  if (typeof v === "boolean") return v;
  if (v === "true" || v === "1") return true;
  if (v === "false" || v === "0") return false;
  return undefined;
}

/**
 * Parse a yes/no label (是/否) into boolean
 */
export function parseYesNoLabel(value: unknown): boolean | undefined {
  if (value === true || value === 1) return true;
  if (value === false || value === 0) return false;
  const normalized = cellToString(value).trim();
  if (normalized === "是" || normalized.toLowerCase() === "true") return true;
  if (normalized === "否" || normalized.toLowerCase() === "false") {
    return false;
  }
  return undefined;
}
