import {
  cloneElement,
  isValidElement,
  useRef,
  type ReactElement,
  type MouseEvent,
} from "react";

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
 * children 当 trigger（金标准与 NoteCreateSheet 一样），里面自带 hidden input、
 * 批量 mutation 和 toast。
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
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadSiteAssets();
  const pending = disabled || upload.isPending;

  const handleFiles = async (files: File[]): Promise<void> => {
    if (files.length === 0) return;
    const result = await upload.mutateAsync(files);
    toastSiteAssetUpload(result, t);
    if (result.uploaded.length > 0) onUploaded?.(result.uploaded);
  };

  return (
    <>
      {isValidElement(children)
        ? cloneElement(children, {
            disabled: pending || children.props.disabled,
            onClick: (event: MouseEvent<HTMLElement>) => {
              children.props.onClick?.(event);
              if (!event.defaultPrevented && !pending) {
                inputRef.current?.click();
              }
            },
          })
        : children}
      <input
        ref={inputRef}
        type="file"
        accept={SITE_ASSET_ACCEPT}
        multiple
        className="hidden"
        disabled={pending}
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = "";
          void handleFiles(files);
        }}
      />
    </>
  );
}
