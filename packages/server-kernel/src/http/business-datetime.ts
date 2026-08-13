import { toBusinessDate } from "@rewindom/shared";

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;
const NAIVE_DATETIME_RE =
  /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?$/;

function hasExplicitOffset(value: string): boolean {
  return /(?:Z|[+-]\d{2}:\d{2})$/i.test(value.trim());
}

/** 将筛选时间解析为 UTC 时刻；无时区的日期/时间按 {@link BUSINESS_TIMEZONE} 墙钟理解。 */
export function parseFilterDateTime(
  value: string,
  boundary: "start" | "end" = "start",
): Date {
  const trimmed = value.trim();
  if (hasExplicitOffset(trimmed)) {
    return new Date(trimmed);
  }
  if (DATE_ONLY_RE.test(trimmed)) {
    const suffix = boundary === "end" ? " 23:59:59.999" : " 00:00:00.000";
    return toBusinessDate(`${trimmed}${suffix}`);
  }
  if (NAIVE_DATETIME_RE.test(trimmed)) {
    return toBusinessDate(trimmed);
  }
  if (trimmed.includes("T")) {
    return new Date(trimmed);
  }
  return toBusinessDate(
    `${trimmed} ${boundary === "end" ? "23:59:59.999" : "00:00:00.000"}`,
  );
}

export function parseFilterDateTimeIso(
  value: string,
  boundary: "start" | "end" = "start",
): string {
  return parseFilterDateTime(value, boundary).toISOString();
}
