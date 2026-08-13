import { PageLayout, usePermissions } from "@rewindom/client-kit";
import { normalizeLocale } from "@rewindom/shared";
import { Card, CardContent } from "@rewindom/ui/card";
import { DraggableFabTrigger } from "@rewindom/ui/draggable-fab";
import { Globe, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

import { SitePageCreateSheet } from "../components/SitePageCreateSheet.js";
import { SitePageFilters } from "../components/SitePageFilters.js";
import { SitePageList } from "../components/SitePageList.js";
import { SiteSummaryHeader } from "../components/SiteSummaryHeader.js";
import { SiteTemplatePageRows } from "../components/SiteTemplatePageRows.js";
import { useSitePageActions } from "../hooks/use-site-page-actions.js";
import { useSitePagesPage } from "../hooks/use-site-pages-page.js";
import {
  useSite,
  useSiteCapabilities,
  useSitePages,
} from "../hooks/useSite.js";
import { groupSitePages } from "../lib/site-page-groups.js";
import {
  collectSitePageLocales,
  filterSitePageGroups,
} from "../lib/site-page-list.js";
import { summarizeSitePages } from "../lib/site-page-order.js";

/** 页面少于这个数就不画筛选栏——三行东西上面顶一条搜索框只是占地方。 */
const FILTER_BAR_MIN_GROUPS = 5;

export function Site() {
  const { t } = useTranslation("marketing");
  const { hasPermission } = usePermissions();
  const canWrite = hasPermission("site.write");
  const siteQuery = useSite();
  const pagesQuery = useSitePages();
  const actions = useSitePageActions();
  const capabilitiesQuery = useSiteCapabilities();
  const entitlements = new Set(capabilitiesQuery.data?.entitlements ?? []);
  const { filters, handleFiltersChange, resetFilters } = useSitePagesPage();
  const defaultLocale = normalizeLocale(siteQuery.data?.default_locale);
  const pages = pagesQuery.data ?? [];

  const allGroups = groupSitePages(pages, defaultLocale);
  const isFiltered = Boolean(filters.q ?? filters.status ?? filters.locale);
  const groups = isFiltered
    ? filterSitePageGroups(allGroups, filters)
    : allGroups;

  // 筛到只剩一种语言时那组 chip 不该跟着消失，所以按未筛选的全量算
  const locales = collectSitePageLocales(pages);
  const showFilters =
    pagesQuery.isSuccess &&
    (allGroups.length >= FILTER_BAR_MIN_GROUPS || isFiltered);

  return (
    <PageLayout
      icon={Globe}
      title={t("cms.title")}
      description={t("cms.pageDescription")}
      action={
        canWrite ? (
          <SitePageCreateSheet>
            <DraggableFabTrigger storageKey="site_create_fab">
              <Plus className="size-6 md:size-4" />
              <span className="hidden md:inline">{t("cms.create")}</span>
            </DraggableFabTrigger>
          </SitePageCreateSheet>
        ) : null
      }
    >
      <div className="flex flex-col gap-4">
        {showFilters ? (
          <SitePageFilters
            filters={filters}
            locales={locales}
            onFiltersChange={handleFiltersChange}
          />
        ) : null}

        {/* 站点与它的页面是同一个对象，收进一张卡：卡头是站点，卡身是页面列表。 */}
        <Card className="gap-0 pb-0">
          <SiteSummaryHeader
            site={siteQuery.data}
            defaultLocale={defaultLocale}
            isLoading={siteQuery.isLoading}
            summary={
              pagesQuery.isSuccess ? summarizeSitePages(pages) : undefined
            }
          />
          <CardContent className="px-0">
            <SitePageList
              groups={groups}
              allGroups={allGroups}
              defaultLocale={defaultLocale}
              canWrite={canWrite}
              isLoading={pagesQuery.isLoading}
              isError={pagesQuery.isError}
              error={pagesQuery.error}
              isFiltered={isFiltered}
              onRetry={() => void pagesQuery.refetch()}
              onResetFilters={resetFilters}
              actions={actions}
            />
            {/*
              模板页不进普通页面目录（没有可排的顺序），单独常驻几行。
              相关时已由服务端快照落库；筛选不作用于它们——筛的是「页面」，
              把常驻入口一起筛掉只会让人以为版式功能没了。
            */}
            {pagesQuery.isSuccess ? (
              <SiteTemplatePageRows
                pages={pages}
                defaultLocale={defaultLocale}
                canWrite={canWrite}
                entitlements={entitlements}
                actions={actions}
              />
            ) : null}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
