import { type AppLocale } from "@rewindom/shared";
import { Button } from "@rewindom/ui/button";
import { Spinner } from "@rewindom/ui/spinner";
import { useTranslation } from "react-i18next";

import {
  getPageTemplateKind,
  resolveCatalogPageTitle,
  type PageTemplateKindDefinition,
} from "../../shared/page-templates.js";
import {
  marketingPagePath,
  type MarketingPageListItem,
} from "../../shared/site-cms.js";
import { siteLocaleOrder } from "../../shared/site-locale.js";
import {
  listSiteTemplateAreaGroups,
  type SiteTemplateAreaItem,
} from "../../shared/site-template-area.js";

import { SitePageGroupRow } from "./SitePageGroupRow.js";

import type { HomeLayoutDefinition } from "../../shared/home-layouts.js";
import type { SitePageActions } from "../hooks/use-site-page-actions.js";
import type { SitePageGroup } from "../lib/site-page-groups.js";

/**
 * 模板页的常驻入口：首页、文档库的两张版式、会员登录 / 注册页的版式……
 *
 * 它们不进普通页面目录（没有租户自填的地址，不能拖排序），所以单独常驻几行。
 *
 * 还没落库的模板也占一行——首页与会员那几张是租户点了才建的（`auto_init: false`），
 * 不画出来就没有入口，画成占位行还顺带回答了「这个站点还能有哪些版式」。访客不受
 * 影响：没落库时 SSR 按同一套内置预设兜底渲染。
 *
 * 分组来自注册表本身（`group` 是 i18n key；**同一 key = 同一组**）。跨模块贡献的
 * `/member/*` 模板应共用同一 group key（见 `MEMBER_PAGE_TEMPLATE_GROUP`），而不是各写
 * 一份碰巧同名的文案。业务模块贡献一张模板页或一套首页版式时这里不用改：登记进去
 * 就出现在对应组里。当前套用的首页版式若声明了 group，首页行落到那一组，避免 `/`
 * 在「首页」和产品分组各出现一次。
 */
export function SiteTemplatePageRows({
  pages,
  defaultLocale,
  canWrite,
  entitlements,
  actions,
}: {
  pages: MarketingPageListItem[];
  defaultLocale: AppLocale;
  canWrite: boolean;
  /** 本站已开通的 entitlement：没开通的模板页不露出（同「添加区块」菜单的口径）。 */
  entitlements: ReadonlySet<string>;
  actions: SitePageActions;
}) {
  const { t } = useTranslation(["marketing", "site-member"]);
  const localeRank = new Map(
    siteLocaleOrder(defaultLocale).map((locale, index) => [locale, index]),
  );
  const groups = listSiteTemplateAreaGroups(
    entitlements,
    actions.homeLayoutKey,
  );

  return (
    <>
      {groups.map((group) => (
        <div key={group.group} className="divide-y border-t">
          <p className="px-4 pt-3 pb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {t(group.group)}
          </p>
          {group.items.map((item) => (
            <TemplateAreaItemRow
              key={itemKey(item)}
              item={item}
              pages={pages}
              defaultLocale={defaultLocale}
              localeRank={localeRank}
              canWrite={canWrite}
              actions={actions}
            />
          ))}
        </div>
      ))}
    </>
  );
}

function itemKey(item: SiteTemplateAreaItem): string {
  return item.type === "template"
    ? `template:${item.template.kind}`
    : `layout:${item.layout.key}`;
}

function TemplateAreaItemRow({
  item,
  pages,
  defaultLocale,
  localeRank,
  canWrite,
  actions,
}: {
  item: SiteTemplateAreaItem;
  pages: MarketingPageListItem[];
  defaultLocale: AppLocale;
  localeRank: ReadonlyMap<AppLocale, number>;
  canWrite: boolean;
  actions: SitePageActions;
}) {
  if (item.type === "home_layout") {
    return (
      <HomeLayoutApplyRow
        layout={item.layout}
        canWrite={canWrite}
        actions={actions}
      />
    );
  }

  const row = templateRow(item.template, pages, defaultLocale, localeRank);
  if (!row) {
    return (
      <PlaceholderTemplateRow
        labelKey={item.template.label}
        path={item.template.path}
        hintKey="marketing:cms.templateNotInitialized"
        actionKey="marketing:cms.initTemplatePage"
        pending={actions.initializeTemplatePendingKind === item.template.kind}
        canWrite={canWrite}
        onAction={() => actions.initializeTemplate(item.template.kind)}
      />
    );
  }

  return (
    <SitePageGroupRow
      group={row}
      defaultLocale={defaultLocale}
      canWrite={canWrite}
      actions={actions}
    />
  );
}

function HomeLayoutApplyRow({
  layout,
  canWrite,
  actions,
}: {
  layout: HomeLayoutDefinition;
  canWrite: boolean;
  actions: SitePageActions;
}) {
  const path = getPageTemplateKind("home")?.path ?? "/";
  return (
    <PlaceholderTemplateRow
      labelKey={layout.label}
      path={path}
      hintKey="marketing:cms.homeLayoutNotApplied"
      actionKey="marketing:cms.applyHomeLayout"
      pending={actions.applyHomeLayoutPendingKey === layout.key}
      canWrite={canWrite}
      onAction={() => actions.applyHomeLayout(layout.key)}
    />
  );
}

/**
 * 还没落库 / 还没套用的那一行：说明这张版式存在、点一下就有。
 *
 * 与已落库的行同一套排布（左标识、右操作），免得两种状态在列表里长得像两个东西。
 */
function PlaceholderTemplateRow({
  labelKey,
  path,
  hintKey,
  actionKey,
  pending,
  canWrite,
  onAction,
}: {
  labelKey: string;
  path: string;
  hintKey: string;
  actionKey: string;
  pending: boolean;
  canWrite: boolean;
  onAction: () => void;
}) {
  const { t } = useTranslation(["marketing", "site-member"]);

  return (
    <div className="flex items-center justify-between gap-2 px-4 py-2.5">
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className="truncate font-medium text-muted-foreground">
          {t(labelKey)}
        </span>
        <span className="truncate font-mono text-xs text-muted-foreground">
          {path}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="hidden text-xs text-muted-foreground sm:inline">
          {t(hintKey)}
        </span>
        {canWrite ? (
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={onAction}
          >
            {pending ? <Spinner className="size-3.5" /> : null}
            {t(actionKey)}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function templateRow(
  template: PageTemplateKindDefinition,
  pages: MarketingPageListItem[],
  defaultLocale: AppLocale,
  localeRank: ReadonlyMap<AppLocale, number>,
): SitePageGroup | null {
  const kindPages = pages
    .filter((page) => page.kind === template.kind)
    .sort(
      (a, b) =>
        (localeRank.get(a.locale) ?? Number.MAX_SAFE_INTEGER) -
        (localeRank.get(b.locale) ?? Number.MAX_SAFE_INTEGER),
    );
  if (kindPages.length === 0) return null;

  const primary =
    kindPages.find((page) => page.locale === defaultLocale) ?? kindPages[0]!;
  return {
    kind: template.kind,
    slug: primary.slug,
    path: marketingPagePath(template.kind, primary.slug),
    // 模板页的标题常常还是空的（快照落库时没写）：与公开面同口径回落预设文案
    title: resolveCatalogPageTitle(
      template.kind,
      primary.locale,
      primary.title,
    ),
    pages: kindPages,
  };
}
