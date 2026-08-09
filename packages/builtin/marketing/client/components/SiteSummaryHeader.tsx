import { Badge } from "@be-water/ui/badge";
import { Button } from "@be-water/ui/button";
import {
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@be-water/ui/card";
import { Skeleton } from "@be-water/ui/skeleton";
import { Settings2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { localizeSiteText } from "../../shared/section-schema.js";

import { SiteSettingsSheet } from "./SiteSettingsSheet.js";
import { SiteStarterMenu } from "./SiteStarterMenu.js";

import type { MarketingSite } from "../../shared/site-cms.js";
import type { AppLocale } from "@be-water/shared";

interface SiteSummaryHeaderProps {
  site: MarketingSite | undefined;
  defaultLocale: AppLocale;
  isLoading: boolean;
  canWrite: boolean;
  /** 起步模板会覆盖既有内容时先确认。 */
  hasStarterContent: boolean;
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

  const taglineText = localizeSiteText(
    site.tagline,
    defaultLocale,
    defaultLocale,
  );

  return (
    <CardHeader className="border-b">
      <CardTitle className="flex min-w-0 flex-wrap items-center gap-2">
        <span className="truncate">
          {localizeSiteText(site.site_name, defaultLocale, defaultLocale)}
        </span>
        <Badge variant={site.published ? "default" : "secondary"}>
          {site.published ? t("cms.statusPublished") : t("cms.statusDraft")}
        </Badge>
      </CardTitle>
      {taglineText ? (
        <CardDescription className="truncate">{taglineText}</CardDescription>
      ) : null}
      {canWrite ? (
        <CardAction className="flex items-center gap-2">
          <SiteStarterMenu hasContent={hasStarterContent} />
          <SiteSettingsSheet site={site}>
            <Button variant="outline" size="sm">
              <Settings2 className="size-4" />
              <span className="hidden sm:inline">{t("cms.settings")}</span>
            </Button>
          </SiteSettingsSheet>
        </CardAction>
      ) : null}
    </CardHeader>
  );
}
