/**
 * 官网 CMS 文案 / 链接的渲染期占位符。
 *
 * 与代码 i18n 的 `{{param}}` 不是同一套：库存句、页脚版权、段里手填的 href 都是
 * **数据**，语法对齐 Hugo / Jekyll / 页脚 `chrome_text`——单花括号 `{token}`。
 *
 * 内置四项（页脚版权那一套）：`{year}` `{site}` `{hostname}` `{url}`。
 * 业务模块往 `contributed.interpolation` 填额外的（events 的 `{topic}` /
 * `{topic_slug}`）。未出现在 values 里的 `{foo}` 原样留下，避免误伤文案里的花括号。
 *
 * 链接里空掉的路径段与空查询值会收掉：`/events/{topic_slug}/feed.xml` 在没有
 * 当前主题时是 `/events/feed.xml`，而不是 `//`。不要在渲染器里暗改租户填的地址——
 * 把 token 写进存下来的 href，看得见、改得动。
 */

export const SITE_INTERPOLATION_KEY = "interpolation";

export const BUILTIN_SITE_TOKENS = ["year", "site", "hostname", "url"] as const;

const TOKEN_PATTERN = /\{([a-z][a-z0-9_]*)\}/gu;

export function isStringRecord(value: unknown): value is Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.values(value).every((item) => typeof item === "string");
}

export function readContributedInterpolation(
  contributed?: Readonly<Record<string, unknown>>,
): Record<string, string> {
  const extra = contributed?.[SITE_INTERPOLATION_KEY];
  return isStringRecord(extra) ? extra : {};
}

/**
 * 多个 context provider 的返回值合成 `contributed`。
 *
 * `interpolation` 要**按 key 合并**：`Object.assign` 会整包覆盖，两个模块各贡献
 * 一个 token 时后登记的会把先登记的吃掉。
 */
export function mergeContributedRecords(
  results: readonly Record<string, unknown>[],
): Record<string, unknown> {
  const interpolation: Record<string, string> = {};
  const rest: Record<string, unknown> = {};
  for (const result of results) {
    const extra = result[SITE_INTERPOLATION_KEY];
    if (isStringRecord(extra)) Object.assign(interpolation, extra);
    for (const [key, value] of Object.entries(result)) {
      if (key !== SITE_INTERPOLATION_KEY) rest[key] = value;
    }
  }
  if (Object.keys(interpolation).length > 0) {
    rest[SITE_INTERPOLATION_KEY] = interpolation;
  }
  return rest;
}

function tokensFromOrigin(origin: string | undefined): {
  hostname: string;
  url: string;
} {
  if (!origin) return { hostname: "", url: "" };
  try {
    const parsed = new URL(origin);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { hostname: "", url: "" };
    }
    return { hostname: parsed.hostname, url: parsed.origin };
  } catch {
    return { hostname: "", url: "" };
  }
}

export function interpolationValues(input: {
  siteName?: string;
  origin?: string;
  year?: number;
  extra?: Record<string, string>;
}): Record<string, string> {
  const fromOrigin = tokensFromOrigin(input.origin);
  const builtin: Record<string, string> = {};
  if (input.siteName !== undefined) {
    builtin.year = String(input.year ?? new Date().getFullYear());
    builtin.site = input.siteName;
    builtin.hostname = fromOrigin.hostname;
    builtin.url = fromOrigin.url;
  }
  return { ...builtin, ...input.extra };
}

export function interpolateSiteText(
  text: string,
  values: Record<string, string>,
): string {
  return text.replace(TOKEN_PATTERN, (match, key: string) => {
    if (Object.prototype.hasOwnProperty.call(values, key)) {
      return values[key] ?? "";
    }
    return match;
  });
}

function collapsePath(path: string): string {
  if (!path) return path;
  const trailing = path.endsWith("/") && path !== "/";
  const parts = path.split("/").filter((segment, index) => segment !== "" || index === 0);
  let result = parts.join("/") || (path.startsWith("/") ? "/" : "");
  if (trailing && result !== "/") result += "/";
  return result;
}

function collapseQuery(query: string): string {
  if (!query) return "";
  const kept = query.split("&").filter((part) => {
    if (!part) return false;
    const eq = part.indexOf("=");
    if (eq < 0) return true;
    return part.slice(eq + 1) !== "";
  });
  return kept.length > 0 ? `?${kept.join("&")}` : "";
}

function collapseRelativeHref(href: string): string {
  const hashIndex = href.indexOf("#");
  const hash = hashIndex >= 0 ? href.slice(hashIndex) : "";
  const withoutHash = hashIndex >= 0 ? href.slice(0, hashIndex) : href;
  const queryIndex = withoutHash.indexOf("?");
  const path = queryIndex >= 0 ? withoutHash.slice(0, queryIndex) : withoutHash;
  const query = queryIndex >= 0 ? withoutHash.slice(queryIndex + 1) : "";
  return collapsePath(path) + collapseQuery(query) + hash;
}

/**
 * 先插值，再收掉空路径段与空查询值。
 *
 * `mailto:` / `tel:` / 带 scheme 的外链只做文本替换，不去拆路径——那些不是站内地址。
 */
export function interpolateSiteHref(
  href: string,
  values: Record<string, string>,
): string {
  const replaced = interpolateSiteText(href, values);
  if (/^[a-z][a-z0-9+.-]*:/iu.test(replaced) || replaced.startsWith("//")) {
    return replaced;
  }
  return collapseRelativeHref(replaced);
}
