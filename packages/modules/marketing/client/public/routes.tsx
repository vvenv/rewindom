import { lazy, type ReactNode } from "react";

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
 * 这些路径也是预渲染的目标——新增页面要同步补 `MARKETING_ROUTES`（`lib/seo-routes.ts`），
 * 否则不会生成静态 HTML，也不进 sitemap；`public-routes.test.tsx` 会盯着这件事。
 */
export function renderMarketingPublicRoutes(): ReactNode {
  return (
    <>
      <Route path="/" element={<Landing />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/docs" element={<DocsIndex />} />
      <Route path="/docs/:slug" element={<DocDetail />} />
    </>
  );
}

/** 供预渲染脚本消费：路由树里声明的静态路径（不含 `:slug` 这类动态段）。 */
export const MARKETING_STATIC_PATHS = ["/", "/pricing", "/docs"] as const;
