/**
 * 公开路径 `/docs`、`/docs/:slug`：登记进 marketing 的 path handler 表。
 *
 * 版式来自两张模板页（`docs_index` / `docs_article`）；数据走
 * `contributed["site-docs"]`。
 */

import { type AppLocale } from "@rewindom/shared";

import { SITE_DOCS_ENTITLEMENT } from "../shared/entitlements.js";
import {
  buildDocsTemplateSections,
  DOCS_ARTICLE_PAGE_KIND,
  DOCS_ARTICLE_TEMPLATE_PRESET,
  DOCS_INDEX_PAGE_KIND,
  DOCS_INDEX_TEMPLATE_PRESET,
} from "../shared/page-templates.js";
import {
  DOCS_INDEX_PATH,
  docPath,
  type PublicDocDetail,
  type PublicDocSummary,
} from "../shared/site-doc.js";
import { siteDocsContextEntry } from "../shared/site-docs-context.js";

import { registerSitePathHandler } from "../../marketing/shared/site-path-handlers.js";
import { type SiteSection } from "../../marketing/shared/section-schema.js";
import {
  type MarketingPageSettings,
  type MarketingPageVisibility,
  type PageLocaleAlternate,
  type PublicMarketingPage,
  type PublicMarketingSite,
} from "../../marketing/shared/site-cms.js";
import { getPublishedTemplatePage, getPublishedPublicSite } from "../../marketing/server/site.service.js";
import { renderMarketingHtml } from "../../marketing/server/ssr-render.js";
import { createStarterTranslator } from "../../marketing/server/starter-i18n.js";

import {
  buildDocAlternates,
  getPublishedDoc,
  listPublishedDocLocales,
  listPublishedDocs,
  listPublishedLibraryLocales,
} from "./site-doc.service.js";
import "./preset-i18n.js";

import type { SitePathHandlerInput } from "../../marketing/shared/site-path-handlers.js";

interface DocTemplate {
  sections: SiteSection[];
  title: string;
  description: string;
}

async function resolveDocTemplate(
  tenantId: string,
  kind: typeof DOCS_INDEX_PAGE_KIND | typeof DOCS_ARTICLE_PAGE_KIND,
  locale: AppLocale,
): Promise<DocTemplate> {
  const stored = await getPublishedTemplatePage(tenantId, kind, locale);
  if (stored) return stored;
  const t = createStarterTranslator(locale);
  const preset =
    kind === DOCS_INDEX_PAGE_KIND
      ? DOCS_INDEX_TEMPLATE_PRESET
      : DOCS_ARTICLE_TEMPLATE_PRESET;
  return {
    sections: buildDocsTemplateSections(kind, t),
    title: t(preset.titleKey),
    description: t(preset.descriptionKey),
  };
}

function synthesizeDocPage(input: {
  path: string;
  locale: AppLocale;
  title: string;
  description: string;
  sections: SiteSection[];
  alternates: PageLocaleAlternate[];
  updatedAt: string;
}): PublicMarketingPage {
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
    alternates: input.alternates,
    updated_at: input.updatedAt,
  };
}

export async function renderDocLibrary(input: {
  tenantId: string;
  origin: string;
  site: PublicMarketingSite | null;
  accountEntryHtml: string;
  enabledEntitlements: ReadonlySet<string>;
  path: string;
  locale: AppLocale | null;
  query?: Record<string, string>;
}): Promise<string | null> {
  const { site, path, locale } = input;
  if (!site) return null;

  const defaultLocale = site.default_locale;
  const slug =
    path === DOCS_INDEX_PATH ? null : path.slice(DOCS_INDEX_PATH.length + 1);
  const query = input.query?.q?.trim() || undefined;

  const render = (
    page: PublicMarketingPage,
    docs: PublicDocSummary[],
    doc?: PublicDocDetail,
  ): string => {
    const contributed = siteDocsContextEntry({
      docs,
      doc,
      docsIndexPath: DOCS_INDEX_PATH,
      query,
    });
    return renderMarketingHtml({
      origin: input.origin,
      site,
      page,
      accountEntryHtml: input.accountEntryHtml,
      enabledEntitlements: input.enabledEntitlements,
      contributed,
    });
  };

  if (slug === null) {
    const [{ docs, locale: effectiveLocale }, { locales }] = await Promise.all([
      listPublishedDocs(input.tenantId, locale),
      listPublishedLibraryLocales(input.tenantId),
    ]);
    const template = await resolveDocTemplate(
      input.tenantId,
      DOCS_INDEX_PAGE_KIND,
      effectiveLocale,
    );
    const alternateLocales =
      locales.length > 0 ? locales : [effectiveLocale];
    return render(
      synthesizeDocPage({
        path,
        locale: effectiveLocale,
        title: template.title,
        description: template.description,
        sections: template.sections,
        alternates: buildDocAlternates(
          DOCS_INDEX_PATH,
          alternateLocales,
          defaultLocale,
        ),
        updatedAt: docs[0]?.updated_at ?? new Date().toISOString(),
      }),
      docs,
    );
  }

  const result = await getPublishedDoc(input.tenantId, slug, locale);
  if (!result) return null;

  const [{ docs }, template, { locales: siblingLocales }] = await Promise.all([
    listPublishedDocs(input.tenantId, result.locale),
    resolveDocTemplate(input.tenantId, DOCS_ARTICLE_PAGE_KIND, result.locale),
    listPublishedDocLocales(input.tenantId, result.doc.slug),
  ]);

  const alternateLocales =
    siblingLocales.length > 0 ? siblingLocales : [result.locale];

  return render(
    synthesizeDocPage({
      path: docPath(result.doc.slug),
      locale: result.locale,
      title: result.doc.title,
      description: result.doc.description,
      sections: template.sections,
      alternates: buildDocAlternates(
        docPath(result.doc.slug),
        alternateLocales,
        defaultLocale,
      ),
      updatedAt: result.doc.updated_at,
    }),
    docs,
    result.doc,
  );
}

async function renderDocsPath(
  input: SitePathHandlerInput,
): Promise<string | null> {
  const site = await getPublishedPublicSite(
    input.tenantId,
    input.tenantSlug,
    input.locale,
  );
  return renderDocLibrary({
    tenantId: input.tenantId,
    origin: input.origin,
    site,
    accountEntryHtml: input.accountEntryHtml,
    enabledEntitlements: input.enabledEntitlements,
    path: input.path,
    locale: input.locale,
    query: input.query,
  });
}

export function registerDocsPathHandler(): void {
  registerSitePathHandler({
    match: (path) =>
      path === DOCS_INDEX_PATH || path.startsWith(`${DOCS_INDEX_PATH}/`),
    entitlement: SITE_DOCS_ENTITLEMENT.key,
    render: renderDocsPath,
  });
}
