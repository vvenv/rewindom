import { escapeHtml } from "@rewindom/builtin/marketing/shared/html.js";
import { withSiteLocale } from "@rewindom/builtin/marketing/shared/site-locale.js";
import {
  registerChromeBlockHtml,
  type ChromeBlockHtmlRenderer,
} from "@rewindom/builtin/marketing/shared/sections/_common/chrome-html.js";

import { siteDocsSearchBlock } from "../shared/search-block.js";
import { DOCS_INDEX_PATH, docMessages } from "../shared/site-doc.js";
import { SEARCH_CSS } from "../shared/site-css.generated.js";

const SEARCH_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>`;

const renderSearchHtml: ChromeBlockHtmlRenderer = (_block, input) => {
  const ctx = input.ctx;
  if (!ctx) return "";
  const label = escapeHtml(docMessages(ctx.locale).search);
  const action = withSiteLocale(DOCS_INDEX_PATH, ctx.locale, ctx.defaultLocale);
  return `<form class="chrome-search" role="search" method="get" action="${escapeHtml(action)}">
  ${SEARCH_ICON}
  <input type="search" name="q" placeholder="${label}" aria-label="${label}" />
</form>`;
};

export function registerDocsSearchBlockHtml(): void {
  registerChromeBlockHtml(siteDocsSearchBlock, renderSearchHtml, {
    css: SEARCH_CSS,
  });
}
