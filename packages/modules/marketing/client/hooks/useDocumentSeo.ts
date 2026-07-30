import { useEffect } from "react";

import { buildDocumentTitle, type PageSeo } from "../../shared/index.js";

function upsertMeta(name: string, content: string): void {
  let tag = document.head.querySelector<HTMLMetaElement>(
    `meta[name="${name}"]`,
  );
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute("name", name);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}

function upsertCanonical(href: string): void {
  let tag = document.head.querySelector<HTMLLinkElement>(
    'link[rel="canonical"]',
  );
  if (!tag) {
    tag = document.createElement("link");
    tag.setAttribute("rel", "canonical");
    document.head.appendChild(tag);
  }
  tag.setAttribute("href", href);
}

/**
 * SPA 侧维护 `<head>`。
 *
 * 首屏的 head 是预渲染脚本写死在 HTML 里的（爬虫看到的就是它）；
 * 这个 hook 只负责客户端路由切换后把 title / description / canonical 跟上，
 * 免得用户从 `/` 点到 `/pricing` 时标签页标题还停在首页。
 */
export function useDocumentSeo(seo: PageSeo | undefined): void {
  useEffect(() => {
    if (!seo) {
      return;
    }
    document.title = buildDocumentTitle(seo);
    upsertMeta("description", seo.description);
    upsertCanonical(`${window.location.origin}${seo.path}`);
  }, [seo]);
}
