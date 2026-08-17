import { DEFAULT_LOCALE, type AppLocale } from "@rewindom/module-sdk";

/**
 * 事件文案的数据多语言。
 *
 * 走**扁平 locale map**（`{ "en": "…", "zh-CN": "…" }`），与商品标题同一形状——
 * 见 `docs/design/i18n.md`：数据多语言不许做 `title_en` 这类代码 i18n 平行字段。
 *
 * 与商品不同的是译文来源：商品是租户自己填的，事件是机器产出的。因此这里额外
 * 需要 `origin_locale`——界面要能如实说明「你看到的这条是机器翻译」。
 */
export type EventLocalizedMap = Record<string, string>;

export function isEventLocalizedMap(
  value: unknown,
): value is EventLocalizedMap {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  return Object.values(value).every((item) => typeof item === "string");
}

/** 取当前语言的文案；缺当前语言时回落 zh-CN → en → 任意非空 → fallback。 */
export function resolveEventLocaleText(
  value: unknown,
  locale: AppLocale,
  fallback = "",
): string {
  if (typeof value === "string") {
    return value.trim() || fallback;
  }
  if (!isEventLocalizedMap(value)) {
    return fallback;
  }
  const direct = value[locale]?.trim();
  if (direct) {
    return direct;
  }
  const zh = value[DEFAULT_LOCALE]?.trim();
  if (zh) {
    return zh;
  }
  const en = value.en?.trim();
  if (en) {
    return en;
  }
  return Object.values(value).find((item) => item.trim())?.trim() || fallback;
}

/** 当前语言是否真有译文（没有就是回落，界面不该谎称是本地内容）。 */
export function hasLocaleText(value: unknown, locale: AppLocale): boolean {
  return isEventLocalizedMap(value) && Boolean(value[locale]?.trim());
}

const CJK_RE = /[㐀-䶿一-鿿豈-﫿]/u;

/**
 * 判断原文语种。
 *
 * 只有两种应用语言，所以「含汉字 = 中文，否则英文」已经够用，且不需要任何依赖。
 * 日文假名不在判据里——本期没有日文源，误判它反而会把方向弄反。
 */
export function detectOriginLocale(text: string): AppLocale {
  return CJK_RE.test(text) ? "zh-CN" : "en";
}

/** 合并语言表并丢掉空串，保证落库的 map 里没有 `{"en": ""}` 这种噪声。 */
export function mergeLocalizedMaps(
  ...maps: (EventLocalizedMap | null | undefined)[]
): EventLocalizedMap {
  const merged: EventLocalizedMap = {};
  for (const map of maps) {
    if (!map) continue;
    for (const [locale, text] of Object.entries(map)) {
      const trimmed = text.trim();
      if (trimmed) {
        merged[locale] = trimmed;
      }
    }
  }
  return merged;
}
