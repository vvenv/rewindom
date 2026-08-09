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
  DOC_TEMPLATE_KINDS,
  DOC_TEMPLATE_SLUGS,
  marketingPagePath,
  type DocTemplateKind,
  type MarketingPageListItem,
} from "../../shared/site-cms.js";
import { siteLocaleOrder } from "../../shared/site-locale.js";
import { useSiteMutations } from "../hooks/useSite.js";
import {
  buildDocTemplateSections,
  DOC_TEMPLATE_PRESETS,
} from "../lib/page-presets.js";

import { SitePageGroupRow } from "./SitePageGroupRow.js";

import type { SitePageActions } from "../hooks/use-site-page-actions.js";
import type { SitePageGroup } from "../lib/site-page-groups.js";

/**
 * 文档库的两张模板页：`/docs` 与 `/docs/:slug` 的版式。
 *
 * 它们**默认不存在**（见 `DOC_TEMPLATE_PRESETS`：没有记录就按内置版式渲染），所以
 * 不能只靠页面列表——列表里没有的东西，租户根本不知道这两个地址的版式是可以改的。
 * 这两行常驻：没建过就给一枚「自定义版式」，建过就和普通页面一样按语言组分行，
 * 用复制铺出其它语言。
 */
export function SiteDocTemplateRows({
  pages,
  defaultLocale,
  canWrite,
  actions,
}: {
  pages: MarketingPageListItem[];
  defaultLocale: AppLocale;
  canWrite: boolean;
  actions: SitePageActions;
}) {
  const { t } = useTranslation("marketing");
  const localeRank = new Map(
    siteLocaleOrder(defaultLocale).map((locale, index) => [locale, index]),
  );

  return (
    <div className="divide-y border-t">
      <p className="px-4 pt-3 pb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {t("cms.docTemplates")}
      </p>
      {DOC_TEMPLATE_KINDS.map((kind) => {
        const kindPages = pages
          .filter((page) => page.kind === kind)
          .sort(
            (a, b) =>
              (localeRank.get(a.locale) ?? Number.MAX_SAFE_INTEGER) -
              (localeRank.get(b.locale) ?? Number.MAX_SAFE_INTEGER),
          );

        if (kindPages.length === 0) {
          return (
            <EmptyDocTemplateRow
              key={kind}
              kind={kind}
              defaultLocale={defaultLocale}
              canWrite={canWrite}
            />
          );
        }

        const primary =
          kindPages.find((page) => page.locale === defaultLocale) ??
          kindPages[0]!;
        const group: SitePageGroup = {
          kind,
          slug: primary.slug,
          path: marketingPagePath(kind, primary.slug),
          title: primary.title,
          pages: kindPages,
        };

        return (
          <SitePageGroupRow
            key={kind}
            group={group}
            defaultLocale={defaultLocale}
            canWrite={canWrite}
            actions={actions}
          />
        );
      })}
    </div>
  );
}

/**
 * 还没自定义过：一行说明 +「自定义版式」。
 *
 * 先落所选语言那一行；其它语言跟普通页面一样，自定义之后用「复制」铺。
 * 起步文案按**目标语言**取（不是管理台当前 UI 语言），否则中文后台建英文版式
 * 会把中文占位写进 sections。
 */
function EmptyDocTemplateRow({
  kind,
  defaultLocale,
  canWrite,
}: {
  kind: DocTemplateKind;
  defaultLocale: AppLocale;
  canWrite: boolean;
}) {
  const { t, i18n } = useTranslation("marketing");
  const { createPage } = useSiteMutations();
  const preset = DOC_TEMPLATE_PRESETS[kind];
  const locales = siteLocaleOrder(defaultLocale);
  const [locale, setLocale] = useState<AppLocale>(defaultLocale);

  useEffect(() => {
    if (!locales.includes(locale)) setLocale(defaultLocale);
  }, [defaultLocale, locale, locales]);

  const create = (): void => {
    const translate = i18n.getFixedT(locale, "marketing");
    createPage.mutate(
      {
        kind,
        slug: DOC_TEMPLATE_SLUGS[kind],
        locale,
        title: translate(preset.titleKey),
        description: translate(preset.descriptionKey),
        sections: buildDocTemplateSections(kind, translate),
      },
      {
        onSuccess: () => toast.success(t("cms.toastDocTemplateCreated")),
        onError: () => toast.error(t("cms.toastDocTemplateCreateFailed")),
      },
    );
  };

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className="truncate font-medium">{t(preset.label)}</span>
        <span className="truncate font-mono text-xs text-muted-foreground">
          {marketingPagePath(kind, DOC_TEMPLATE_SLUGS[kind])}
        </span>
        <span className="text-xs text-muted-foreground">
          {t("cms.docTemplateDefault")}
        </span>
      </div>
      {canWrite ? (
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
            {t("cms.docTemplateCustomize")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
