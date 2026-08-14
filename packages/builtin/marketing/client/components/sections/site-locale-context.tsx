import { createContext, useContext, useMemo, type ReactNode } from "react";

import { localizeSiteHref } from "../../../shared/site-locale.js";

import type { AppLocale } from "@rewindom/shared";

interface SiteLocaleValue {
  locale: AppLocale;
  defaultLocale: AppLocale;
}

const SiteLocaleContext = createContext<SiteLocaleValue | null>(null);

/**
 * 租户官网当前语言。
 *
 * 有它之后所有站内链接（页头 / 页脚 / 同级菜单 / section 按钮）都由 `SiteLink`
 * 统一补 locale 前缀，不必逐个组件传参。没有 Provider 时（编辑器之外的场景、
 * 单测）退化为不改写。
 */
export function SiteLocaleProvider({
  locale,
  defaultLocale,
  children,
}: SiteLocaleValue & { children: ReactNode }): ReactNode {
  const value = useMemo(
    () => ({ locale, defaultLocale }),
    [locale, defaultLocale],
  );
  return (
    <SiteLocaleContext.Provider value={value}>
      {children}
    </SiteLocaleContext.Provider>
  );
}

/**
 * 站点当前语言 —— 给段内那几句**站点自己的** UI 文案用（表单校验提示等）。
 *
 * 不能拿 `useTranslation` 顶替：那是工作台的语言（跟着访客的 localStorage 走），
 * 而访客在租户站点上看到的一切都该跟着**站点**的语言。没有 Provider 时（单测、
 * 编辑器之外的场景）回落站点默认语言。
 */
export function useSiteLocale(): AppLocale {
  return useContext(SiteLocaleContext)?.locale ?? "zh-CN";
}

/** 编辑器 HTML 预览拿当前语言；没有 Provider 时不改写链接。 */
export function useSiteLocaleContext(): SiteLocaleValue | null {
  return useContext(SiteLocaleContext);
}

/**
 * 站内链接 → 当前语言的 URL。
 *
 * 幂等：服务端已在 `localizeSection` 里改写过 section 里的 href，这里再过一遍
 * 不会变成 `/en/en/...`（`isSiteLocalizableHref` 会跳过已带前缀的路径）。
 */
export function useSiteHref(): (href: string) => string {
  const value = useContext(SiteLocaleContext);
  return useMemo(() => {
    if (!value) return (href: string) => href;
    return (href: string) =>
      localizeSiteHref(href, value.locale, value.defaultLocale);
  }, [value]);
}
