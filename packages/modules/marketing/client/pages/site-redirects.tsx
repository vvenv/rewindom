import { PageLayout, usePermissions } from "@be-water/client-kit";
import { DraggableFabTrigger } from "@be-water/ui/draggable-fab";
import { Plus, Signpost } from "lucide-react";
import { useTranslation } from "react-i18next";

import { SiteRedirectCreateSheet } from "../components/redirects/SiteRedirectCreateSheet.js";
import { SiteRedirectsTable } from "../components/redirects/SiteRedirectsTable.js";
import { useSiteRedirects } from "../hooks/useSiteRedirects.js";

export function SiteRedirects() {
  const { t } = useTranslation("marketing");
  const { hasPermission } = usePermissions();
  const canWrite = hasPermission("site.write");
  const { data, isLoading, error } = useSiteRedirects();

  return (
    <PageLayout
      icon={Signpost}
      title={t("redirects.title")}
      description={t("redirects.pageDescription")}
      action={
        canWrite ? (
          <SiteRedirectCreateSheet>
            <DraggableFabTrigger storageKey="site_redirects_create_fab">
              <Plus className="size-6 md:size-4" />
              <span className="hidden md:inline">{t("redirects.create")}</span>
            </DraggableFabTrigger>
          </SiteRedirectCreateSheet>
        ) : null
      }
    >
      <div className="flex flex-col gap-4">
        <SiteRedirectsTable
          redirects={data ?? []}
          isLoading={isLoading}
          error={error}
          canWrite={canWrite}
        />
      </div>
    </PageLayout>
  );
}
