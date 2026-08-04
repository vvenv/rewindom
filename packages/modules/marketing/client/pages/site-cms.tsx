import { PageLayout, useConfirm, usePermissions } from "@be-water/client-kit";
import { normalizeLocale } from "@be-water/shared";
import { Badge } from "@be-water/ui/badge";
import { Button } from "@be-water/ui/button";
import { DraggableFabTrigger } from "@be-water/ui/draggable-fab";
import { Globe, Plus, Settings2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { localizeSiteText } from "../../shared/section-schema.js";
import { SitePageCreateSheet } from "../components/SitePageCreateSheet.js";
import { SitePageGroupRow } from "../components/SitePageGroupRow.js";
import { SiteSettingsSheet } from "../components/SiteSettingsSheet.js";
import { SiteStarterMenu } from "../components/SiteStarterMenu.js";
import { useSite, useSiteMutations, useSitePages } from "../hooks/useSite.js";
import { groupSitePages } from "../lib/site-page-groups.js";

export function SiteCms() {
  const { t } = useTranslation("marketing");
  const { hasPermission } = usePermissions();
  const canWrite = hasPermission("site.write");
  const siteQuery = useSite();
  const pagesQuery = useSitePages();
  const { removePage, publishPage, unpublishPage } = useSiteMutations();
  const { confirm } = useConfirm();
  const defaultLocale = normalizeLocale(siteQuery.data?.default_locale);
  const groups = groupSitePages(pagesQuery.data ?? [], defaultLocale);
  const homePage = (pagesQuery.data ?? []).find(
    (page) => page.kind === "home" && page.locale === defaultLocale,
  );
  const hasStarterContent = Boolean(
    homePage ||
      siteQuery.data?.header.some(
        (section) => section.type === "header" && section.blocks.length > 0,
      ) ||
      siteQuery.data?.footer.some(
        (section) => section.type === "footer" && section.blocks.length > 0,
      ),
  );

  /** 删除走统一的二次确认弹窗（`ConfirmProvider`），不用浏览器原生 confirm。 */
  const handleDelete = async (
    pageId: string,
    pageTitle: string,
  ): Promise<void> => {
    const confirmed = await confirm({
      title: t("cms.deleteConfirmTitle"),
      description: t("cms.deleteConfirmDescription", { title: pageTitle }),
      confirmText: t("cms.delete"),
      destructive: true,
    });
    if (!confirmed) return;
    removePage.mutate(pageId, {
      onSuccess: () => toast.success(t("cms.toastPageDeleted")),
      onError: () => toast.error(t("cms.toastPageDeleteFailed")),
    });
  };

  /** 发布 / 取消发布共用同一份 toast 逻辑，按当前状态切换 mutation 与文案。 */
  const handleTogglePublish = (page: { id: string; status: string }): void => {
    const isPublished = page.status === "published";
    const mutation = isPublished ? unpublishPage : publishPage;
    mutation.mutate(page.id, {
      onSuccess: () =>
        toast.success(
          t(
            isPublished ? "cms.toastPageUnpublished" : "cms.toastPagePublished",
          ),
        ),
      onError: () => toast.error(t("cms.toastPagePublishFailed")),
    });
  };

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
      <div className="flex flex-col gap-4">
        {siteQuery.data ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
              <span className="font-medium">
                {localizeSiteText(
                  siteQuery.data.site_name,
                  defaultLocale,
                  defaultLocale,
                )}
              </span>
              <Badge
                variant={siteQuery.data.published ? "default" : "secondary"}
              >
                {siteQuery.data.published
                  ? t("cms.statusPublished")
                  : t("cms.statusDraft")}
              </Badge>
              {siteQuery.data.tagline ? (
                <span className="text-muted-foreground">
                  {siteQuery.data.tagline}
                </span>
              ) : null}
            </div>
            {canWrite ? (
              <div className="flex flex-wrap items-center gap-2">
                <SiteStarterMenu hasContent={hasStarterContent} />
                <SiteSettingsSheet site={siteQuery.data}>
                  <Button variant="outline" size="sm">
                    <Settings2 className="size-4" />
                    {t("cms.settings")}
                  </Button>
                </SiteSettingsSheet>
              </div>
            ) : null}
          </div>
        ) : null}

        {pagesQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">{t("cms.loading")}</p>
        ) : null}
        {pagesQuery.isError ? (
          <p className="text-sm text-destructive">{t("cms.loadFailed")}</p>
        ) : null}

        {!pagesQuery.isLoading && !pagesQuery.isError ? (
          <div className="divide-y rounded-lg border">
            {groups.map((group) => (
              <SitePageGroupRow
                key={`${group.kind}:${group.slug}`}
                group={group}
                defaultLocale={defaultLocale}
                canWrite={canWrite}
                publishPendingId={
                  publishPage.isPending ? publishPage.variables : undefined
                }
                unpublishPendingId={
                  unpublishPage.isPending ? unpublishPage.variables : undefined
                }
                deletePendingId={
                  removePage.isPending ? removePage.variables : undefined
                }
                onTogglePublish={handleTogglePublish}
                onDelete={handleDelete}
              />
            ))}
            {groups.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">
                {t("cms.emptyPages")}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </PageLayout>
  );
}
