import { toast } from "@rewindom/ui/toast";

import type { SiteAssetUploadResult } from "../../hooks/useSiteAssets.js";

export function toastSiteAssetUpload(
  result: SiteAssetUploadResult,
  t: (key: string, options?: Record<string, unknown>) => string,
): void {
  if (result.uploaded.length > 0 && result.failed.length === 0) {
    toast.success(t("media.uploaded", { count: result.uploaded.length }));
  } else if (result.uploaded.length > 0) {
    toast.error(
      t("media.uploadPartial", {
        ok: result.uploaded.length,
        fail: result.failed.length,
      }),
    );
  } else if (result.failed.length > 0) {
    toast.error(t("editor.toastImageUploadFailed"));
  }
  if (result.rejected.length > 0) {
    toast.error(t("media.unsupportedFiles"));
  }
}
