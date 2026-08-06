import { useEffect, useState, type ReactNode } from "react";

import { DEFAULT_LOCALE } from "@be-water/shared";
import { useLocation } from "react-router";

import { parseSiteLocalePath } from "../../shared/site-locale.js";
import { useTenantPublicSite } from "../hooks/use-tenant-public-site.js";
import { fetchPublicSitePage } from "../lib/site-api.js";

import { TenantSiteView } from "./TenantSiteView.js";

import type { PublicMarketingPage } from "../../shared/site-cms.js";

/**
 * 绑定 Host 下按当前 path 渲染租户页面；非绑定 / 未发布时回落平台页。
 */
export function TenantSitePageGate({
  fallback,
}: {
  fallback: ReactNode;
}): ReactNode {
  const { pathname } = useLocation();
  /*
   * `path` / `prefixed` 与传入的默认语言无关（只有「没写前缀时算哪种语言」才用得上），
   * 而站点的 `default_locale` 要等站点拉回来才知道——所以这里传平台兜底值，
   * 只取 URL 上**显式**写了的语言，其余交给服务端回落。
   */
  const parsed = parseSiteLocalePath(pathname, DEFAULT_LOCALE);
  const requestedLocale = parsed.prefixed ? parsed.locale : undefined;
  const logicalPath = parsed.path;
  const siteState = useTenantPublicSite(requestedLocale);
  const [page, setPage] = useState<PublicMarketingPage | null>(null);
  const [pageStatus, setPageStatus] = useState<
    "idle" | "loading" | "ready" | "missing"
  >("idle");

  useEffect(() => {
    if (siteState.status !== "ready") return;
    let cancelled = false;
    setPageStatus("loading");
    void fetchPublicSitePage(logicalPath, requestedLocale)
      .then((result) => {
        if (!cancelled) {
          setPage(result.page);
          setPageStatus("ready");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPage(null);
          setPageStatus("missing");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [siteState.status, logicalPath, requestedLocale]);

  if (siteState.status !== "ready") {
    return fallback;
  }

  if (pageStatus === "loading" || pageStatus === "idle") {
    return <TenantSiteView site={siteState.site} path={logicalPath} />;
  }

  if (pageStatus === "missing" || !page) {
    return <TenantSiteView site={siteState.site} path={logicalPath} />;
  }

  return (
    <TenantSiteView
      site={siteState.site}
      path={logicalPath}
      sections={page.sections}
      pageSettings={page.settings}
      alternates={page.alternates}
    />
  );
}
