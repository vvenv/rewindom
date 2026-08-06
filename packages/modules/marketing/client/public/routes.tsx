import { lazy, type ReactNode } from "react";

import { APP_LOCALES } from "@be-water/shared";
import { Route } from "react-router";

const Landing = lazy(() =>
  import("../pages/landing.js").then((module) => ({ default: module.Landing })),
);

const Pricing = lazy(() =>
  import("../pages/pricing.js").then((module) => ({ default: module.Pricing })),
);

const Docs = lazy(() =>
  import("../pages/docs.js").then((module) => ({ default: module.Docs })),
);

const DocsDetail = lazy(() =>
  import("../pages/docs-detail.js").then((module) => ({
    default: module.DocsDetail,
  })),
);

const TenantCustomPage = lazy(() =>
  import("../pages/tenant-custom-page.js").then((module) => ({
    default: module.TenantCustomPage,
  })),
);

/**
 * 官网路由：无守卫，登录与未登录都可见。
 *
 * 同时声明无前缀（默认 zh-CN）与 `/{locale}/...` 前缀形态，供预渲染生成
 * 带 locale code 的静态页。新增页面要同步补 `MARKETING_ROUTES`（`lib/seo-routes.ts`）。
 */
export function renderMarketingPublicRoutes(): ReactNode {
  return (
    <>
      <Route path="/" element={<Landing />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/docs" element={<Docs />} />
      <Route path="/docs/:slug" element={<DocsDetail />} />
      {APP_LOCALES.flatMap((locale) => [
        <Route
          key={`${locale.slug}-home`}
          path={`/${locale.slug}`}
          element={<Landing />}
        />,
        <Route
          key={`${locale.slug}-pricing`}
          path={`/${locale.slug}/pricing`}
          element={<Pricing />}
        />,
        <Route
          key={`${locale.slug}-docs`}
          path={`/${locale.slug}/docs`}
          element={<Docs />}
        />,
        <Route
          key={`${locale.slug}-docs-slug`}
          path={`/${locale.slug}/docs/:slug`}
          element={<DocsDetail />}
        />,
      ])}
      {/* 放在 locale 静态段之后，避免抢占 /en、/zh-CN；`/*` 承接嵌套 slug */}
      <Route path="/:slug" element={<TenantCustomPage />} />
      <Route path="/:slug/*" element={<TenantCustomPage />} />
    </>
  );
}

/** 供预渲染脚本消费：路由树里声明的静态逻辑路径（不含 `:slug` 与 locale 前缀）。 */
export const MARKETING_STATIC_PATHS = ["/", "/pricing", "/docs"] as const;
