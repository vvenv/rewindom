import { Badge } from "@be-water/ui/badge";
import { Button } from "@be-water/ui/button";
import { ButtonGroup } from "@be-water/ui/button-group";
import { CardAction, CardHeader, CardTitle } from "@be-water/ui/card";
import { Skeleton } from "@be-water/ui/skeleton";
import {
  ExternalLink,
  LayoutTemplate,
  Paintbrush,
  Settings2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { localizeSiteText } from "../../shared/section-schema.js";
import { siteEditorPath } from "../lib/site-editor-url.js";

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

        {/*
          三个「去别处配置这个站点」的入口归一组：平铺成四五个按钮时主次分不出来，
          窄一点就挤成一排图标。文案到 `lg` 才出现——中等宽度下图标 + tooltip 已经够认，
          硬留文案反而会把统计信息挤到第二行。

          **编辑器的入口都在这里**（外观 / 页头页脚，同一个编辑器的两层），侧栏一项都
          不给：两层共用 `/app/site/editor` 这一个路径，侧栏高亮只认 pathname，分不出
          在改哪一层——见 `tenant/nav-sections.ts`。

          都不进 `canWrite`：目标页都按 `site.write` 逐项禁用，只读的人进去能看不能改。
        */}
        <ButtonGroup>
          <Button asChild variant="outline" size="sm" title={t("cms.settings")}>
            <Link to="/app/site/settings">
              <Settings2 className="size-4" />
              {/*
                `sr-only lg:not-sr-only` 而不是「藏一个 + 另给一个 sr-only」：后者
                两个节点都在无障碍树里，读屏会把标签念两遍。
              */}
              <span className="sr-only lg:not-sr-only">
                {t("cms.settings")}
              </span>
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="sm"
            title={t("cms.appearance")}
          >
            <Link to={siteEditorPath({ scope: "theme" })}>
              <Paintbrush className="size-4" />
              <span className="sr-only lg:not-sr-only">
                {t("cms.appearance")}
              </span>
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="sm"
            title={t("cms.chromeEditor")}
          >
            <Link to={siteEditorPath()}>
              <LayoutTemplate className="size-4" />
              <span className="sr-only lg:not-sr-only">
                {t("cms.chromeEditor")}
              </span>
            </Link>
          </Button>
        </ButtonGroup>

        {canWrite ? <SiteStarterMenu hasContent={hasStarterContent} /> : null}
      </CardAction>
    </CardHeader>
  );
}
