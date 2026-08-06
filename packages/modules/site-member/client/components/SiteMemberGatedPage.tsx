import { useEffect, useState, type ReactNode } from "react";

import { Spinner } from "@be-water/ui/spinner";

import { useOptionalSiteMemberAuth } from "../contexts/SiteMemberAuthContext.js";
import { siteMemberApi } from "../lib/site-member-api.js";

import { SiteMemberGate } from "./SiteMemberGate.js";

import type { PublicMarketingPage } from "../../../marketing/shared/site-cms.js";
import type { AppLocale } from "@be-water/shared";

interface SiteMemberGatedPageProps {
  logicalPath: string;
  locale?: AppLocale;
  redirectTo: string;
  summary: PublicMarketingPage;
  renderReady: (page: PublicMarketingPage) => ReactNode;
  renderShell: (body: ReactNode) => ReactNode;
}

/**
 * 会员专属页：未登录显示门控；已登录用会员 api 实例拉完整正文再交给 marketing 渲染。
 */
export function SiteMemberGatedPage({
  logicalPath,
  locale,
  redirectTo,
  summary,
  renderReady,
  renderShell,
}: SiteMemberGatedPageProps): ReactNode {
  const auth = useOptionalSiteMemberAuth();
  const [page, setPage] = useState<PublicMarketingPage | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "gate">(
    "idle",
  );

  useEffect(() => {
    if (!auth || auth.isLoading) return;
    if (!auth.isAuthenticated) {
      setPage(null);
      setStatus("gate");
      return;
    }

    let cancelled = false;
    setStatus("loading");
    void siteMemberApi
      .get<{ page: PublicMarketingPage }>("/site/content/page", {
        path: logicalPath,
        ...(locale ? { locale } : {}),
      })
      .then((result) => {
        if (!cancelled) {
          setPage(result.page);
          setStatus("ready");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPage(null);
          setStatus("gate");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [auth, auth?.isAuthenticated, auth?.isLoading, logicalPath, locale]);

  if (!auth || auth.isLoading || status === "idle" || status === "loading") {
    return renderShell(
      <div className="flex justify-center py-24">
        <Spinner />
      </div>,
    );
  }

  if (status === "ready" && page) {
    return renderReady(page);
  }

  // 未登录或拉正文失败：保留摘要元数据外壳，主区显示门控
  void summary;
  return renderShell(<SiteMemberGate redirectTo={redirectTo} />);
}
