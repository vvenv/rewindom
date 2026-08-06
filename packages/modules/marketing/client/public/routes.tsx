import { lazy, type ReactNode } from "react";

import { Route } from "react-router";

const TenantCustomPage = lazy(() =>
  import("../pages/tenant-custom-page.js").then((module) => ({
    default: module.TenantCustomPage,
  })),
);

/**
 * 公开 marketing 路由：全部走租户 CMS（主域隐式绑定默认租户）。
 *
 * locale 前缀由租户 `site-locale` / SSR 树处理；SPA 侧 `/:slug` 与 `/*` 承接。
 */
export function renderMarketingPublicRoutes(): ReactNode {
  return (
    <>
      <Route path="/" element={<TenantCustomPage />} />
      <Route path="/:slug" element={<TenantCustomPage />} />
      <Route path="/:slug/*" element={<TenantCustomPage />} />
    </>
  );
}
