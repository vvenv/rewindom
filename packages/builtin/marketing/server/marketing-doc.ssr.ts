/**
 * 租户文档库的 SSR 渲染：`/docs`（索引）与 `/docs/:slug`（详情）。
 *
 * 两张地址的**版式**来自两张模板页（`kind: doc_index` / `doc_article`）——和首页
 * 一样是普通的 section 流，租户在同一个编辑器里排。这里只负责三件事：
 *
 * 1. 取版式：模板页在库里就用它，没有就用内置兜底版式（`DOC_TEMPLATE_PRESETS`）。
 *    「没有」是常态而不是异常——租户没自定义过就不该有这条记录，见 `page-presets.ts`。
 * 2. 取数据：已发布文档目录（+ 详情页的当前那一篇）塞进渲染上下文，`doc-*` 段吃它。
 * 3. 合成一个 `PublicMarketingPage` 交给 `renderMarketingHtml`——页头 / 页脚 / 主题 /
 *    SEO 全部走与普通页面同一条路。
 *
 * 合成是**单向**的（只读，不写回 DB）：详情页的 title/description 来自文档本身，
 * 一篇一个值，不可能存成一张页面记录。
 */

import { type AppLocale } from "@be-water/shared";

import {
  DOCS_INDEX_PATH,
  docPath,
  type PublicDocDetail,
  type PublicDocSummary,
} from "../shared/marketing-doc.js";
import {
  buildDocTemplateSections,
  DOC_TEMPLATE_PRESETS,
} from "../shared/page-presets.js";
import { type SiteSection } from "../shared/section-schema.js";
import {
  type DocTemplateKind,
  type MarketingPageSettings,
  type MarketingPageVisibility,
  type PageLocaleAlternate,
  type PublicMarketingPage,
  type PublicMarketingSite,
} from "../shared/site-cms.js";
import { withSiteLocale } from "../shared/site-locale.js";

import {
  getPublishedDoc,
  listPublishedDocs,
} from "./marketing-doc.service.js";
import { getPublishedDocTemplate } from "./site.service.js";
import { renderMarketingHtml } from "./ssr-render.js";
import { createStarterTranslator } from "./starter-i18n.js";

interface DocTemplate {
  sections: SiteSection[];
  title: string;
  description: string;
}

/** 模板页的版式：租户自定义过的那一份，否则内置兜底。 */
async function resolveDocTemplate(
  tenantId: string,
  kind: DocTemplateKind,
  locale: AppLocale,
): Promise<DocTemplate> {
  const stored = await getPublishedDocTemplate(tenantId, kind, locale);
  if (stored) return stored;
  const t = createStarterTranslator(locale);
  const preset = DOC_TEMPLATE_PRESETS[kind];
  return {
    sections: buildDocTemplateSections(kind, t),
    title: t(preset.titleKey),
    description: t(preset.descriptionKey),
  };
}

/** 合成一个公开页面交给 `renderMarketingHtml`（不落库）。 */
function synthesizeDocPage(input: {
  path: string;
  locale: AppLocale;
  defaultLocale: AppLocale;
  title: string;
  description: string;
  sections: SiteSection[];
  updatedAt: string;
}): PublicMarketingPage {
  const alternates: PageLocaleAlternate[] = [
    {
      locale: input.locale,
      path: withSiteLocale(input.path, input.locale, input.defaultLocale),
    },
  ];
  return {
    slug: input.path,
    locale: input.locale,
    kind: "page",
    title: input.title,
    description: input.description,
    sections: input.sections,
    settings: {} as MarketingPageSettings,
    visibility: "public" as MarketingPageVisibility,
    path: input.path,
    alternates,
    updated_at: input.updatedAt,
  };
}

/**
 * 渲染文档库。path 为 `/docs`（索引）或 `/docs/:slug`（详情）。
 * @returns HTML 字符串，或 `null` 表示应走 404（站点未发布 / 文档不存在）。
 */
export async function renderDocLibrary(input: {
  tenantId: string;
  origin: string;
  site: PublicMarketingSite | null;
  accountEntryHtml: string;
  enabledEntitlements: ReadonlySet<string>;
  path: string;
  locale: AppLocale | null;
}): Promise<string | null> {
  const { site, path, locale } = input;
  if (!site) return null;

  const defaultLocale = site.default_locale;
  const slug =
    path === DOCS_INDEX_PATH ? null : path.slice(DOCS_INDEX_PATH.length + 1);

  const render = (
    page: PublicMarketingPage,
    docs: PublicDocSummary[],
    doc?: PublicDocDetail,
  ): string =>
    renderMarketingHtml({
      origin: input.origin,
      site,
      page,
      accountEntryHtml: input.accountEntryHtml,
      enabledEntitlements: input.enabledEntitlements,
      docContext: { docs, doc, docsIndexPath: DOCS_INDEX_PATH },
    });

  if (slug === null) {
    const { docs, locale: effectiveLocale } = await listPublishedDocs(
      input.tenantId,
      locale,
    );
    const template = await resolveDocTemplate(
      input.tenantId,
      "doc_index",
      effectiveLocale,
    );
    return render(
      synthesizeDocPage({
        path,
        locale: effectiveLocale,
        defaultLocale,
        title: template.title,
        description: template.description,
        sections: template.sections,
        // 索引页的「最后更新」就是最近改过的那篇文档
        updatedAt: docs[0]?.updated_at ?? new Date().toISOString(),
      }),
      docs,
    );
  }

  const result = await getPublishedDoc(input.tenantId, slug, locale);
  if (!result) return null;

  // 目录也要取：详情页上的 `doc-nav` 列的是**整个文档库**，不只当前这一篇
  const [{ docs }, template] = await Promise.all([
    listPublishedDocs(input.tenantId, result.locale),
    resolveDocTemplate(input.tenantId, "doc_article", result.locale),
  ]);

  return render(
    synthesizeDocPage({
      path: docPath(result.doc.slug),
      locale: result.locale,
      defaultLocale,
      // SEO 跟着**文档**走，不是跟着模板页：每篇的标题 / 摘要各不相同
      title: result.doc.title,
      description: result.doc.description,
      sections: template.sections,
      updatedAt: result.doc.updated_at,
    }),
    docs,
    result.doc,
  );
}
