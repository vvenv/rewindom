import type { ReactElement } from "react";

import type { ChromeBlockViewProps } from "../../../../packages/builtin/marketing/client/components/sections/chrome-views.js";
import { useSiteLocale } from "../../../../packages/builtin/marketing/client/components/sections/site-locale-context.js";
import { withSiteLocale } from "../../../../packages/builtin/marketing/shared/site-locale.js";

import { DOCS_INDEX_PATH, docMessages } from "../../shared/site-doc.js";

const SEARCH_ICON = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={16}
    height={16}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

/** 编辑器预览：页头文档搜索。访客看到的是 SSR 表单。 */
export function SearchBlock(_props: ChromeBlockViewProps): ReactElement {
  const locale = useSiteLocale();
  const label = docMessages(locale).search;
  const action = withSiteLocale(DOCS_INDEX_PATH, locale, locale);
  return (
    <form className="chrome-search" role="search" method="get" action={action}>
      {SEARCH_ICON}
      <input type="search" name="q" placeholder={label} aria-label={label} />
    </form>
  );
}
