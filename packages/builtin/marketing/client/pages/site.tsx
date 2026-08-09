import { PageLayout, usePermissions } from "@be-water/client-kit";
import { normalizeLocale } from "@be-water/shared";
import { Card, CardContent } from "@be-water/ui/card";
import { DraggableFabTrigger } from "@be-water/ui/draggable-fab";
import { Globe, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

import { SiteDocTemplateRows } from "../components/SiteDocTemplateRows.js";
import { SitePageCreateSheet } from "../components/SitePageCreateSheet.js";
import { SitePageList } from "../components/SitePageList.js";
import { SiteSummaryHeader } from "../components/SiteSummaryHeader.js";
import { useSitePageActions } from "../hooks/use-site-page-actions.js";
import { useSite, useSitePages } from "../hooks/useSite.js";
import { hasSiteStarterContent } from "../lib/site-content-state.js";
import { groupSitePages } from "../lib/site-page-groups.js";

export function Site() {
  const { t } = useTranslation("marketing");
  const { hasPermission } = usePermissions();
  const canWrite = hasPermission("site.write");
  const siteQuery = useSite();
  const pagesQuery = useSitePages();
  const actions = useSitePageActions();
  const defaultLocale = normalizeLocale(siteQuery.data?.default_locale);
  const pages = pagesQuery.data ?? [];

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
      {/* 站点与它的页面是同一个对象，收进一张卡：卡头是站点，卡身是页面列表。 */}
      <Card className="gap-0 pb-0">
        <SiteSummaryHeader
          site={siteQuery.data}
          defaultLocale={defaultLocale}
          isLoading={siteQuery.isLoading}
          canWrite={canWrite}
          hasStarterContent={hasSiteStarterContent(
            siteQuery.data,
            pages,
            defaultLocale,
          )}
        />
        <CardContent className="px-0">
          <SitePageList
            groups={groupSitePages(pages, defaultLocale)}
            defaultLocale={defaultLocale}
            canWrite={canWrite}
            isLoading={pagesQuery.isLoading}
            isError={pagesQuery.isError}
            error={pagesQuery.error}
            onRetry={() => void pagesQuery.refetch()}
            actions={actions}
          />
          {/* 文档的两张模板页默认不落库，列表里看不到——单独常驻两行做入口 */}
          {pagesQuery.isSuccess ? (
            <SiteDocTemplateRows
              pages={pages}
              defaultLocale={defaultLocale}
              canWrite={canWrite}
              actions={actions}
            />
          ) : null}
        </CardContent>
      </Card>
    </PageLayout>
  );
}
