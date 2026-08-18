import { PageLayout, usePermissions } from "@rewindom/client-kit";
import { DraggableFabTrigger } from "@rewindom/ui/draggable-fab";
import { Image as ImageIcon, Upload } from "lucide-react";
import { useTranslation } from "react-i18next";

import { MediaFileDrop } from "../components/media/MediaFileDrop.js";
import { MediaGrid } from "../components/media/MediaGrid.js";
import { MediaUploadTrigger } from "../components/media/MediaUploadTrigger.js";
import { useSiteAssets } from "../hooks/useSiteAssets.js";

export function SiteMedia() {
  const { t } = useTranslation("marketing");
  const { hasPermission } = usePermissions();
  const canWrite = hasPermission("site.write");
  const { data, isLoading } = useSiteAssets();

  return (
    <PageLayout
      icon={ImageIcon}
      title={t("media.title")}
      description={t("media.pageDescription")}
      action={
        canWrite ? (
          <MediaUploadTrigger>
            <DraggableFabTrigger storageKey="site_media_upload_fab">
              <Upload className="size-6 md:size-4" />
              <span className="hidden md:inline">{t("editor.uploadImage")}</span>
            </DraggableFabTrigger>
          </MediaUploadTrigger>
        ) : null
      }
    >
      <div className="flex flex-col gap-4">
        <MediaFileDrop disabled={!canWrite}>
          <MediaGrid
            assets={data ?? []}
            isLoading={isLoading}
            canWrite={canWrite}
          />
        </MediaFileDrop>
      </div>
    </PageLayout>
  );
}
