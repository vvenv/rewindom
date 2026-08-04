import { useLayoutEffect, type ReactNode } from "react";

import {
  changeAppLanguage,
  setApiAcceptLanguage,
  setupI18n,
  useLocale,
} from "@be-water/client-kit";
import { DEFAULT_LOCALE } from "@be-water/shared";
import { useLocation, useNavigate } from "react-router";

import { useDocumentSeo } from "../hooks/useDocumentSeo.js";
import {
  parseMarketingLocalePath,
  withMarketingLocale,
} from "../lib/marketing-locale-path.js";
import { findMarketingRoute } from "../lib/seo-routes.js";

import { MarketingFooter } from "./MarketingFooter.js";
import { MarketingHeader } from "./MarketingHeader.js";

/**
 * 官网页面外壳。
 *
 * 官网**不用** `PageLayout`：那是租户应用页的外壳（侧栏、租户上下文、移动端页头），
 * 公开页面既没有登录态也不该出现应用导航。
 *
 * URL 上的 locale 前缀是官网语言的真相源；无前缀时若本地已选非默认语言，
 * 客户端会 replace 到对应前缀路径（预渲染不跑 effect，静态 HTML 仍是默认语言）。
 */
export function MarketingLayout({
  path,
  children,
  chrome = true,
}: {
  /** 当前逻辑路径（无 locale 前缀），用于取这一页的 SEO 数据 */
  path: string;
  children: ReactNode;
  /**
   * 是否套平台页头页脚。租户官网自带**可编辑**的页头页脚（schema 驱动），
   * 传 `false` 只复用这里的 locale 同步与 SEO，避免出现两套 chrome。
   */
  chrome?: boolean;
}) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { setLocale, userChoice } = useLocale();
  const parsed = parseMarketingLocalePath(pathname);
  const effectiveLocale =
    !parsed.prefixed && userChoice && userChoice !== DEFAULT_LOCALE
      ? userChoice
      : parsed.locale;

  // 预渲染与首屏：按 URL（或即将 redirect 的）locale 同步 i18n
  setupI18n(effectiveLocale);

  useLayoutEffect(() => {
    if (!parsed.prefixed && userChoice && userChoice !== DEFAULT_LOCALE) {
      navigate(withMarketingLocale(parsed.path, userChoice), { replace: true });
      return;
    }

    // 显式 `/{locale}` 写入个人选择；无前缀页不覆盖「跟随默认」
    if (parsed.prefixed) {
      setLocale(parsed.locale);
    }
    setApiAcceptLanguage(parsed.locale);
    void changeAppLanguage(parsed.locale);
  }, [
    navigate,
    parsed.locale,
    parsed.path,
    parsed.prefixed,
    setLocale,
    userChoice,
  ]);

  useDocumentSeo(findMarketingRoute(path), pathname);

  if (!chrome) {
    return (
      <div className="min-h-svh bg-background text-foreground">{children}</div>
    );
  }

  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <MarketingHeader />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  );
}

/** 通栏区块：统一水平内边距与最大宽度。 */
export function MarketingSection({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={className}>
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">{children}</div>
    </section>
  );
}
