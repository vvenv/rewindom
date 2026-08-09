import { normalizeLocale, type AppLocale } from "@be-water/shared";
import { Button } from "@be-water/ui/button";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { toast } from "sonner";

import {
  DOC_TEMPLATE_KINDS,
  type DocTemplateKind, type MarketingPageListItem 
} from "../../shared/site-cms.js";
import { useSiteMutations } from "../hooks/useSite.js";
import {
  buildDocTemplateSections,
  DOC_TEMPLATE_PRESETS,
} from "../lib/page-presets.js";


/**
 * 文档库的两张模板页：`/docs` 与 `/docs/:slug` 的版式。
 *
 * 它们**默认不存在**（见 `DOC_TEMPLATE_PRESETS`：没有记录就按内置版式渲染），所以
 * 不能只靠页面列表——列表里没有的东西，租户根本不知道这两个地址的版式是可以改的。
 * 这两行常驻：没建过就给一枚「自定义版式」，建过就和普通页面一样点进编辑器。
 */
export function SiteDocTemplateRows({
  pages,
  defaultLocale,
  canWrite,
}: {
  pages: MarketingPageListItem[];
  defaultLocale: AppLocale;
  canWrite: boolean;
}) {
  const { t } = useTranslation("marketing");
  const { createPage } = useSiteMutations();

  const create = (kind: DocTemplateKind): void => {
    const preset = DOC_TEMPLATE_PRESETS[kind];
    createPage.mutate(
      {
        kind,
        slug: preset.slug,
        locale: defaultLocale,
        title: t(preset.titleKey),
        description: t(preset.descriptionKey),
        // 从内置版式起步，而不是给一张空页：租户要改的是「这里再加一段」，不是从零排版
        sections: buildDocTemplateSections(kind, t),
      },
      {
        onSuccess: () => toast.success(t("cms.toastDocTemplateCreated")),
        onError: () => toast.error(t("cms.toastDocTemplateCreateFailed")),
      },
    );
  };

  return (
    <div className="divide-y border-t">
      <p className="px-4 pt-3 pb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {t("cms.docTemplates")}
      </p>
      {DOC_TEMPLATE_KINDS.map((kind) => {
        const preset = DOC_TEMPLATE_PRESETS[kind];
        const existing = pages.find(
          (page) =>
            page.kind === kind &&
            normalizeLocale(page.locale, defaultLocale) === defaultLocale,
        );
        return (
          <div
            key={kind}
            className="flex items-center justify-between gap-3 px-4 py-3"
          >
            <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
              {existing && canWrite ? (
                <Link
                  to={`/app/site/pages/${existing.id}`}
                  className="truncate font-medium hover:underline"
                >
                  {existing.title}
                </Link>
              ) : (
                <span className="truncate font-medium">{t(preset.label)}</span>
              )}
              <span className="truncate font-mono text-xs text-muted-foreground">
                {kind === "doc_index" ? "/docs" : "/docs/:slug"}
              </span>
              {existing ? (
                <span className="text-xs text-muted-foreground">
                  {t(
                    existing.status === "published"
                      ? "cms.statusPublished"
                      : "cms.statusDraft",
                  )}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">
                  {t("cms.docTemplateDefault")}
                </span>
              )}
            </div>
            {!existing && canWrite ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={createPage.isPending}
                onClick={() => create(kind)}
              >
                {t("cms.docTemplateCustomize")}
              </Button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
