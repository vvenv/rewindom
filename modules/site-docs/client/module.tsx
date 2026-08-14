import { FileText, LibraryBig, List, ListTree, Search } from "lucide-react";

import { registerChromeBlockView } from "../../../packages/builtin/marketing/client/components/sections/chrome-views.js";
import { registerSiteSectionView } from "../../../packages/builtin/marketing/client/components/sections/section-views.js";
import { registerReservedPageSlug } from "../../../packages/builtin/marketing/shared/reserved-slugs.js";

import { SITE_DOCS_ENTITLEMENT } from "../shared/entitlements.js";
import { registerDocsNavSources } from "../shared/nav-sources.js";
import { registerDocsPageTemplates } from "../shared/page-templates.js";
import { siteDocsSearchBlock } from "../shared/search-block.js";
import { siteDocsArticleSection } from "../shared/sections/article/definition.js";
import { siteDocsListSection } from "../shared/sections/list/definition.js";
import { siteDocsNavSection } from "../shared/sections/nav/definition.js";
import { siteDocsTocSection } from "../shared/sections/toc/definition.js";
import {
  ARTICLE_CSS,
  LIST_CSS,
  NAV_CSS,
  SEARCH_CSS,
  TOC_CSS,
} from "../shared/site-css.generated.js";

import { SearchBlock } from "./components/SearchBlock.js";
import { SiteDocsArticleSection } from "./components/sections/views/article.js";
import { SiteDocsListSection } from "./components/sections/views/list.js";
import { SiteDocsNavSection } from "./components/sections/views/nav.js";
import { SiteDocsTocSection } from "./components/sections/views/toc.js";
import { registerDocsEditorContext } from "./editor-context.js";
import { SITE_DOCS_I18N } from "./i18n.js";
import { SITE_DOCS_NAV_SECTIONS } from "./tenant/nav-sections.js";
import { renderSiteDocsRoutes } from "./tenant/routes.js";

import type { ClientAppModule } from "@rewindom/module-sdk/client";

registerDocsPageTemplates();
registerDocsNavSources();
registerReservedPageSlug("docs");
registerDocsEditorContext();

registerSiteSectionView(siteDocsListSection, SiteDocsListSection, {
  css: LIST_CSS,
  icon: LibraryBig,
});
registerSiteSectionView(siteDocsArticleSection, SiteDocsArticleSection, {
  css: ARTICLE_CSS,
  icon: FileText,
});
registerSiteSectionView(siteDocsNavSection, SiteDocsNavSection, {
  css: NAV_CSS,
  icon: List,
});
registerSiteSectionView(siteDocsTocSection, SiteDocsTocSection, {
  css: TOC_CSS,
  icon: ListTree,
});
registerChromeBlockView(siteDocsSearchBlock, SearchBlock, {
  css: SEARCH_CSS,
  icon: Search,
});

export const siteDocsClientModule: ClientAppModule = {
  id: "site-docs",
  version: "1.0.0",
  label: "Docs library",
  kind: "business",
  description: "站点文档库：Markdown 文档、分类与公开 /docs",
  requires: ["marketing"],
  tenantEntitlements: [SITE_DOCS_ENTITLEMENT],
  client: {
    i18n: SITE_DOCS_I18N,
    renderRoutes: renderSiteDocsRoutes,
    nav: SITE_DOCS_NAV_SECTIONS,
  },
};
