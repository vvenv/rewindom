import { registerSiteSectionHtml } from "../../marketing/shared/sections/html.js";
import { registerSectionContextProvider } from "../../marketing/server/section-context-providers.js";
import { registerSitemapProvider } from "../../marketing/server/sitemap-providers.js";
import { registerLinkTargetProvider } from "../../marketing/server/link-target-providers.js";

import { siteDocsArticleSection } from "../shared/sections/article/definition.js";
import { renderSiteDocsArticleHtml } from "../shared/sections/article/html.js";
import { siteDocsListSection } from "../shared/sections/list/definition.js";
import { renderSiteDocsListHtml } from "../shared/sections/list/html.js";
import { siteDocsNavSection } from "../shared/sections/nav/definition.js";
import { renderSiteDocsNavHtml } from "../shared/sections/nav/html.js";
import { siteDocsTocSection } from "../shared/sections/toc/definition.js";
import { renderSiteDocsTocHtml } from "../shared/sections/toc/html.js";
import { SITE_DOCS_CONTEXT_SECTION_TYPES } from "../shared/section-types.js";
import {
  DOCS_INDEX_PATH,
  docMessages,
  docPath,
} from "../shared/site-doc.js";
import { siteDocsContextEntry } from "../shared/site-docs-context.js";
import {
  ARTICLE_CSS,
  LIST_CSS,
  NAV_CSS,
  TOC_CSS,
} from "../shared/site-css.generated.js";

import {
  getPublishedDocSitemapEntries,
  listPublishedDocs,
} from "./site-doc.service.js";

function registerDocsContextProvider(): void {
  registerSectionContextProvider({
    sectionTypes: SITE_DOCS_CONTEXT_SECTION_TYPES,
    provide: async (input) => {
      const { docs } = await listPublishedDocs(input.tenantId, input.locale);
      return siteDocsContextEntry({
        docs,
        docsIndexPath: DOCS_INDEX_PATH,
      });
    },
  });
}

function registerDocsSitemap(): void {
  registerSitemapProvider({
    provide: async (tenantId) => getPublishedDocSitemapEntries(tenantId),
  });
}

function registerDocsLinkTargets(): void {
  registerLinkTargetProvider({
    provide: async (tenantId, defaultLocale) => {
      const { docs } = await listPublishedDocs(tenantId, defaultLocale);
      return [
        {
          value: DOCS_INDEX_PATH,
          label: docMessages(defaultLocale).nav,
          group: "doc" as const,
        },
        ...docs.map((doc) => ({
          value: docPath(doc.slug),
          label: doc.title,
          group: "doc" as const,
          hint: doc.category_label || undefined,
        })),
      ];
    },
  });
}

export function registerDocsSections(): void {
  registerSiteSectionHtml(siteDocsListSection, renderSiteDocsListHtml, {
    css: LIST_CSS,
  });
  registerSiteSectionHtml(siteDocsArticleSection, renderSiteDocsArticleHtml, {
    css: ARTICLE_CSS,
  });
  registerSiteSectionHtml(siteDocsNavSection, renderSiteDocsNavHtml, {
    css: NAV_CSS,
  });
  registerSiteSectionHtml(siteDocsTocSection, renderSiteDocsTocHtml, {
    css: TOC_CSS,
  });
  registerDocsContextProvider();
  registerDocsSitemap();
  registerDocsLinkTargets();
}
