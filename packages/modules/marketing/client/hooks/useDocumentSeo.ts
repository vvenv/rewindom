import { useEffect } from "react";

import { useTranslation } from "react-i18next";

import { buildCanonicalUrl, type PageSeo } from "../../shared/index.js";
import {
  buildLocalizedDocumentTitle,
  localizePageSeo,
} from "../lib/marketing-i18n.js";

function upsertMeta(name: string, content: string): void {
  let tag = document.head.querySelector<HTMLMetaElement>(
    `meta[name="${name}"]`,
  );
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute("name", name);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}

function upsertCanonical(href: string): void {
  let tag = document.head.querySelector<HTMLLinkElement>(
    'link[rel="canonical"]',
  );
  if (!tag) {
    tag = document.createElement("link");
    tag.setAttribute("rel", "canonical");
    document.head.appendChild(tag);
  }
  tag.setAttribute("href", href);
}

/**
 * SPA 侧维护 `<head>`。
 *
 * 首屏的 head 是预渲染脚本写死在 HTML 里的；
 * 这个 hook 负责客户端路由切换后把 title / description / canonical 跟上当前 URL 与语言。
 */
export function useDocumentSeo(
  seo: PageSeo | undefined,
  pathname: string,
): void {
  const { t, i18n } = useTranslation("marketing");

  useEffect(() => {
    if (!seo) {
      return;
    }

    const localized = localizePageSeo({ ...seo, path: pathname }, t);
    document.title = buildLocalizedDocumentTitle(localized, t);
    upsertMeta("description", localized.description);
    upsertCanonical(buildCanonicalUrl(window.location.origin, pathname));
  }, [seo, pathname, t, i18n.language]);
}
