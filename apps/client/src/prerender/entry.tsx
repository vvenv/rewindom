/**
 * 预渲染入口（只在构建期由 Node 执行，不进浏览器产物）。
 *
 * 走的是**真实路由树**而不是直接渲染页面组件：`/docs/:slug` 的 `useParams`
 * 依赖路由匹配，绕过 Routes 就得在这里重写一遍匹配逻辑，早晚和路由表对不上。
 *
 * 用 `react-dom/static` 的 `prerenderToNodeStream` 而不是 `renderToStaticMarkup`：
 * 路由是 `lazy()` 的，只有 prerender API 会等 Suspense 解析完再给出 HTML。
 */
import { Suspense } from "react";

import { MARKETING_ROUTES } from "@be-water/modules/marketing/client/lib/seo-routes.js";
import { renderMarketingPublicRoutes } from "@be-water/modules/marketing/client/public/routes.js";
import {
  SITE,
  type PageSeo,
} from "@be-water/modules/marketing/shared/index.js";
import { prerender } from "react-dom/static";
import { Routes, StaticRouter } from "react-router";

export const PRERENDER_ROUTES: readonly PageSeo[] = MARKETING_ROUTES;

/** 未设置 `SITE_URL` 时的兜底域名。 */
export const DEFAULT_ORIGIN: string = SITE.defaultOrigin;

/** 脚本侧（.mjs）通过本入口拿这些纯函数，避免同一套逻辑写两遍。 */
export {
  buildHead,
  buildRobots,
  buildSitemap,
  injectPrerenderedPage,
  outputPathFor,
} from "./html.js";

/** Suspense 边界注释：浏览器侧用 `createRoot` 重新渲染，不做 hydration，注释纯属噪音。 */
const SUSPENSE_MARKERS = /<!--\/?\$(\?|!)?-->/gu;

export async function renderPage(path: string): Promise<string> {
  const { prelude } = await prerender(
    <StaticRouter location={path}>
      <Suspense>
        <Routes>{renderMarketingPublicRoutes()}</Routes>
      </Suspense>
    </StaticRouter>,
  );

  // 用 Web Streams 版的 prerender（而非 prerenderToNodeStream）：本文件归 tsconfig.app
  // 管，那份配置只有 DOM 类型，碰 Buffer / NodeJS.* 会直接类型报错。
  const html = await new Response(prelude).text();
  return html.replace(SUSPENSE_MARKERS, "");
}
