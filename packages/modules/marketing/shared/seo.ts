import { SITE } from "./site.js";

/**
 * 一个可预渲染页面的全部 SEO 事实。
 *
 * 预渲染脚本按这份数据生成 `<head>`，SPA 侧同一份数据在客户端导航时更新
 * `document.title`——两条路径共用一个真相源，避免「静态 HTML 与 SPA 标题不一致」。
 */
export interface PageSeo {
  /** 路由路径，必须以 `/` 开头且不带结尾斜杠（根路径除外）。 */
  path: string;
  title: string;
  description: string;
  /** sitemap 权重，0~1。 */
  priority: number;
  changefreq: "daily" | "weekly" | "monthly";
  /** 结构化数据（JSON-LD）。取 origin 是因为里面要写绝对 URL，而域名只有构建时才知道。 */
  buildJsonLd?: (origin: string) => Record<string, unknown>;
}

/** `<title>` 成品：首页用站点全称，其余页面挂后缀。 */
export function buildDocumentTitle(
  seo: Pick<PageSeo, "path" | "title">,
): string {
  return seo.path === "/" ? SITE.title : `${seo.title} · ${SITE.name}`;
}

/** 规范化 origin：去掉结尾斜杠，避免拼出 `https://x.com//pricing`。 */
export function normalizeOrigin(origin: string): string {
  return origin.replace(/\/+$/u, "");
}

export function buildCanonicalUrl(origin: string, path: string): string {
  return `${normalizeOrigin(origin)}${path === "/" ? "/" : path}`;
}

/** 站点级 JSON-LD，注入首页。 */
export function buildSiteJsonLd(origin: string): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE.name,
    description: SITE.description,
    url: normalizeOrigin(origin),
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
  };
}
