import { type ReactElement } from "react";

import { pageMissingCopy } from "../../shared/page-missing.js";

import { SiteLink } from "./sections/SiteLink.js";
import { useSiteLocale } from "./sections/site-locale-context.js";

/** 内置 404 正文；与 SSR `renderPageMissingHtml` 同构。 */
export function PageMissing(): ReactElement {
  const copy = pageMissingCopy(useSiteLocale());
  return (
    <div className="page-missing">
      <p className="page-missing-code" aria-hidden="true">
        404
      </p>
      <h1>{copy.title}</h1>
      <p className="lead">{copy.description}</p>
      <p className="btn-row center">
        <SiteLink href="/" className="btn">
          {copy.home}
        </SiteLink>
      </p>
    </div>
  );
}
