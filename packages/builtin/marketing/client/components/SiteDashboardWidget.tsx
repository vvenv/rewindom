import { DashboardWidgetCard } from "@be-water/client-kit";
import { Badge } from "@be-water/ui/badge";
import { Globe } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useSite, useSitePages } from "../hooks/useSite.js";

/** 工作台卡片：官网发布状态与页面数量。 */
export function SiteDashboardWidget() {
  const { t } = useTranslation("marketing");
  const { data: site, isLoading: siteLoading, isError: siteError } = useSite();
  const { data: pages, isLoading: pagesLoading } = useSitePages();

  const publishedCount =
    pages?.filter((page) => page.status === "published").length ?? 0;
  const draftCount = (pages?.length ?? 0) - publishedCount;
  // 草稿与线上不一致的页面：提示「有改动没发布」，这是 CMS 上最常被忘掉的一件事
  const dirtyCount =
    (pages?.filter((page) => page.content_dirty).length ?? 0) +
    (site?.chrome_dirty ? 1 : 0);

  return (
    <DashboardWidgetCard
      icon={Globe}
      title={t("dashboard.title")}
      to="/app/site"
      viewAllLabel={t("dashboard.viewAll")}
      headerExtra={
        site ? (
          <Badge variant={site.published ? "secondary" : "outline"}>
            {t(site.published ? "dashboard.published" : "dashboard.unpublished")}
          </Badge>
        ) : null
      }
      isLoading={siteLoading || pagesLoading}
      isError={siteError}
    >
      <dl className="flex flex-col gap-2 text-sm">
        <div className="flex items-center justify-between gap-2">
          <dt className="text-muted-foreground">
            {t("dashboard.publishedPages")}
          </dt>
          <dd className="tabular-nums font-medium">{publishedCount}</dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-muted-foreground">{t("dashboard.draftPages")}</dt>
          <dd className="tabular-nums font-medium">{draftCount}</dd>
        </div>
        {dirtyCount > 0 ? (
          <p className="text-xs text-warning">
            {t("dashboard.pendingChanges", { count: dirtyCount })}
          </p>
        ) : null}
      </dl>
    </DashboardWidgetCard>
  );
}
