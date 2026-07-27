import { differenceInHours, formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";

import { EMPTY_DISPLAY } from "./display.js";
import { BUSINESS_TIMEZONE } from "./timezone.js";

/** 将 UTC 时刻转为业务时区（+8）墙钟分量（供 date-fns 日历运算）。 */
export function toBusinessTimezone(instant: Date): Date {
  return toZonedTime(instant, BUSINESS_TIMEZONE);
}

/** 业务时区墙钟时分秒分量。 */
export function getZonedTimeParts(instant: Date): {
  hour: number;
  minute: number;
  second: number;
} {
  const zoned = toBusinessTimezone(instant);
  return {
    hour: zoned.getHours(),
    minute: zoned.getMinutes(),
    second: zoned.getSeconds(),
  };
}

/** 业务时区墙钟小时（0–23）。 */
export function getZonedHour(instant: Date): number {
  return getZonedTimeParts(instant).hour;
}

/** 业务时区自然日结束时刻 23:59:59（参数须为 {@link toBusinessTimezone} 结果）。 */
export function endOfBusinessDay(zonedDay: Date): Date {
  const end = new Date(zonedDay);
  end.setHours(23, 59, 59, 0);
  return end;
}

/** 将业务时区墙钟时刻序列化为 API 用的无时区字符串。 */
export function toBusinessDateString(
  zonedWall: Date | string | number,
): string {
  return formatBusinessDate(toBusinessDate(zonedWall));
}

/** 将业务时区墙钟时刻解析为 UTC Date。 */
export function toBusinessDate(zonedWall: Date | string | number): Date {
  return fromZonedTime(zonedWall, BUSINESS_TIMEZONE);
}

/** 解析业务时区墙钟时间为 UTC；空值或无效输入返回 `null`（供 Prisma 可选 DateTime 字段）。 */
export function toNullableBusinessDate(
  value: Date | string | number | null | undefined,
): Date | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === "string" && value.trim() === "") return null;

  try {
    const parsed = toBusinessDate(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  } catch {
    return null;
  }
}

/** 格式化业务时区日期范围为字符串。 */
export function formatBusinessDateRange(
  startZoned: Date,
  endZoned: Date,
): { start: string; end: string } {
  return {
    start: toBusinessDateString(startZoned),
    end: toBusinessDateString(endZoned),
  };
}

/** 格式化日期为业务时区字符串。 */
export function formatBusinessDate(
  iso: string | number | Date,
  formatStr = "yyyy-MM-dd HH:mm:ss",
): string {
  try {
    return formatInTimeZone(iso, BUSINESS_TIMEZONE, formatStr, {
      locale: zhCN,
    });
  } catch (_error) {
    return EMPTY_DISPLAY;
  }
}

const DEFAULT_RECENT_HOURS = 24;

/** 近期显示相对时间（如「5 分钟前」），超出阈值则回退为 {@link formatBusinessDate}。 */
export function formatBusinessDateOrTimeAgo(
  iso: string | number | Date,
  recentHours = DEFAULT_RECENT_HOURS,
  format = "yyyy-MM-dd HH:mm:ss",
): string {
  try {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
      return EMPTY_DISPLAY;
    }

    if (differenceInHours(new Date(), date) < recentHours) {
      return formatDistanceToNow(date, { addSuffix: true, locale: zhCN });
    }

    return formatBusinessDate(iso, format);
  } catch {
    return EMPTY_DISPLAY;
  }
}
