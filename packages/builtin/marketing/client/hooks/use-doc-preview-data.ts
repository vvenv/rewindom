import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import {
  type PublicDocDetail,
  type PublicDocSummary,
} from "../../shared/marketing-doc.js";
import {
  isDocTemplateKind,
  type MarketingPageKind,
} from "../../shared/site-cms.js";
import {
  fetchSiteDocsCatalog,
  SITE_DOCS_QUERY_KEY,
} from "../lib/site-doc-api.js";

import { useSiteDoc } from "./useSiteDocs.js";

/**
 * 编辑文档模板页时，预览里的 `doc-*` 段该拿什么数据。
 *
 * 用租户**真实的**文档：预览的价值就在于"我的目录长这样"。一篇都没有时退回一份
 * 示例——不然租户点进文档详情模板只会看到一片空白，还以为版式坏了。
 *
 * 只在编辑那两张模板页时才拉（`enabled` 由 kind 决定）：普通页面上的 `doc-list`
 * 同样吃这份数据，但那是首页放"最新几篇"的少数用法，让它跟着模板页一起拿就够了。
 */
export function useDocPreviewData(kind: MarketingPageKind): {
  docs: PublicDocSummary[];
  doc: PublicDocDetail | undefined;
} {
  const { t } = useTranslation("marketing");
  const enabled = isDocTemplateKind(kind);
  // 列表页已改成分页查询；模板预览要近似全量目录
  const docsQuery = useQuery({
    queryKey: [...SITE_DOCS_QUERY_KEY, "catalog"],
    queryFn: fetchSiteDocsCatalog,
    enabled,
  });
  const items = docsQuery.data ?? [];
  const published = items.filter((item) => item.status === "published");
  // 详情模板的样本取第一篇已发布的；全是草稿时也认草稿（编辑器里看得到就行）
  const sampleId = (published[0] ?? items[0])?.id ?? null;
  const sampleQuery = useSiteDoc(kind === "doc_article" ? sampleId : null);

  const docs: PublicDocSummary[] = (published.length > 0 ? published : items)
    .map((item) => ({
      slug: item.slug,
      title: item.title,
      description: item.description,
      category: item.category,
      sort_order: item.sort_order,
      updated_at: item.updated_at,
    }));

  const sample = sampleQuery.data;
  const doc: PublicDocDetail | undefined =
    kind !== "doc_article"
      ? undefined
      : sample
        ? {
            slug: sample.slug,
            title: sample.title_draft || sample.title,
            description: sample.description_draft || sample.description,
            category: sample.category_draft || sample.category,
            sort_order: sample.sort_order_draft,
            updated_at: sample.updated_at,
            body_md: sample.body_md_draft || sample.body_md,
          }
        : {
            slug: "sample",
            title: t("editor.docSample.title"),
            description: t("editor.docSample.description"),
            category: t("editor.docSample.category"),
            sort_order: 0,
            updated_at: new Date().toISOString(),
            body_md: t("editor.docSample.body"),
          };

  if (!enabled) return { docs: [], doc: undefined };
  return { docs: docs.length > 0 ? docs : SAMPLE_DOCS(t), doc };
}

/** 零文档时的示例目录：让侧栏 / 列表在预览里有东西可画。 */
function SAMPLE_DOCS(t: (key: string) => string): PublicDocSummary[] {
  return [
    {
      slug: "sample",
      title: t("editor.docSample.title"),
      description: t("editor.docSample.description"),
      category: t("editor.docSample.category"),
      sort_order: 0,
      updated_at: new Date().toISOString(),
    },
  ];
}
