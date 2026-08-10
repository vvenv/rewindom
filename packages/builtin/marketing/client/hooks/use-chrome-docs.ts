import { useQuery } from "@tanstack/react-query";

import {
  docsInLocale,
  type PublicDocSummary,
} from "../../shared/marketing-doc.js";
import {
  chromeNeedsDocList,
  chromeShowsDocSearch,
} from "../../shared/site-cms.js";
import {
  fetchSiteDocsCatalog,
  SITE_DOCS_QUERY_KEY,
} from "../lib/site-doc-api.js";

import type { SiteSection } from "../../shared/section-schema.js";
import type { AppLocale } from "@be-water/shared";

/**
 * 页头 / 页脚在预览里要用的文档数据，口径与 SSR 的 `resolveChromeDocs` 一致。
 *
 * 编辑器预览之所以会和线上不一样，很大一块就出在这里：以前只有编辑**文档模板页**时
 * 才拉文档（`useDocPreviewData` 的 `enabled`），于是在一张普通页面上排版时，页头里
 * 那条「文档库」动态项展不出任何东西、搜索框也不渲染——而线上两样都在。租户看到的是
 * 「我的页头少了一块」，最容易的结论是导航坏了。
 *
 * 不学服务端把「要整份目录」和「只要一个布尔值」分成两档：那一档之差是为了省掉**每个
 * 访客请求**的一次全库查询，而这里是一个编辑器会话拉一次。何况 `show_doc_search`
 * 默认开，分档在这儿几乎永远走不到便宜的那条路。
 */
export function useChromeDocs(
  chrome: {
    header: SiteSection[];
    footer: SiteSection[];
  },
  locale: AppLocale,
  defaultLocale: AppLocale,
): PublicDocSummary[] {
  const needed = chromeNeedsDocList(chrome) || chromeShowsDocSearch(chrome);
  const { data } = useQuery({
    queryKey: [...SITE_DOCS_QUERY_KEY, "catalog"],
    queryFn: fetchSiteDocsCatalog,
    enabled: needed,
  });

  if (!needed) return [];

  /*
   * 只认已发布的：导航里的文档链接指向公开面，草稿在那儿是 404。预览显示一条点过去
   * 打不开的链接，比不显示更难查。
   */
  const published = (data ?? []).filter((item) => item.status === "published");
  // 再按当前语言收一遍，口径与 SSR 的 `listPublishedDocs` 同一个函数
  return docsInLocale(published, locale, defaultLocale).docs.map((item) => ({
    slug: item.slug,
    title: item.title,
    description: item.description,
    category: item.category,
    sort_order: item.sort_order,
    updated_at: item.updated_at,
  }));
}
