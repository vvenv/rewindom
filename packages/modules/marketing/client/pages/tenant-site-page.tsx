import { useEffect, useState, type ReactNode } from "react";
import { useLocation } from "react-router";

import { TenantSiteView } from "../components/TenantSiteView.js";
import { useTenantPublicSite } from "../hooks/use-tenant-public-site.js";
import { fetchPublicSitePage } from "../lib/site-api.js";

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
  const siteState = useTenantPublicSite();
  const [page, setPage] = useState<PublicMarketingPage | null>(null);
  const [pageStatus, setPageStatus] = useState<
    "idle" | "loading" | "ready" | "missing"
  >("idle");

  const logicalPath =
    pathname.replace(/^\/(en|zh-CN)(?=\/|$)/u, "") || "/";

  useEffect(() => {
    if (siteState.status !== "ready") return;
    let cancelled = false;
    setPageStatus("loading");
    void fetchPublicSitePage(logicalPath)
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
  }, [siteState.status, logicalPath]);

  if (siteState.status === "idle" || siteState.status === "loading") {
    return fallback;
  }
  if (siteState.status === "none") {
    return fallback;
  }

  if (pageStatus === "loading" || pageStatus === "idle") {
    return (
      <TenantSiteView site={siteState.site} path={logicalPath} body_md="" />
    );
  }

  if (pageStatus === "missing" || !page) {
    return <TenantSiteView site={siteState.site} path={logicalPath} />;
  }

  return (
    <TenantSiteView
      site={siteState.site}
      path={logicalPath}
      body_md={page.body_md}
      home_blocks={page.home_blocks}
      title={page.title}
      description={page.description}
    />
  );
}
