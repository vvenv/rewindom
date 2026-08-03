import { PageLayout, usePermissions } from "@be-water/client-kit";
import { Badge } from "@be-water/ui/badge";
import { Button } from "@be-water/ui/button";
import { DraggableFabTrigger } from "@be-water/ui/draggable-fab";
import { Globe, Plus, Settings2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { SitePageCreateSheet } from "../components/SitePageCreateSheet.js";
import { SitePageEditSheet } from "../components/SitePageEditSheet.js";
import { SiteSettingsSheet } from "../components/SiteSettingsSheet.js";
import { useSite, useSiteMutations, useSitePages } from "../hooks/useSite.js";
import { marketingPagePath } from "../../shared/site-cms.js";

export function SiteCms() {
  const { t } = useTranslation("marketing");
  const { hasPermission } = usePermissions();
  const canWrite = hasPermission("site.write");
  const siteQuery = useSite();
  const pagesQuery = useSitePages();
  const { removePage, publishPage, unpublishPage } = useSiteMutations();

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
              <Badge variant={siteQuery.data.published ? "default" : "secondary"}>
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
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{page.title}</span>
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
                <div className="flex flex-wrap gap-2">
                  <SitePageEditSheet page={page}>
                    <Button size="sm" variant="outline">
                      {t("cms.edit")}
                    </Button>
                  </SitePageEditSheet>
                  {page.status === "published" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        unpublishPage.mutate(page.id, {
                          onSuccess: () =>
                            toast.success(t("cms.toastPageUnpublished")),
                          onError: () =>
                            toast.error(t("cms.toastPagePublishFailed")),
                        })
                      }
                    >
                      {t("cms.unpublish")}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() =>
                        publishPage.mutate(page.id, {
                          onSuccess: () =>
                            toast.success(t("cms.toastPagePublished")),
                          onError: () =>
                            toast.error(t("cms.toastPagePublishFailed")),
                        })
                      }
                    >
                      {t("cms.publish")}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      if (!window.confirm(t("cms.deleteConfirm"))) return;
                      removePage.mutate(page.id, {
                        onSuccess: () =>
                          toast.success(t("cms.toastPageDeleted")),
                        onError: () =>
                          toast.error(t("cms.toastPageDeleteFailed")),
                      });
                    }}
                  >
                    {t("cms.delete")}
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
