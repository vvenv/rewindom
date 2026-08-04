import { PageLayout, useConfirm, usePermissions } from "@be-water/client-kit";
import { Badge } from "@be-water/ui/badge";
import { Button } from "@be-water/ui/button";
import { DraggableFabTrigger } from "@be-water/ui/draggable-fab";
import {
  CloudOff,
  CloudUpload,
  Globe,
  Palette,
  Pencil,
  Plus,
  Settings2,
  Trash2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { toast } from "sonner";

import { marketingPagePath } from "../../shared/site-cms.js";
import { SitePageCreateSheet } from "../components/SitePageCreateSheet.js";
import { SitePageEditSheet } from "../components/SitePageEditSheet.js";
import { SiteSettingsSheet } from "../components/SiteSettingsSheet.js";
import { useSite, useSiteMutations, useSitePages } from "../hooks/useSite.js";

export function SiteCms() {
  const { t } = useTranslation("marketing");
  const { hasPermission } = usePermissions();
  const canWrite = hasPermission("site.write");
  const siteQuery = useSite();
  const pagesQuery = useSitePages();
  const { removePage, publishPage, unpublishPage } = useSiteMutations();
  const { confirm } = useConfirm();

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
        canWrite && siteQuery.data ? (
          <div className="flex items-center gap-2">
            <SiteSettingsSheet site={siteQuery.data}>
              <Button variant="outline" size="sm">
                <Settings2 className="size-4" />
                <span className="hidden md:inline">{t("cms.settings")}</span>
              </Button>
            </SiteSettingsSheet>
            <SitePageCreateSheet>
              <DraggableFabTrigger storageKey="site_create_fab">
                <Plus className="size-6 md:size-4" />
                <span className="hidden md:inline">{t("cms.create")}</span>
              </DraggableFabTrigger>
            </SitePageCreateSheet>
          </div>
        ) : null
      }
    >
      <div className="flex flex-col gap-4">
        {siteQuery.data ? (
          <div className="rounded-lg border p-4 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{siteQuery.data.site_name}</span>
              <Badge
                variant={siteQuery.data.published ? "default" : "secondary"}
              >
                {siteQuery.data.published
                  ? t("cms.statusPublished")
                  : t("cms.statusDraft")}
              </Badge>
            </div>
            {siteQuery.data.tagline ? (
              <p className="mt-1 text-muted-foreground">
                {siteQuery.data.tagline}
              </p>
            ) : null}
          </div>
        ) : null}

        {pagesQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">{t("cms.loading")}</p>
        ) : null}
        {pagesQuery.isError ? (
          <p className="text-sm text-destructive">{t("cms.loadFailed")}</p>
        ) : null}

        <div className="divide-y rounded-lg border">
          {(pagesQuery.data ?? []).map((page) => (
            <div
              key={page.id}
              className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between"
            >
              {/* 标题 + 状态一行，路径单独一行——三者混排时 truncate 不生效 */}
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  {canWrite ? (
                    <Link
                      to={`/site/pages/${page.id}`}
                      className="font-medium hover:underline"
                    >
                      {page.title}
                    </Link>
                  ) : (
                    <span className="font-medium">{page.title}</span>
                  )}
                  <Badge variant="outline">{page.kind}</Badge>
                  <Badge
                    variant={
                      page.status === "published" ? "default" : "secondary"
                    }
                  >
                    {page.status === "published"
                      ? t("cms.statusPublished")
                      : t("cms.statusDraft")}
                  </Badge>
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {marketingPagePath(page.kind, page.slug)}
                </p>
              </div>
              {canWrite ? (
                <div className="flex shrink-0 items-center justify-end gap-1">
                  <Button
                    asChild
                    variant="ghost"
                    size="icon-sm"
                    title={t("editor.open")}
                    aria-label={t("editor.open")}
                  >
                    <Link to={`/site/pages/${page.id}`}>
                      <Palette className="size-3.5" />
                    </Link>
                  </Button>
                  <SitePageEditSheet page={page}>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      title={t("cms.edit")}
                      aria-label={t("cms.edit")}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                  </SitePageEditSheet>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    title={t(
                      page.status === "published"
                        ? "cms.unpublish"
                        : "cms.publish",
                    )}
                    aria-label={t(
                      page.status === "published"
                        ? "cms.unpublish"
                        : "cms.publish",
                    )}
                    disabled={
                      (publishPage.isPending &&
                        publishPage.variables === page.id) ||
                      (unpublishPage.isPending &&
                        unpublishPage.variables === page.id)
                    }
                    onClick={() => handleTogglePublish(page)}
                  >
                    {page.status === "published" ? (
                      <CloudOff className="size-3.5" />
                    ) : (
                      <CloudUpload className="size-3.5" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="hover:text-destructive"
                    title={t("cms.delete")}
                    aria-label={t("cms.delete")}
                    disabled={
                      removePage.isPending && removePage.variables === page.id
                    }
                    onClick={() => void handleDelete(page.id, page.title)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              ) : null}
            </div>
          ))}
          {pagesQuery.data && pagesQuery.data.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              {t("cms.emptyPages")}
            </p>
          ) : null}
        </div>
      </div>
    </PageLayout>
  );
}
