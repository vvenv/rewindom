import { isThingKind, type ThingKind } from "../shared/thing.js";

export const THING_TEXT_MAX_LENGTH = 10_000;
export const THING_HTML_MAX_LENGTH = 200_000;
export const THING_TITLE_MAX_LENGTH = 120;
/** 审计详情里只留一小段——正文可以很长，审计日志不该被整条灌满。 */
export const THING_PREVIEW_MAX_LENGTH = 60;

/**
 * 「今天」按站点挂钟算，UTC+8 = 480。
 *
 * 用 UTC 切日的话会在北京时间早上八点换，对读者是错的。等站点时区落到设置里，
 * 把这个常量换成读设置即可。
 */
export const DAILY_OFFSET_MINUTES = 480;

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** 当前挂钟日期的 `YYYY-MM-DD`。 */
export function localDateKey(
  date: Date,
  offsetMinutes: number = DAILY_OFFSET_MINUTES,
): string {
  return new Date(date.getTime() + offsetMinutes * 60_000)
    .toISOString()
    .slice(0, 10);
}

/**
 * `YYYY-MM-DD` → 落库用的 UTC 零点。非法或不存在的日期（2026-02-30）返回 null。
 *
 * **值可能来自访客**（`?d=`），所以这里做严格校验，绝不把原样字符串透传给查询。
 */
export function parseDateKey(value: unknown): Date | null {
  if (typeof value !== "string" || !DATE_KEY_RE.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  // `new Date("2026-02-30")` 会滚成 3-02，回写一遍才认得出来
  if (date.toISOString().slice(0, 10) !== value) return null;
  return date;
}

/** 相邻的一天，仍是 `YYYY-MM-DD`。 */
export function shiftDateKey(key: string, days: number): string {
  const date = parseDateKey(key);
  if (!date) return key;
  return new Date(date.getTime() + days * 86_400_000).toISOString().slice(0, 10);
}

export function buildThingPreview(value: string): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= THING_PREVIEW_MAX_LENGTH) return normalized;
  return `${normalized.slice(0, THING_PREVIEW_MAX_LENGTH)}…`;
}

export interface ThingInput {
  kind?: string;
  title?: string;
  text?: string;
  html?: string;
  published_on?: string | null;
  enabled?: boolean;
}

export interface ThingValidationIssue {
  code:
    | "useless.kind_invalid"
    | "useless.text_required"
    | "useless.text_too_long"
    | "useless.html_required"
    | "useless.html_too_long"
    | "useless.title_required"
    | "useless.title_too_long"
    | "useless.date_invalid";
  params?: Record<string, number>;
}

/**
 * 按 kind 校验：句子要正文，可交互的要 HTML 和标题。
 *
 * 标题对 embed 是必填——归档列表和日期选择器上要有个名字，一段 HTML 没法当名字用。
 * text 则不必：正文自己就是标题。
 */
export function validateThingInput(
  input: ThingInput,
  options: { partial?: boolean } = {},
): ThingValidationIssue | null {
  const partial = options.partial ?? false;

  if (input.kind !== undefined && !isThingKind(input.kind)) {
    return { code: "useless.kind_invalid" };
  }
  const kind = (input.kind ?? "text") as ThingKind;

  if (input.published_on !== undefined && input.published_on !== null) {
    if (!parseDateKey(input.published_on)) {
      return { code: "useless.date_invalid" };
    }
  }

  if (input.title !== undefined && input.title.length > THING_TITLE_MAX_LENGTH) {
    return {
      code: "useless.title_too_long",
      params: { max: THING_TITLE_MAX_LENGTH },
    };
  }

  if (kind === "embed") {
    if (!partial || input.html !== undefined) {
      const html = input.html?.trim() ?? "";
      if (!html) return { code: "useless.html_required" };
      if (html.length > THING_HTML_MAX_LENGTH) {
        return {
          code: "useless.html_too_long",
          params: { max: THING_HTML_MAX_LENGTH },
        };
      }
    }
    if (!partial || input.title !== undefined) {
      if (!(input.title?.trim() ?? "")) {
        return { code: "useless.title_required" };
      }
    }
    return null;
  }

  if (!partial || input.text !== undefined) {
    const text = input.text?.trim() ?? "";
    if (!text) return { code: "useless.text_required" };
    if (text.length > THING_TEXT_MAX_LENGTH) {
      return {
        code: "useless.text_too_long",
        params: { max: THING_TEXT_MAX_LENGTH },
      };
    }
  }

  return null;
}
