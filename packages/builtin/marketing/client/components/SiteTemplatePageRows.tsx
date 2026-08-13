import { type AppLocale } from "@rewindom/shared";
import { useTranslation } from "react-i18next";

import {
  isPageTemplateRelevant,
  listPageTemplateKinds,
  type PageTemplateKindDefinition,
} from "../../shared/page-templates.js";
import {
  marketingPagePath,
  type MarketingPageListItem,
} from "../../shared/site-cms.js";
import { siteLocaleOrder } from "../../shared/site-locale.js";

import { SitePageGroupRow } from "./SitePageGroupRow.js";

import type { SitePageActions } from "../hooks/use-site-page-actions.js";
import type { SitePageGroup } from "../lib/site-page-groups.js";

/**
 * 模板页的常驻入口：文档库的两张版式、会员登录 / 注册页的版式……
 *
 * 它们不进普通页面目录（没有租户自填的地址，不能拖排序），所以单独常驻几行。
 * 相关时已经由服务端快照落库——列表里没有记录就先不画这一行，下次打开会再补。
 *
 * 分组来自注册表本身（`group` 是 i18n key；**同一 key = 同一组**）。跨模块贡献的
 * `/member/*` 模板应共用同一 group key（见 `MEMBER_PAGE_TEMPLATE_GROUP`），而不是各写
 * 一份碰巧同名的文案。业务模块贡献一张模板页时这里不用改：注册进去就出现在对应组里。
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

  const visible = listPageTemplateKinds().filter((template) =>
    isPageTemplateRelevant(template, entitlements),
  );
  const groups = [...new Set(visible.map((template) => template.group))].filter(
    (group) =>
      visible.some(
        (template) =>
          template.group === group &&
          pages.some((page) => page.kind === template.kind),
      ),
  );

  return (
    <>
      {groups.map((group) => (
        <div key={group} className="divide-y border-t">
          <p className="px-4 pt-3 pb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {t(group)}
          </p>
          {visible
            .filter((template) => template.group === group)
            .map((template) => {
              const row = templateRow(
                template,
                pages,
                defaultLocale,
                localeRank,
              );
              if (!row) return null;

              return (
                <SitePageGroupRow
                  key={template.kind}
                  group={row}
                  defaultLocale={defaultLocale}
                  canWrite={canWrite}
                  actions={actions}
                />
              );
            })}
        </div>
      ))}
    </>
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
    title: primary.title,
    pages: kindPages,
  };
}
