/**
 * 租户文档库的 SSR 渲染：`/docs`（索引）与 `/docs/:slug`（详情）。
 *
 * 不另起一套 chrome：合成一个只含 `prose` 段的 `PublicMarketingPage`，复用
 * `renderMarketingHtml`——页头 / 页脚 / 主题 / SEO / `.prose` 排版全部走同一条路，
 * 文档与页面在视觉上一致。文档不进 section / block 编辑器，所以合成是单向的
 *（只读，不写回 DB）。
 */

import { type AppLocale } from "@be-water/shared";

import { createSectionId, type SiteSection } from "../shared/section-schema.js";
import {
  type MarketingPageSettings,
  type MarketingPageVisibility,
  type PageLocaleAlternate,
  type PublicMarketingPage,
  type PublicMarketingSite,
} from "../shared/site-cms.js";
import { withSiteLocale } from "../shared/site-locale.js";

import {
  type PublicMarketingDoc,
  getPublishedDoc,
  listPublishedDocs,
} from "./marketing-doc.service.js";
import { renderMarketingHtml } from "./ssr-render.js";

/** 索引页标题按语言给一个通用词；文档正文本身是租户写的，不需要翻译。 */
function docIndexTitle(locale: AppLocale): string {
  return locale.startsWith("zh") ? "文档" : "Docs";
}

function docEmptyMessage(locale: AppLocale): string {
  return locale.startsWith("zh")
    ? "还没有已发布的文档。"
    : "No published docs yet.";
}

/** 合成一个只含一段 prose 的公开页面，供 `renderMarketingHtml` 渲染。 */
function synthesizeDocPage(input: {
  path: string;
  locale: AppLocale;
  defaultLocale: AppLocale;
  title: string;
  description: string;
  bodyMd: string;
}): PublicMarketingPage {
  const section: SiteSection = {
    id: createSectionId(),
    type: "prose",
    settings: { body_md: input.bodyMd, content_width: "narrow" },
    blocks: [],
  };
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
    sections: [section],
    settings: {} as MarketingPageSettings,
    visibility: "public" as MarketingPageVisibility,
    path: input.path,
    alternates,
    updated_at: new Date().toISOString(),
  };
}

/** 把文档列表拼成 markdown（按分类分组），作为索引页正文。 */
function buildIndexMarkdown(
  docs: PublicMarketingDoc[],
  locale: AppLocale,
): string {
  if (docs.length === 0) {
    return docEmptyMessage(locale);
  }
  const grouped = new Map<string, PublicMarketingDoc[]>();
  for (const doc of docs) {
    const category = doc.category || "";
    const list = grouped.get(category);
    if (list) list.push(doc);
    else grouped.set(category, [doc]);
  }
  const lines: string[] = [];
  for (const [category, items] of grouped) {
    if (category) lines.push(`## ${category}`, "");
    for (const doc of items) {
      lines.push(`- [${doc.title}](/docs/${doc.slug})`);
    }
    lines.push("");
  }
  return lines.join("\n").trim();
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
  const slug = path === "/docs" ? null : path.slice("/docs/".length);

  if (slug === null) {
    const { docs, locale: effectiveLocale } = await listPublishedDocs(
      input.tenantId,
      locale,
    );
    const page = synthesizeDocPage({
      path,
      locale: effectiveLocale,
      defaultLocale,
      title: docIndexTitle(effectiveLocale),
      description: "",
      bodyMd: buildIndexMarkdown(docs, effectiveLocale),
    });
    return renderMarketingHtml({
      origin: input.origin,
      site,
      page,
      accountEntryHtml: input.accountEntryHtml,
      enabledEntitlements: input.enabledEntitlements,
    });
  }

  const result = await getPublishedDoc(input.tenantId, slug, locale);
  if (!result) return null;

  const page = synthesizeDocPage({
    path,
    locale: result.locale,
    defaultLocale,
    title: result.doc.title,
    description: result.doc.description,
    bodyMd: result.doc.body_md,
  });
  return renderMarketingHtml({
    origin: input.origin,
    site,
    page,
    accountEntryHtml: input.accountEntryHtml,
    enabledEntitlements: input.enabledEntitlements,
  });
}
