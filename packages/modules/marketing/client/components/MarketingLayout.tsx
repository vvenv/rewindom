import type { ReactNode } from "react";

import { useDocumentSeo } from "../hooks/useDocumentSeo.js";
import { findMarketingRoute } from "../lib/seo-routes.js";

import { MarketingFooter } from "./MarketingFooter.js";
import { MarketingHeader } from "./MarketingHeader.js";

/**
 * 官网页面外壳。
 *
 * 官网**不用** `PageLayout`：那是租户应用页的外壳（侧栏、租户上下文、移动端页头），
 * 公开页面既没有登录态也不该出现应用导航。
 */
export function MarketingLayout({
  path,
  children,
}: {
  /** 当前路由路径，用于取这一页的 SEO 数据 */
  path: string;
  children: ReactNode;
}) {
  useDocumentSeo(findMarketingRoute(path));

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
