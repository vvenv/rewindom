import type { ReactElement, ReactNode } from "react";

import { FileDropArea } from "@rewindom/client-kit";
import { useTranslation } from "react-i18next";

import { SITE_ASSET_ACCEPT } from "../../../shared/site-asset.js";
import { useUploadSiteAssets } from "../../hooks/useSiteAssets.js";

import { toastSiteAssetUpload } from "./toast-site-asset-upload.js";

/**
 * 拖 / 粘文件进这块区域 = 批量上传新图片（不是替换某一张）。
 *
 * 拖放与粘贴的通用部分在 `FileDropArea`；这里只接上媒体库的上传 mutation 与结果提示。
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

  return (
    <FileDropArea
      accept={SITE_ASSET_ACCEPT}
      multiple
      disabled={disabled}
      pending={upload.isPending}
      onFiles={(files) =>
        upload.mutate(files, {
          onSuccess: (result) => toastSiteAssetUpload(result, t),
        })
      }
    >
      {children}
    </FileDropArea>
  );
}
