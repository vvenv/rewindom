export const THING_TEXT_MAX_LENGTH = 10_000;
/** 审计详情里只留一小段正文——句子可以很长，审计日志不该被整条灌满。 */
export const THING_PREVIEW_MAX_LENGTH = 60;

export interface ThingInput {
  text?: string;
  enabled?: boolean;
}

export interface ThingValidationIssue {
  code: "useless.text_required" | "useless.text_too_long";
  params?: Record<string, number>;
}

export function buildThingPreview(text: string): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= THING_PREVIEW_MAX_LENGTH) {
    return normalized;
  }
  return `${normalized.slice(0, THING_PREVIEW_MAX_LENGTH)}…`;
}

export function validateThingInput(
  input: ThingInput,
  options: { partial?: boolean } = {},
): ThingValidationIssue | null {
  const partial = options.partial ?? false;

  if (!partial || input.text !== undefined) {
    const text = input.text?.trim() ?? "";
    if (!text) {
      return { code: "useless.text_required" };
    }
    if (text.length > THING_TEXT_MAX_LENGTH) {
      return {
        code: "useless.text_too_long",
        params: { max: THING_TEXT_MAX_LENGTH },
      };
    }
  }

  return null;
}

/**
 * 「今天那条」的挂钟偏移（分钟）。UTC+8 = 480。
 *
 * 用 UTC 日序号的话句子会在北京时间早上八点换，对读者是错的——所以这里按站点
 * 的挂钟切日。等站点时区落到设置里，把这个常量换成读设置即可。
 */
export const DAILY_ROTATION_OFFSET_MINUTES = 480;

/** 挂钟日序号：同一天内恒定，跨当地零点 +1。 */
export function localDayNumber(date: Date, offsetMinutes: number): number {
  return Math.floor((date.getTime() + offsetMinutes * 60_000) / 86_400_000);
}

/**
 * 日序号 → [0, count) 的下标。天数为负也安全（JS 的 % 会保留符号）。
 * count <= 0 时返回 0，由调用方负责先判空。
 */
export function pickDailyIndex(dayNumber: number, count: number): number {
  if (count <= 0) {
    return 0;
  }
  return ((dayNumber % count) + count) % count;
}
