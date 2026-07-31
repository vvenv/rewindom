/**
 * 应用支持的界面 / API 语言。
 *
 * 解析优先级（与主题/布局同构）：用户本地选择 > 租户默认 > 平台默认 > 代码兜底。
 * 新增语言 = 在此追加一项 + 补齐各模块 locales 与服务端 message catalog。
 */

export const APP_LOCALES = [
  {
    slug: "zh-CN",
    label: "中文",
    native_label: "中文",
    /** BCP 47 / Accept-Language 匹配用的短码 */
    aliases: ["zh", "zh-CN", "zh-Hans", "zh-Hans-CN"],
  },
  {
    slug: "en",
    label: "English",
    native_label: "English",
    aliases: ["en", "en-US", "en-GB"],
  },
] as const;

export type AppLocale = (typeof APP_LOCALES)[number]["slug"];

/** 未做任何配置时的兜底语言。 */
export const DEFAULT_LOCALE: AppLocale = "zh-CN";

const LOCALE_SLUGS = new Set<string>(APP_LOCALES.map((l) => l.slug));

export function isAppLocale(value: unknown): value is AppLocale {
  return typeof value === "string" && LOCALE_SLUGS.has(value);
}

/** 非法/缺失值归一到 `fallback`（默认 zh-CN）。 */
export function normalizeLocale(
  value: unknown,
  fallback: AppLocale = DEFAULT_LOCALE,
): AppLocale {
  return isAppLocale(value) ? value : fallback;
}

/**
 * 归一到「slug 或继承」——租户默认语言用它：`null` 表示继承平台默认。
 */
export function normalizeOptionalLocale(value: unknown): AppLocale | null {
  return isAppLocale(value) ? value : null;
}

export function getLocaleLabel(slug: string): string {
  return APP_LOCALES.find((l) => l.slug === slug)?.label ?? slug;
}

export function getLocaleNativeLabel(slug: string): string {
  return APP_LOCALES.find((l) => l.slug === slug)?.native_label ?? slug;
}

/**
 * 从 Accept-Language / navigator.language 类字符串解析到支持的 locale。
 * 支持 `zh-CN,zh;q=0.9,en;q=0.8` 与单一 `en-US`。
 */
export function parseAcceptLanguage(
  header: string | null | undefined,
  fallback: AppLocale = DEFAULT_LOCALE,
): AppLocale {
  if (!header?.trim()) return fallback;

  const candidates = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const qParam = params.find((p) => p.trim().startsWith("q="));
      const q = qParam ? Number(qParam.trim().slice(2)) : 1;
      return { tag: (tag ?? "").trim(), q: Number.isFinite(q) ? q : 0 };
    })
    .filter((c) => c.tag.length > 0)
    .sort((a, b) => b.q - a.q);

  for (const { tag } of candidates) {
    const lower = tag.toLowerCase();
    for (const locale of APP_LOCALES) {
      if (
        locale.aliases.some((alias) => alias.toLowerCase() === lower) ||
        lower.startsWith(`${locale.slug.toLowerCase()}-`) ||
        (locale.slug === "zh-CN" && lower.startsWith("zh"))
      ) {
        return locale.slug;
      }
    }
  }

  return fallback;
}
