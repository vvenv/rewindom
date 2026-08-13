import { Badge } from "@rewindom/ui/badge";
import { Button } from "@rewindom/ui/button";
import { CardAction, CardHeader, CardTitle } from "@rewindom/ui/card";
import { Skeleton } from "@rewindom/ui/skeleton";
import { ExternalLink, Settings2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { localizeSiteText } from "../../shared/section-schema.js";

import { SiteSettingsSheet } from "./SiteSettingsSheet.js";

import type { MarketingSite } from "../../shared/site-cms.js";
import type { SitePageSummary } from "../lib/site-page-order.js";
import type { AppLocale } from "@rewindom/shared";

interface SiteSummaryHeaderProps {
  site: MarketingSite | undefined;
  defaultLocale: AppLocale;
  isLoading: boolean;
  /** 页面计数概览；页面还没加载出来时不给。 */
  summary?: SitePageSummary;
}

/**
 * 站点卡片的头部：名称、发布状态 + 站点级操作。
 *
 * 进编辑器靠下方页面行，卡头不再挂「编辑某某」——会和列表入口重复，而且按钮名
 * 永远对不齐「整站 / 首页 / 某一页」哪一层。
 *
 * | 按钮       | 干什么                         |
 * | ---------- | ------------------------------ |
 * | 查看官网   | 新窗口看访客看到的站           |
 * | 站点设置   | Sheet：站名、语言、发布、重定向 |
 */
export function SiteSummaryHeader({
  site,
  defaultLocale,
  isLoading,
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
          域名会在自定义域名 / 本地 `{slug}.localhost` 上指错站点。
        */}
        <Button asChild variant="outline" size="sm">
          <a
            href="/"
            target="_blank"
            rel="noreferrer noopener"
            aria-label={t("cms.viewSite")}
          >
            <ExternalLink className="size-4" />
            <span className="hidden lg:inline">{t("cms.viewSite")}</span>
          </a>
        </Button>
        <SiteSettingsSheet site={site}>
          <Button variant="outline" size="sm" aria-label={t("cms.settings")}>
            <Settings2 className="size-4" />
            <span className="hidden lg:inline">{t("cms.settings")}</span>
          </Button>
        </SiteSettingsSheet>
      </CardAction>
    </CardHeader>
  );
}
