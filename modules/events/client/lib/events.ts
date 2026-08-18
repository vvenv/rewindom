import type { EventStatus, EventTopic } from "../../shared/index.js";

/** 列表排序下拉的取值 ⇄ 服务端 sort_by/sort_dir 的映射（服务端白名单见 event.service.ts）。 */
export const EVENT_SORT_VALUES = [
  "latest",
  "rising",
  "hottest",
  "earliest",
] as const;
export type EventSortValue = (typeof EVENT_SORT_VALUES)[number];

const SORT_MAP: Record<
  EventSortValue,
  { sortBy: string; sortDir: "asc" | "desc" }
> = {
  latest: { sortBy: "last_activity_at", sortDir: "desc" },
  // 不排 velocity_pct：缺基线时它恒为 0，「升温」会排出一串空值。
  // 近窗有几个源在跟进才是「正在扩散」的可核对度量（与首页 Rising 同一把尺子）。
  rising: { sortBy: "recent_source_count", sortDir: "desc" },
  hottest: { sortBy: "heat_score", sortDir: "desc" },
  earliest: { sortBy: "first_seen_at", sortDir: "asc" },
};

export const DEFAULT_EVENT_SORT: EventSortValue = "latest";

export function fromEventSortValue(value: string): {
  sortBy: string;
  sortDir: "asc" | "desc";
} {
  const key = (EVENT_SORT_VALUES as readonly string[]).includes(value)
    ? (value as EventSortValue)
    : DEFAULT_EVENT_SORT;
  return SORT_MAP[key];
}

export function toEventSortValue(
  sortBy?: string,
  sortDir?: "asc" | "desc",
): EventSortValue {
  const found = EVENT_SORT_VALUES.find(
    (value) =>
      SORT_MAP[value].sortBy === sortBy && SORT_MAP[value].sortDir === sortDir,
  );
  return found ?? DEFAULT_EVENT_SORT;
}

/** 卡片上的来源串：「OpenAI · Hacker News · TechCrunch +2」。 */
export function formatSourceNames(names: readonly string[], max = 3): string {
  if (names.length === 0) {
    return "";
  }
  const shown = names.slice(0, max).join(" · ");
  const rest = names.length - max;
  return rest > 0 ? `${shown} +${rest}` : shown;
}

/**
 * 相对时间的数值部分。格式化交给调用方的 `Intl.RelativeTimeFormat`，
 * 这里只做纯计算，才能在测试里对时间断言。
 */
export function relativeTimeParts(
  iso: string,
  now: Date = new Date(),
): { value: number; unit: Intl.RelativeTimeFormatUnit } {
  const diffMs = new Date(iso).getTime() - now.getTime();
  const diffMinutes = Math.round(diffMs / 60_000);

  if (Math.abs(diffMinutes) < 60) {
    return { value: diffMinutes, unit: "minute" };
  }
  const diffHours = Math.round(diffMs / 3_600_000);
  if (Math.abs(diffHours) < 24) {
    return { value: diffHours, unit: "hour" };
  }
  return { value: Math.round(diffMs / 86_400_000), unit: "day" };
}

/** 时间线上显示的是钟点，不是相对时间——用户要看的是事情的先后顺序。 */
export function formatClockTime(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

export function formatDayLabel(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
  }).format(new Date(iso));
}

/** 时间线按天分组：跨天的事件才看得出「第二天官方又回应了」。 */
export function groupByDay<T extends { occurred_at: string }>(
  entries: readonly T[],
): { day: string; entries: T[] }[] {
  const groups = new Map<string, T[]>();
  for (const entry of entries) {
    const day = entry.occurred_at.slice(0, 10);
    const bucket = groups.get(day);
    if (bucket) {
      bucket.push(entry);
    } else {
      groups.set(day, [entry]);
    }
  }
  return [...groups.entries()].map(([day, items]) => ({ day, entries: items }));
}

/** 状态徽章的配色。与 MVP §7 的四个阶段一一对应。 */
export const EVENT_STATUS_TONE: Record<EventStatus, string> = {
  developing:
    "border-transparent bg-orange-500/15 text-orange-600 dark:text-orange-400",
  active: "border-transparent bg-blue-500/15 text-blue-600 dark:text-blue-400",
  cooling: "border-transparent bg-muted text-muted-foreground",
  resolved:
    "border-transparent bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
};

export const EVENT_TOPIC_ORDER: readonly EventTopic[] = [
  "ai",
  "tech",
  "business",
  "world",
  "gaming",
  "entertainment",
  "sports",
];
