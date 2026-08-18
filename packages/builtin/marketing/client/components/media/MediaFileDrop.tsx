import { useState, type ReactElement, type ReactNode } from "react";

import { useTranslation } from "react-i18next";

import { useUploadSiteAssets } from "../../hooks/useSiteAssets.js";
import {
  filesFromDataTransfer,
  isFileDrag,
} from "../../lib/site-asset-files.js";

import { toastSiteAssetUpload } from "./toast-site-asset-upload.js";

/**
 * 拖文件进这块区域 = 批量上传新图片（不是替换某一张）。
 *
 * 深度计数是为了让拖进子节点时 overlay 不要闪：每进一层 +1、离开 -1，
 * 只有回到 0 才收起。
 */
export function MediaFileDrop({
  disabled,
  children,
}: {
  disabled?: boolean;
  children: ReactNode;
}): ReactElement {
  const { t } = useTranslation("marketing");
  const upload = useUploadSiteAssets();
  const [depth, setDepth] = useState(0);
  const dragging = !disabled && depth > 0;

  return (
    <div
      className="relative"
      onDragEnter={(event) => {
        if (disabled || !isFileDrag(event.dataTransfer)) return;
        event.preventDefault();
        setDepth((current) => current + 1);
      }}
      onDragOver={(event) => {
        if (disabled || !isFileDrag(event.dataTransfer)) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
      }}
      onDragLeave={() => {
        if (disabled) return;
        setDepth((current) => Math.max(0, current - 1));
      }}
      onDrop={(event) => {
        if (disabled) return;
        event.preventDefault();
        setDepth(0);
        const files = filesFromDataTransfer(event.dataTransfer);
        if (files.length === 0) return;
        void upload.mutateAsync(files).then((result) => {
          toastSiteAssetUpload(result, t);
        });
      }}
    >
      {children}
      {dragging ? (
        <div className="pointer-events-none absolute inset-0 z-10 flex min-h-48 items-center justify-center rounded-lg border-2 border-dashed border-primary bg-background/80 text-sm font-medium text-foreground backdrop-blur-sm">
          {upload.isPending ? t("media.uploading") : t("media.dropToUpload")}
        </div>
      ) : null}
    </div>
  );
}
