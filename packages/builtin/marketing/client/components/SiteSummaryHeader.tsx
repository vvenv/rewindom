import { Badge } from "@be-water/ui/badge";
import { Button } from "@be-water/ui/button";
import { CardAction, CardHeader, CardTitle } from "@be-water/ui/card";
import { Skeleton } from "@be-water/ui/skeleton";
import { ExternalLink, LayoutTemplate, Settings2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { localizeSiteText } from "../../shared/section-schema.js";

import { SiteSettingsSheet } from "./SiteSettingsSheet.js";
import { SiteStarterMenu } from "./SiteStarterMenu.js";

import type { MarketingSite } from "../../shared/site-cms.js";
import type { SitePageSummary } from "../lib/site-page-order.js";
import type { AppLocale } from "@be-water/shared";

interface SiteSummaryHeaderProps {
  site: MarketingSite | undefined;
  defaultLocale: AppLocale;
  isLoading: boolean;
  canWrite: boolean;
  /** 起步模板会覆盖既有内容时先确认。 */
  hasStarterContent: boolean;
  /** 页面计数概览；页面还没加载出来时不给。 */
  summary?: SitePageSummary;
}

/**
 * 站点卡片的头部：名称、发布状态、标语 + 站点级操作。
 *
 * 自带 `CardHeader` 而不是让 Page 包一层——站点接口没数据时（加载完仍为空、
 * 或接口失败）整块让位，卡片不会剩一条空的分隔线。
 */
export function SiteSummaryHeader({
  site,
  defaultLocale,
  isLoading,
  canWrite,
  hasStarterContent,
  summary,
}: SiteSummaryHeaderProps) {
  const { t } = useTranslation("marketing");

  if (!site) {
    if (!isLoading) return null;
    return (
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </CardTitle>
      </CardHeader>
    );
  }

  return (
    <CardHeader className="border-b flex items-center justify-between gap-2">
      <CardTitle className="flex items-center gap-2">
        <span className="truncate">
          {localizeSiteText(site.site_name, defaultLocale, defaultLocale)}
        </span>
        <Badge variant={site.published ? "default" : "secondary"}>
          {site.published ? t("cms.statusPublished") : t("cms.statusDraft")}
        </Badge>
        {summary ? (
          <span className="flex items-center gap-x-2 gap-y-1 text-xs font-normal text-muted-foreground">
            {/*
              插值名各不相同、也不叫 `count`：`count` 会触发 i18next 的复数解析，
              去找一个并不存在的 `_one` / `_other` 变体。
            */}
            <span>{t("cms.summaryPages", { total: summary.total })}</span>
            <span aria-hidden>·</span>
            <span>
              {t("cms.summaryPublished", { published: summary.published })}
            </span>
            {summary.dirty > 0 ? (
              <>
                <span aria-hidden>·</span>
                <span className="text-amber-600 dark:text-amber-500">
                  {t("cms.summaryDirty", { dirty: summary.dirty })}
                </span>
              </>
            ) : null}
          </span>
        ) : null}
      </CardTitle>
      <CardAction className="flex items-center gap-2">
        {/*
          官网就挂在当前 Host 的 `/`（见 Host 分流），所以用相对地址即可——写死
          域名会在自定义域名 / 本地 `{slug}.localhost` 上指错站点。只读也能看，
          所以放在 `canWrite` 之外。
        */}
        <Button asChild variant="outline" size="sm">
          <a
            href="/"
            target="_blank"
            rel="noreferrer noopener"
            aria-label={t("cms.viewSite")}
          >
            <ExternalLink className="size-4" />
            <span className="hidden sm:inline">{t("cms.viewSite")}</span>
          </a>
        </Button>
        {canWrite ? (
          <>
            <Button asChild variant="outline" size="sm">
              <Link to="/app/site/chrome">
                <LayoutTemplate className="size-4" />
                <span className="hidden sm:inline">
                  {t("cms.chromeEditor")}
                </span>
              </Link>
            </Button>
            <SiteStarterMenu hasContent={hasStarterContent} />
            <SiteSettingsSheet site={site}>
              <Button variant="outline" size="sm">
                <Settings2 className="size-4" />
                <span className="hidden sm:inline">{t("cms.settings")}</span>
              </Button>
            </SiteSettingsSheet>
          </>
        ) : null}
      </CardAction>
    </CardHeader>
  );
}
