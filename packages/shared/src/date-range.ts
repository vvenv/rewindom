import { startOfDay, startOfMonth, subDays } from "date-fns";

import {
  endOfBusinessDay,
  formatBusinessDateRange,
  toBusinessTimezone,
} from "./date.js";

export interface DateRange {
  start: string;
  end: string;
}

export interface LabeledDateRange extends DateRange {
  date_label: string;
}

export type CalendarRangePreset =
  | "today"
  | "yesterday"
  | "last_7_days"
  | "last_30_days"
  | "this_month";

/**
 * - today: {@link BUSINESS_TIMEZONE} 日历今日 00:00:00 — 23:59:59
 * - yesterday: {@link BUSINESS_TIMEZONE} 日历昨日 00:00:00 — 23:59:59
 * - last_7_days: 含今日共 7 个自然日，从 6 天前 00:00:00 至今日 23:59:59
 * - last_30_days: 含今日共 30 个自然日
 * - this_month: 本月 1 日 00:00:00 至今日 23:59:59
 */
export function getCalendarRange(
  preset: CalendarRangePreset,
  now: Date = new Date(),
): DateRange {
  const zonedNow = toBusinessTimezone(now);

  if (preset === "today") {
    return formatBusinessDateRange(
      startOfDay(zonedNow),
      endOfBusinessDay(zonedNow),
    );
  }

  if (preset === "yesterday") {
    const day = subDays(zonedNow, 1);
    return formatBusinessDateRange(startOfDay(day), endOfBusinessDay(day));
  }

  if (preset === "last_30_days") {
    return formatBusinessDateRange(
      startOfDay(subDays(zonedNow, 29)),
      endOfBusinessDay(zonedNow),
    );
  }

  if (preset === "this_month") {
    return formatBusinessDateRange(
      startOfDay(startOfMonth(zonedNow)),
      endOfBusinessDay(zonedNow),
    );
  }

  return formatBusinessDateRange(
    startOfDay(subDays(zonedNow, 6)),
    endOfBusinessDay(zonedNow),
  );
}

/** 将 yyyy-MM-dd 转为业务时区整日 API 时间范围 */
export function dateOnlyToApiRange(
  dateStart: string,
  dateEnd?: string,
): DateRange {
  const end = dateEnd ?? dateStart;
  return {
    start: `${dateStart} 00:00:00`,
    end: `${end} 23:59:59`,
  };
}

export function apiRangeMatchesCalendarPreset(
  range: DateRange,
  preset: CalendarRangePreset,
  now: Date = new Date(),
): boolean {
  const expected = getCalendarRange(preset, now);
  return range.start === expected.start && range.end === expected.end;
}
