import { lazy, type ReactNode } from "react";

import { APP_LOCALES } from "@be-water/shared";
import { Route } from "react-router";

const Landing = lazy(() =>
  import("../pages/landing.js").then((module) => ({ default: module.Landing })),
);

const Pricing = lazy(() =>
  import("../pages/pricing.js").then((module) => ({ default: module.Pricing })),
);

const DocsIndex = lazy(() =>
  import("../pages/docs-index.js").then((module) => ({
    default: module.DocsIndex,
  })),
);

const DocDetail = lazy(() =>
  import("../pages/doc-detail.js").then((module) => ({
    default: module.DocDetail,
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
      <Route path="/docs" element={<DocsIndex />} />
      <Route path="/docs/:slug" element={<DocDetail />} />
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
          element={<DocsIndex />}
        />,
        <Route
          key={`${locale.slug}-docs-slug`}
          path={`/${locale.slug}/docs/:slug`}
          element={<DocDetail />}
        />,
      ])}
    </>
  );
}

/** 供预渲染脚本消费：路由树里声明的静态逻辑路径（不含 `:slug` 与 locale 前缀）。 */
export const MARKETING_STATIC_PATHS = ["/", "/pricing", "/docs"] as const;
