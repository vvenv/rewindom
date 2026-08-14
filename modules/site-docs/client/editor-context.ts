/**
 * 编辑器预览的文档数据 —— 对应 SSR 的 `registerSectionContextProvider`。
 *
 * 把原先 `useDocPreviewData` / `useChromeDocs` 的取数收进注册表：编辑器按
 * usedTypes 按需 await，合进 `contributed["site-docs"]`。
 */

import i18n from "i18next";

import { registerEditorContextProvider } from "../../../packages/builtin/marketing/client/editor-context-providers.js";
import { normalizeLocale, type AppLocale } from "@rewindom/module-sdk/client";

import { DOCS_ARTICLE_PAGE_KIND } from "../shared/page-kinds.js";
import { SITE_DOCS_CONTEXT_SECTION_TYPES } from "../shared/section-types.js";
import {
  docsInLocale,
  DOCS_INDEX_PATH,
  type PublicDocDetail,
  type PublicDocSummary,
} from "../shared/site-doc.js";
import { siteDocsContextEntry } from "../shared/site-docs-context.js";

import { fetchSiteDoc, fetchSiteDocsCatalog } from "./lib/site-doc-api.js";

function sampleDocs(): PublicDocSummary[] {
  const t = i18n.getFixedT(null, "site-docs");
  const label = t("editor.sample.category");
  return [
    {
      slug: "sample",
      title: t("editor.sample.title"),
      description: t("editor.sample.description"),
      category: label,
      category_label: label,
      sort_order: 0,
      updated_at: new Date().toISOString(),
    },
  ];
}

function sampleDetail(): PublicDocDetail {
  const t = i18n.getFixedT(null, "site-docs");
  const summary = sampleDocs()[0]!;
  return { ...summary, body_md: t("editor.sample.body") };
}

export function registerDocsEditorContext(): void {
  registerEditorContextProvider({
    sectionTypes: SITE_DOCS_CONTEXT_SECTION_TYPES,
    provide: async (input) => {
      const locale = normalizeLocale(input.locale) as AppLocale;
      const defaultLocale = normalizeLocale(input.defaultLocale) as AppLocale;
      let items: Awaited<ReturnType<typeof fetchSiteDocsCatalog>>["items"] = [];
      try {
        items = (await fetchSiteDocsCatalog()).items;
      } catch {
        items = [];
      }
      const published = items.filter((item) => item.status === "published");
      const pool = docsInLocale(
        published.length > 0 ? published : items,
        locale,
        defaultLocale,
      ).docs;
      const docs: PublicDocSummary[] =
        pool.length > 0
          ? pool.map((item) => ({
              slug: item.slug,
              title: item.title,
              description: item.description,
              category: item.category,
              category_label: item.category_label,
              sort_order: item.sort_order,
              updated_at: item.updated_at,
            }))
          : sampleDocs();

      let doc: PublicDocDetail | undefined;
      if (input.pageKind === DOCS_ARTICLE_PAGE_KIND) {
        const sampleId = pool[0]?.id ?? null;
        if (sampleId) {
          try {
            const sample = await fetchSiteDoc(sampleId);
            doc = {
              slug: sample.slug,
              title: sample.title_draft || sample.title,
              description: sample.description_draft || sample.description,
              category: sample.category_draft || sample.category,
              category_label: sample.category_draft || sample.category,
              sort_order: sample.sort_order_draft,
              updated_at: sample.updated_at,
              body_md: sample.body_md_draft || sample.body_md,
            };
          } catch {
            doc = sampleDetail();
          }
        } else {
          doc = sampleDetail();
        }
      }

      return siteDocsContextEntry({
        docs,
        doc,
        docsIndexPath: DOCS_INDEX_PATH,
      });
    },
  });
}
