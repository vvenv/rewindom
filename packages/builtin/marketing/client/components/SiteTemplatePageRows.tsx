import { useEffect, useState } from "react";

import { getLocaleNativeLabel, type AppLocale } from "@be-water/shared";
import { Button } from "@be-water/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@be-water/ui/select";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  getPageTemplatePreset,
  listPageTemplateKinds,
  type PageTemplateKindDefinition,
} from "../../shared/page-templates.js";
import { marketingPagePath, type MarketingPageListItem  } from "../../shared/site-cms.js";
import { siteLocaleOrder } from "../../shared/site-locale.js";
import { useSiteMutations } from "../hooks/useSite.js";
import { buildPresetSections } from "../lib/page-presets.js";

import { SitePageGroupRow } from "./SitePageGroupRow.js";

import type { SitePageActions } from "../hooks/use-site-page-actions.js";
import type { SitePageGroup } from "../lib/site-page-groups.js";

/**
 * 模板页的常驻入口：文档库的两张版式、会员登录 / 注册页的版式……
 *
 * 它们**默认不存在**（没有记录就按内置版式渲染），所以不能只靠页面列表——列表里
 * 没有的东西，租户根本不知道这些地址的版式是可以改的。这几行常驻：没建过就给一枚
 *「自定义版式」，建过就和普通页面一样按语言组分行，用复制铺出其它语言。
 *
 * 分组来自注册表本身（`group` 是 i18n key，贡献方用带命名空间的 key），所以业务模块
 * 贡献一张模板页时这里不用改：注册进去就多一组。
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

  const visible = listPageTemplateKinds().filter(
    (template) =>
      !template.entitlement || entitlements.has(template.entitlement),
  );
  const groups = [...new Set(visible.map((template) => template.group))];

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
              const kindPages = pages
                .filter((page) => page.kind === template.kind)
                .sort(
                  (a, b) =>
                    (localeRank.get(a.locale) ?? Number.MAX_SAFE_INTEGER) -
                    (localeRank.get(b.locale) ?? Number.MAX_SAFE_INTEGER),
                );

              if (kindPages.length === 0) {
                return (
                  <EmptyTemplateRow
                    key={template.kind}
                    template={template}
                    defaultLocale={defaultLocale}
                    canWrite={canWrite}
                  />
                );
              }

              const primary =
                kindPages.find((page) => page.locale === defaultLocale) ??
                kindPages[0]!;
              const pageGroup: SitePageGroup = {
                kind: template.kind,
                slug: primary.slug,
                path: marketingPagePath(template.kind, primary.slug),
                title: primary.title,
                pages: kindPages,
              };

              return (
                <SitePageGroupRow
                  key={template.kind}
                  group={pageGroup}
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

/**
 * 还没自定义过：一行说明 +「自定义版式」。
 *
 * 先落所选语言那一行；其它语言跟普通页面一样，自定义之后用「复制」铺。
 * 起步文案按**目标语言**取（不是管理台当前 UI 语言），否则中文后台建英文版式
 * 会把中文占位写进 sections。
 */
function EmptyTemplateRow({
  template,
  defaultLocale,
  canWrite,
}: {
  template: PageTemplateKindDefinition;
  defaultLocale: AppLocale;
  canWrite: boolean;
}) {
  const { t, i18n } = useTranslation(["marketing", "site-member"]);
  const { createPage } = useSiteMutations();
  const preset = getPageTemplatePreset(template.kind);
  const locales = siteLocaleOrder(defaultLocale);
  const [locale, setLocale] = useState<AppLocale>(defaultLocale);

  useEffect(() => {
    if (!locales.includes(locale)) setLocale(defaultLocale);
  }, [defaultLocale, locale, locales]);

  const create = (): void => {
    if (!preset) return;
    /*
     * 贡献方的预设里 key 带命名空间（`site-member:preset.…`），marketing 自己的不带
     * ——`getFixedT` 绑 marketing 做默认 ns，i18next 认前缀，两种都解得开。
     */
    const translate = i18n.getFixedT(locale, "marketing");
    createPage.mutate(
      {
        kind: template.kind,
        slug: template.slug,
        locale,
        title: translate(preset.titleKey),
        description: translate(preset.descriptionKey),
        sections: buildPresetSections(preset, translate),
      },
      {
        onSuccess: () => toast.success(t("cms.toastTemplatePageCreated")),
        onError: () => toast.error(t("cms.toastTemplatePageCreateFailed")),
      },
    );
  };

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className="truncate font-medium">{t(template.label)}</span>
        <span className="truncate font-mono text-xs text-muted-foreground">
          {template.path}
        </span>
        <span className="text-xs text-muted-foreground">
          {t("cms.templatePageDefault")}
        </span>
      </div>
      {canWrite && preset ? (
        <div className="flex shrink-0 items-center gap-2">
          {locales.length > 1 ? (
            <Select
              value={locale}
              onValueChange={(value) => setLocale(value as AppLocale)}
            >
              <SelectTrigger
                size="sm"
                className="w-auto min-w-24"
                aria-label={t("cms.fieldLocale")}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {locales.map((slug) => (
                  <SelectItem key={slug} value={slug}>
                    {getLocaleNativeLabel(slug)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={createPage.isPending}
            onClick={create}
          >
            {t("cms.templatePageCustomize")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
