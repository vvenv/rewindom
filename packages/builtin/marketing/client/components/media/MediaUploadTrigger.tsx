import type { MouseEvent, ReactElement } from "react";

import { FilePickerTrigger } from "@rewindom/client-kit";
import { useTranslation } from "react-i18next";

import { SITE_ASSET_ACCEPT } from "../../../shared/site-asset.js";
import {
  useUploadSiteAssets,
  type SiteAsset,
} from "../../hooks/useSiteAssets.js";

import { toastSiteAssetUpload } from "./toast-site-asset-upload.js";

/**
 * 媒体库的「上传新图片」入口：永远新建，不挑一张来替换。
 *
 * children 当 trigger；隐藏 input 与 `accept` 过滤都在 `FilePickerTrigger` 里，
 * 这里只接上批量 mutation 和 toast。
 */
export function MediaUploadTrigger({
  children,
  disabled,
  onUploaded,
}: {
  children: ReactElement<{
    onClick?: (event: MouseEvent<HTMLElement>) => void;
    disabled?: boolean;
  }>;
  disabled?: boolean;
  onUploaded?: (assets: SiteAsset[]) => void;
}): ReactElement {
  const { t } = useTranslation("marketing");
  const upload = useUploadSiteAssets();

  return (
    <FilePickerTrigger
      accept={SITE_ASSET_ACCEPT}
      multiple
      disabled={disabled || upload.isPending}
      onFiles={(files) =>
        upload.mutate(files, {
          onSuccess: (result) => {
            toastSiteAssetUpload(result, t);
            if (result.uploaded.length > 0) onUploaded?.(result.uploaded);
          },
        })
      }
    >
      {children}
    </FilePickerTrigger>
  );
}
