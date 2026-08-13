import { PageLayout, usePermissions } from "@rewindom/client-kit";
import { DraggableFabTrigger } from "@rewindom/ui/draggable-fab";
import { Image as ImageIcon, Upload } from "lucide-react";
import { useTranslation } from "react-i18next";

import { MediaGrid } from "../components/media/MediaGrid.js";
import { MediaPickerDialog } from "../components/media/MediaPickerDialog.js";
import { useSiteAssets } from "../hooks/useSiteAssets.js";

export function SiteMedia() {
  const { t } = useTranslation("marketing");
  const { hasPermission } = usePermissions();
  const { data, isLoading } = useSiteAssets();

  return (
    <PageLayout
      icon={ImageIcon}
      title={t("media.title")}
      description={t("media.pageDescription")}
      action={
        hasPermission("site.write") ? (
          /* 复用选图弹层：它本来就带上传，这里只是不关心选中了哪一张 */
          <MediaPickerDialog onSelect={() => undefined}>
            <DraggableFabTrigger storageKey="site_media_upload_fab">
              <Upload className="size-6 md:size-4" />
              <span className="hidden md:inline">{t("editor.uploadImage")}</span>
            </DraggableFabTrigger>
          </MediaPickerDialog>
        ) : null
      }
    >
      <div className="flex flex-col gap-4">
        <MediaGrid assets={data ?? []} isLoading={isLoading} />
      </div>
    </PageLayout>
  );
}
