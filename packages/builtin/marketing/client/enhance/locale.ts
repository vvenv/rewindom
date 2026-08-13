/**
 * 公开站当前语言（无 React）。
 *
 * SSR 把语言写在 `.marketing-site-root[data-page-locale]`；会员正文等局部替换不会动它，
 * `<html lang>` 只作兜底（例如 enhance 跑在没有 root 容器的片段上）。
 */

import type { AppLocale } from "@rewindom/shared";

export function pageLocale(): AppLocale {
  const root = document.querySelector(".marketing-site-root");
  const raw =
    root?.getAttribute("data-page-locale") ?? document.documentElement.lang;
  return raw === "en" ? "en" : "zh-CN";
}
