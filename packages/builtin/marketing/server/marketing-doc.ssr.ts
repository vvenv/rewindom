/**
 * 租户文档库的 SSR 渲染：`/docs`（索引）与 `/docs/:slug`（详情）。
 *
 * 不另起一套 chrome：合成一个只含 `prose` 段的 `PublicMarketingPage`，复用
 * `renderMarketingHtml`——页头 / 页脚 / 主题 / SEO / `.prose` 排版全部走同一条路。
 * 文档不进 section / block 编辑器，所以合成是单向的（只读，不写回 DB）。
 *
 * 正文不复用 prose 段渲染：通过 `renderMarketingHtml` 的 `mainHtml` 注入自定义 HTML，
 * 列表页出卡片网格（按分类分组），详情页出文档头（分类标签 + 更新时间 + 返回链）+ 正文。
 * 合成 page 仍带一个 prose 段，只为让按需 CSS 把 `.prose` 排版发出来。
 */

import { type AppLocale } from "@be-water/shared";

import { escapeHtml } from "../shared/html.js";
import { createSectionId, type SiteSection } from "../shared/section-schema.js";
import { md } from "../shared/sections/_common/html.js";
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

function docIndexLead(locale: AppLocale): string {
  return locale.startsWith("zh")
    ? "浏览所有已发布文档"
    : "Browse all published docs";
}

function docBackLabel(locale: AppLocale): string {
  return locale.startsWith("zh") ? "返回文档" : "Back to docs";
}

function docUpdatedLabel(locale: AppLocale): string {
  return locale.startsWith("zh") ? "更新于" : "Updated";
}

function docOtherCategory(locale: AppLocale): string {
  return locale.startsWith("zh") ? "其它" : "Other";
}

function docEmptyMessage(locale: AppLocale): string {
  return locale.startsWith("zh")
    ? "还没有已发布的文档。"
    : "No published docs yet.";
}

function formatDate(iso: string, locale: AppLocale): string {
  try {
    return new Date(iso).toLocaleDateString(
      locale.startsWith("zh") ? "zh-CN" : "en-US",
      { year: "numeric", month: "short", day: "numeric" },
    );
  } catch {
    return iso.slice(0, 10);
  }
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

/** 把文档按分类分组，渲染成卡片网格 HTML。 */
function buildDocListHtml(
  docs: PublicMarketingDoc[],
  locale: AppLocale,
  defaultLocale: AppLocale,
): string {
  if (docs.length === 0) {
    return `<div class="wrap"><div class="doc-empty">${escapeHtml(docEmptyMessage(locale))}</div></div>`;
  }
  const otherLabel = docOtherCategory(locale);
  const grouped = new Map<string, PublicMarketingDoc[]>();
  for (const doc of docs) {
    const category = doc.category || otherLabel;
    const list = grouped.get(category);
    if (list) list.push(doc);
    else grouped.set(category, [doc]);
  }
  const groups: string[] = [];
  for (const [category, items] of grouped) {
    const cards = items
      .map((doc) => {
        const href = withSiteLocale(`/docs/${doc.slug}`, locale, defaultLocale);
        return `<a class="card doc-card" href="${escapeHtml(href)}">
  <span class="title">${escapeHtml(doc.title)}</span>${
    doc.description
      ? `\n  <span class="muted">${escapeHtml(doc.description)}</span>`
      : ""
  }
</a>`;
      })
      .join("\n");
    groups.push(
      `<section class="doc-group">
  <h2 class="doc-group-title">${escapeHtml(category)}</h2>
  <div class="grid cols-2">
${cards}
  </div>
</section>`,
    );
  }
  return `<div class="wrap doc-index">
  <header class="doc-index-head">
    <p class="eyebrow">${escapeHtml(docIndexLead(locale))}</p>
    <h1>${escapeHtml(docIndexTitle(locale))}</h1>
  </header>
${groups.join("\n")}
</div>`;
}

/** 详情页正文：返回链 + 元信息（分类标签、更新时间）+ 标题 + 正文 prose。 */
function buildDocDetailHtml(
  doc: PublicMarketingDoc,
  locale: AppLocale,
  defaultLocale: AppLocale,
): string {
  const backHref = withSiteLocale("/docs", locale, defaultLocale);
  const categoryTag = doc.category
    ? `<span class="tag">${escapeHtml(doc.category)}</span>`
    : "";
  const date = `<span>${escapeHtml(docUpdatedLabel(locale))} ${escapeHtml(formatDate(doc.updated_at, locale))}</span>`;
  return `<div class="wrap">
  <article class="doc-detail">
    <a class="doc-back" href="${escapeHtml(backHref)}">← ${escapeHtml(docBackLabel(locale))}</a>
    <div class="doc-meta">${categoryTag}${date}</div>
    <h1>${escapeHtml(doc.title)}</h1>${
      doc.description
        ? `\n    <p class="doc-lead">${escapeHtml(doc.description)}</p>`
        : ""
    }
    <div class="prose">${md(doc.body_md)}</div>
  </article>
</div>`;
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
      description: docIndexLead(effectiveLocale),
      bodyMd: "",
    });
    return renderMarketingHtml({
      origin: input.origin,
      site,
      page,
      accountEntryHtml: input.accountEntryHtml,
      enabledEntitlements: input.enabledEntitlements,
      mainHtml: buildDocListHtml(docs, effectiveLocale, defaultLocale),
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
    mainHtml: buildDocDetailHtml(result.doc, result.locale, defaultLocale),
  });
}
