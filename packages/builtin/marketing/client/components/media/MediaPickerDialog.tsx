import { useState, type ReactElement, type ReactNode } from "react";

import {
  EmptyState,
  FileDropArea,
  FilePickerTrigger,
} from "@rewindom/client-kit";
import { Button } from "@rewindom/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@rewindom/ui/dialog";
import { Spinner } from "@rewindom/ui/spinner";
import { ImageOff, Upload } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  SITE_ASSET_ACCEPT,
  siteAssetPreviewUrl,
} from "../../../shared/site-asset.js";
import {
  useSiteAssets,
  useUploadSiteAssets,
  type SiteAsset,
} from "../../hooks/useSiteAssets.js";

import { toastSiteAssetUpload } from "./toast-site-asset-upload.js";

/**
 * 从媒体库选一张图（也能就地上传新的：点按钮、拖进来、或者直接粘贴）。
 *
 * 存在的理由是**复用**：以前每个 `image` 字段都只有「上传」一条路，同一张图在五个段里
 * 用就上传五份，谁也说不清哪个 URL 还有人在用。
 *
 * 列表只在弹层打开后才拉（`enabled`）——编辑器里 `image` 字段可能有十几个，
 * 每个都预拉一次媒体库是纯浪费。
 */
export function MediaPickerDialog({
  children,
  onSelect,
}: {
  children: ReactNode;
  onSelect: (asset: SiteAsset) => void;
}): ReactElement {
  const { t } = useTranslation("marketing");
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useSiteAssets(open);
  const upload = useUploadSiteAssets();

  const pick = (asset: SiteAsset): void => {
    onSelect(asset);
    setOpen(false);
  };

  /** 拖放、粘贴、点按钮三条路共用：只传了一张且没出错时直接选中它，别再让人点第二下。 */
  const uploadFiles = (files: File[]): void => {
    upload.mutate(files, {
      onSuccess: (result) => {
        toastSiteAssetUpload(result, t);
        if (result.uploaded.length === 1 && result.failed.length === 0) {
          pick(result.uploaded[0]!);
        }
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("media.pickTitle")}</DialogTitle>
          <DialogDescription>{t("media.pickHint")}</DialogDescription>
        </DialogHeader>

        <FileDropArea
          className="min-h-0 flex-1 overflow-y-auto px-4"
          accept={SITE_ASSET_ACCEPT}
          multiple
          pending={upload.isPending}
          onFiles={uploadFiles}
        >
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner className="size-5" />
            </div>
          ) : (data?.length ?? 0) === 0 ? (
            <EmptyState
              size="panel"
              icon={ImageOff}
              title={t("media.empty")}
              description={t("media.emptyHint")}
            />
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {data?.map((asset) => (
                <li key={asset.id}>
                  <button
                    type="button"
                    className="w-full overflow-hidden rounded-md border border-border/60 hover:border-primary"
                    onClick={() => pick(asset)}
                  >
                    <img
                      src={siteAssetPreviewUrl(asset)}
                      alt={asset.alt}
                      className="aspect-square w-full bg-muted object-contain"
                    />
                    {asset.width > 0 ? (
                      <span className="block px-1 py-1 text-[10px] text-muted-foreground tabular-nums">
                        {asset.width} × {asset.height}
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </FileDropArea>

        <div className="flex justify-end gap-2 p-4">
          <FilePickerTrigger
            accept={SITE_ASSET_ACCEPT}
            multiple
            disabled={upload.isPending}
            onFiles={uploadFiles}
          >
            <Button type="button" variant="outline" disabled={upload.isPending}>
              {upload.isPending ? (
                <Spinner className="size-4" />
              ) : (
                <Upload className="size-4" />
              )}
              {t("editor.uploadImage")}
            </Button>
          </FilePickerTrigger>
        </div>
      </DialogContent>
    </Dialog>
  );
}
