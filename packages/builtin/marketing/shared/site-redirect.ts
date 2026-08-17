/**
 * 站内重定向的规范化与校验（写入路径与 UI 共用）。
 *
 * 只做**精确匹配**，不支持通配与正则：写错一条通配规则的后果是整站进重定向循环，
 * 而这类规则恰恰最难在编辑器里一眼看出对不对。需要批量时，几条明确的记录比一条
 * 聪明的规则可靠。
 */

import { APP_LOCALES, type AppLocale } from "@rewindom/shared";

import { resolveLocaleSegment } from "./site-locale.js";

export interface SiteRedirect {
  id: string;
  from_path: string;
  to_path: string;
  status_code: 301 | 302;
  created_at: string;
  updated_at: string;
}

export interface SiteRedirectBody {
  from_path: string;
  to_path: string;
  status_code?: 301 | 302;
}

/** 归一化源路径：必须是站内绝对路径，去掉查询串、末尾斜杠与语言前缀。 */
export function normalizeRedirectFrom(value: unknown): string {
  if (typeof value !== "string") throw new Error("site.redirect_invalid");
  const trimmed = value.trim();
  if (!trimmed.startsWith("/")) throw new Error("site.redirect_invalid");
  // 查询串与 hash 不参与匹配：同一个页面带不带 utm 都该跳到同一个地方
  const path = trimmed.split(/[?#]/u)[0]!;
  const cleaned = path.length > 1 ? path.replace(/\/+$/u, "") : path;
  if (cleaned === "") return "/";
  if (cleaned.length > 512) throw new Error("site.redirect_invalid");
  /*
   * SSR 查重定向时已经剥过 `/{locale}`。来源若带着 `/en/old`，不在这里去掉
   * 就会写成库里的 `/en/old`，而请求进来只查 `/old`——规则永远命中不了。
   * 只剥「语言 + 后面还有路径」；光一个 `/en` 留给路由当该语言首页，不收成 `/`。
   */
  const first = cleaned.slice(1).split("/")[0] ?? "";
  if (resolveLocaleSegment(first)) {
    const rest = cleaned.slice(1 + first.length);
    if (rest && rest !== "/") return rest;
  }
  return cleaned;
}

/**
 * 查找时要同时认「逻辑路径」和「带着语言前缀的旧记录」。
 *
 * 规范化会把新写入收成 `/old`，但库里可能已经存了 `/en/old`。
 */
export function redirectLookupPaths(from_path: string): string[] {
  if (from_path === "/") return [from_path];
  return [
    from_path,
    ...APP_LOCALES.map((locale) => `/${locale.slug}${from_path}`),
  ];
}

/**
 * 访客从 `/{locale}/old` 进来时，站内目标也带上同一个前缀。
 *
 * 否则 Location 写成 `/new`，人会掉回默认语言——看起来像「重定向没生效」。
 * 外链与已经带前缀的目标原样返回。
 */
export function localizeRedirectLocation(
  to_path: string,
  locale: AppLocale | null,
): string {
  if (!locale) return to_path;
  if (!to_path.startsWith("/") || to_path.startsWith("//")) return to_path;
  const first = to_path === "/" ? "" : to_path.slice(1).split("/")[0] ?? "";
  if (resolveLocaleSegment(first)) return to_path;
  return to_path === "/" ? `/${locale}` : `/${locale}${to_path}`;
}

/**
 * 目标可以是站内路径或 http(s) 绝对地址；其余（`javascript:` 等）一律拒。
 *
 * `//evil.example` 与 `/\evil.example` 单看都以 `/` 开头，但浏览器把它们当**协议相对**
 * 的外站地址——只判首字符就是一个开放重定向。这个值会原样进 `Location` 头，所以两种
 * 写法都得单独挡掉。要跳外站请写完整的 `https://`，那是显式的、看得见的。
 */
export function normalizeRedirectTo(value: unknown): string {
  if (typeof value !== "string") throw new Error("site.redirect_invalid");
  const trimmed = value.trim();
  if (trimmed === "" || trimmed.length > 2048) {
    throw new Error("site.redirect_invalid");
  }
  if (/^\/[/\\]/u.test(trimmed)) throw new Error("site.redirect_invalid");
  if (trimmed.startsWith("/")) return trimmed;
  if (/^https?:\/\//iu.test(trimmed)) return trimmed;
  throw new Error("site.redirect_invalid");
}

export function normalizeRedirectStatus(value: unknown): 301 | 302 {
  if (value === undefined || value === null) return 301;
  const code = Number(value);
  if (code !== 301 && code !== 302) throw new Error("site.redirect_invalid");
  return code;
}

/**
 * 一条规则本身就成环（`/a` → `/a`）时直接拒。
 *
 * 跨条目的环（`/a`→`/b`，`/b`→`/a`）不在写入时查：那要把整张表读出来做图遍历，而且
 * 两条规则分两次保存时任一条单看都是合法的。运行期只跳**一跳**（见 `site-redirect.service`），
 * 环最多让访客多一次请求，不会打转。
 */
export function parseRedirectBody(value: unknown): {
  from_path: string;
  to_path: string;
  status_code: 301 | 302;
} {
  if (!value || typeof value !== "object") {
    throw new Error("site.redirect_invalid");
  }
  const raw = value as Record<string, unknown>;
  const from_path = normalizeRedirectFrom(raw.from_path);
  const to_path = normalizeRedirectTo(raw.to_path);
  if (from_path === to_path) throw new Error("site.redirect_self");
  return {
    from_path,
    to_path,
    status_code: normalizeRedirectStatus(raw.status_code),
  };
}
