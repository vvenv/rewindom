import {
  PRICING_FAQ,
  SITE,
  buildSiteJsonLd,
  normalizeOrigin,
  resolveMarketingPlans,
  type PageSeo,
} from "../../shared/index.js";

import { DOC_PAGES } from "./docs.js";
import { parseMarketingLocalePath } from "./marketing-locale-path.js";

/**
 * 官网全部可预渲染路由（逻辑路径，无 locale 前缀）—— SPA SEO 与展开表的真相源。
 *
 * 带 `/{locale}` 的静态页由 `expandLocalizedMarketingRoutes` 在构建期展开。
 * 新增官网页面只需在这里补一条：忘了补就不会被预渲染，也不会进 sitemap，
 * 所以 `marketing.public-routes.test.ts` 会拿路由表和这里做交叉校验。
 */
export const MARKETING_ROUTES: readonly PageSeo[] = [
  {
    path: "/",
    title: SITE.title,
    description: SITE.description,
    priority: 1,
    changefreq: "weekly",
    buildJsonLd: buildSiteJsonLd,
  },
  {
    path: "/pricing",
    title: "定价",
    description:
      "be-water 各套餐的价格、席位配额与功能范围：免费版起步，企业版支持私有化部署与定制模块。",
    priority: 0.9,
    changefreq: "weekly",
    // 套餐列表与 FAQ 是两类实体，用 @graph 装在一个 JSON-LD 块里
    buildJsonLd: (origin) => ({
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "ItemList",
          name: `${SITE.name} 套餐`,
          itemListElement: resolveMarketingPlans().map(({ plan }, index) => ({
            "@type": "ListItem",
            position: index + 1,
            item: {
              "@type": "Offer",
              name: plan.name,
              description: plan.description,
              url: `${normalizeOrigin(origin)}/pricing`,
              ...(plan.price_monthly === null
                ? {}
                : { price: plan.price_monthly, priceCurrency: "CNY" }),
            },
          })),
        },
        {
          "@type": "FAQPage",
          mainEntity: PRICING_FAQ.map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: { "@type": "Answer", text: item.answer },
          })),
        },
      ],
    }),
  },
  {
    path: "/docs",
    title: "文档",
    description:
      "be-water 使用文档：快速开始、Agent-first、模块化架构、多租户与权限、部署。",
    priority: 0.8,
    changefreq: "weekly",
  },
  ...DOC_PAGES.map((page): PageSeo => ({
    path: page.path,
    title: page.title,
    description: page.description,
    priority: 0.7,
    changefreq: "monthly",
    buildJsonLd: (origin) => ({
      "@context": "https://schema.org",
      "@type": "TechArticle",
      headline: page.title,
      description: page.description,
      url: `${normalizeOrigin(origin)}${page.path}`,
      isPartOf: { "@type": "WebSite", name: SITE.name },
    }),
  })),
];

/** 按逻辑路径查找（`/en/pricing` 与 `/pricing` 命中同一条）。 */
export function findMarketingRoute(path: string): PageSeo | undefined {
  const logical = parseMarketingLocalePath(path).path;
  return MARKETING_ROUTES.find(
    (route) => route.path === path || route.path === logical,
  );
}
