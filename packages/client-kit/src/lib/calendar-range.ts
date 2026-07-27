import { apiRangeMatchesCalendarPreset, dateOnlyToApiRange, getCalendarRange, type CalendarRangePreset, type DateRange as ApiDateRange, formatBusinessDate  } from "@be-water/shared";

import type { DateRange } from "react-day-picker";

export interface CalendarRangePresetOption {
  preset: CalendarRangePreset;
  label: string;
}

export const DEFAULT_DATETIME_RANGE_PRESETS: CalendarRangePresetOption[] = [
  { preset: "today", label: "今日" },
  { preset: "yesterday", label: "昨日" },
  { preset: "last_7_days", label: "近一周" },
  { preset: "last_30_days", label: "近一月" },
];

export const REPORT_DATE_RANGE_PRESETS: CalendarRangePresetOption[] = [
  { preset: "today", label: "今日" },
  { preset: "yesterday", label: "昨日" },
  { preset: "last_7_days", label: "近一周" },
  { preset: "last_30_days", label: "近一月" },
];

export function naiveDatetimeToDate(value: string): Date {
  return new Date(value);
}

export function presetToDateRange(preset: CalendarRangePreset): DateRange {
  const { start, end } = getCalendarRange(preset);
  return {
    from: naiveDatetimeToDate(start),
    to: naiveDatetimeToDate(end),
  };
}

export function apiDateRangeToDateRange(
  range?: ApiDateRange,
): DateRange | undefined {
  if (!range?.start) return undefined;
  return {
    from: naiveDatetimeToDate(range.start),
    to: naiveDatetimeToDate(range.end),
  };
}

export function rangeMatchesPreset(
  range: DateRange | undefined,
  preset: CalendarRangePreset,
): boolean {
  if (!range?.from || !range?.to) return false;
  return apiRangeMatchesCalendarPreset(
    {
      start: formatBusinessDate(range.from),
      end: formatBusinessDate(range.to),
    },
    preset,
  );
}

export function normalizeDateOnlyRange(range: DateRange): DateRange {
  const apiRange = dateRangeToBusinessDatetimeRange(range);
  return apiDateRangeToDateRange(apiRange)!;
}

export function dateRangeToBusinessDatetimeRange(
  range: DateRange,
): ApiDateRange {
  const from = range.from!;
  const to = range.to ?? from;
  const startDate = formatBusinessDate(from, "yyyy-MM-dd");
  const endDate = formatBusinessDate(to, "yyyy-MM-dd");
  return dateOnlyToApiRange(startDate, endDate);
}

export function dateRangeToDateOnlyParams(range: DateRange | undefined): {
  date_start?: string;
  date_end?: string;
} {
  if (!range?.from) return {};
  return {
    date_start: formatBusinessDate(range.from, "yyyy-MM-dd"),
    date_end: formatBusinessDate(range.to ?? range.from, "yyyy-MM-dd"),
  };
}

export function dateOnlyParamsToDateRange(
  dateStart?: string,
  dateEnd?: string,
): DateRange | undefined {
  if (!dateStart) return undefined;
  const apiRange = dateOnlyToApiRange(dateStart, dateEnd);
  return apiDateRangeToDateRange(apiRange);
}

const DATE_ONLY_PARAM_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** 列表/仪表盘 URL 与 API 共用的 datetime 筛选参数 ↔ DateRange */
export function datetimeFilterParamsToDateRange(
  startDate?: string,
  endDate?: string,
): DateRange | undefined {
  if (!startDate) return undefined;

  if (DATE_ONLY_PARAM_PATTERN.test(startDate)) {
    return dateOnlyParamsToDateRange(startDate, endDate);
  }

  const from = naiveDatetimeToDate(startDate);
  const endStr = endDate ?? startDate;
  const to = DATE_ONLY_PARAM_PATTERN.test(endStr)
    ? naiveDatetimeToDate(`${endStr} 23:59:59`)
    : naiveDatetimeToDate(endStr);

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return undefined;
  }
  return { from, to };
}

export function dateRangeToDatetimeFilterParams(range: DateRange | undefined): {
  start_date?: string;
  end_date?: string;
} {
  if (!range?.from) return {};
  const to = range.to ?? range.from;
  return {
    start_date: formatBusinessDate(range.from),
    end_date: formatBusinessDate(to),
  };
}

export function formatPickerRangeLabel(
  from: Date,
  to: Date,
  options?: { dateOnly?: boolean },
): string {
  if (options?.dateOnly) {
    const start = formatBusinessDate(from, "yyyy-MM-dd");
    const end = formatBusinessDate(to, "yyyy-MM-dd");
    return start === end ? start : `${start} - ${end}`;
  }

  const fromDate = formatBusinessDate(from, "yyyy-MM-dd");
  const toDate = formatBusinessDate(to, "yyyy-MM-dd");
  const fromTime = formatBusinessDate(from, "HH:mm:ss");
  const toTime = formatBusinessDate(to, "HH:mm:ss");

  if (fromTime === "00:00:00" && toTime === "23:59:59" && fromDate !== toDate) {
    return `${fromDate} - ${toDate}`;
  }

  if (fromDate === toDate) {
    return `${fromDate} ${fromTime} - ${toTime}`;
  }

  if (formatBusinessDate(from, "yyyy") === formatBusinessDate(to, "yyyy")) {
    return `${fromDate} ${fromTime} - ${formatBusinessDate(to, "MM-dd HH:mm:ss")}`;
  }

  return `${fromDate} ${fromTime} - ${toDate} ${toTime}`;
}

export function extractPickerTime(
  date: Date | undefined,
  fallback: string,
): string {
  if (!date) return fallback;
  return formatBusinessDate(date, "HH:mm:ss");
}

export function applyPickerTime(
  date: Date | undefined,
  timeStr: string,
): Date | undefined {
  if (!date) return undefined;
  const [h, m, s] = timeStr.split(":").map(Number);
  const next = new Date(date);
  next.setHours(h, m, s);
  return next;
}
